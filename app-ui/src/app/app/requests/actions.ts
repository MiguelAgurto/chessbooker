"use server";

import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { createCalendarEvent, updateCalendarEventTime, deleteCalendarEvent } from "@/lib/google/calendar";

interface SlotData {
  datetime: string;
  duration_minutes: number;
}

function formatDateTimeForEmail(datetime: string, timezone: string): string {
  const date = new Date(datetime);
  return date.toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export async function updateBookingStatus(
  bookingId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  // DIAGNOSTIC: Step 2 - Confirm server-side execution
  console.log(
    `[DIAGNOSTIC] Booking confirmation executing on SERVER (file has "use server" directive)`
  );
  console.log(
    `[DIAGNOSTIC] updateBookingStatus called: bookingId=${bookingId}, newStatus=${newStatus}`
  );

  const supabase = await createClient();
  console.log(`[DIAGNOSTIC] Supabase server client created (cookies-based)`);

  // Fetch the booking request first to get student details
  const { data: booking, error: fetchError } = await supabase
    .from("booking_requests")
    .select("*, coaches(name, email, timezone)")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { success: false, error: fetchError?.message || "Booking not found" };
  }

  // Update the status
  const { error: updateError } = await supabase
    .from("booking_requests")
    .update({ status: newStatus })
    .eq("id", bookingId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Send confirmation email to student when status changes to "accepted"
  if (newStatus === "accepted") {
    const coachName = booking.coaches?.name || "your coach";
    const coachTimezone = booking.coaches?.timezone || "UTC";
    const studentEmail = booking.student_email;
    const studentName = booking.student_name;
    const studentTimezone = booking.student_timezone || "UTC";

    // Get the requested time slot
    const requestedTimes = booking.requested_times as (string | SlotData)[];
    const slot = requestedTimes?.[0];

    let formattedTime = "the scheduled time";
    let duration = 60;
    let startDateTime = "";

    if (slot) {
      if (typeof slot === "string") {
        formattedTime = formatDateTimeForEmail(slot, studentTimezone);
        startDateTime = slot;
      } else if (slot.datetime) {
        formattedTime = formatDateTimeForEmail(slot.datetime, studentTimezone);
        duration = slot.duration_minutes || 60;
        startDateTime = slot.datetime;
      }
    }

    // DIAGNOSTIC: Step 3 - Calendar event execution path check
    console.log(`[DIAGNOSTIC] Step 3: Checking calendar event execution path`);
    console.log(`[DIAGNOSTIC] startDateTime value: "${startDateTime}" (truthy: ${!!startDateTime})`);

    // Try to create Google Calendar event with Meet link
    let meetUrl: string | null = booking.meeting_url || null;
    let calendarEventId: string | null = booking.calendar_event_id || null;

    if (startDateTime) {
      console.log(`[DIAGNOSTIC] startDateTime is set, entering calendar creation block`);

      try {
        // DIAGNOSTIC: Step 1 - Google connection check
        console.log(`[DIAGNOSTIC] Step 1: Checking Google connection`);
        console.log(`[DIAGNOSTIC] Querying google_connections for coach_id=${booking.coach_id}`);

        const { data: googleConnection, error: connError } = await supabase
          .from("google_connections")
          .select("google_email, refresh_token")
          .eq("coach_id", booking.coach_id)
          .single();

        // DIAGNOSTIC: Log connection query result
        console.log(`[DIAGNOSTIC] google_connections query result:`);
        console.log(`[DIAGNOSTIC]   - row exists: ${!!googleConnection}`);
        console.log(`[DIAGNOSTIC]   - error: ${connError ? connError.message : "none"}`);
        console.log(`[DIAGNOSTIC]   - error code: ${connError?.code || "none"}`);

        if (connError || !googleConnection) {
          // DIAGNOSTIC: No connection found
          console.log(
            `[DIAGNOSTIC] Google Calendar NOT connected for coach_id=${booking.coach_id}`
          );
          console.log(
            `[DIAGNOSTIC] Calendar event creation path NOT reached (no google_connections row)`
          );
        } else {
          // DIAGNOSTIC: Connection found, log details
          console.log(`[DIAGNOSTIC]   - google_email: ${googleConnection.google_email}`);
          console.log(`[DIAGNOSTIC]   - has_refresh_token: ${!!googleConnection.refresh_token}`);

          // DIAGNOSTIC: Step 3 continued - Attempting calendar creation
          console.log(`[DIAGNOSTIC] Step 3: Attempting Google Calendar event creation`);

          const calendarResult = await createCalendarEvent({
            coachId: booking.coach_id,
            bookingId,
            summary: `Chess lesson - ${studentName}`,
            description: `ChessBooker session with ${studentName}\n\nStudent email: ${studentEmail}\nBooking ID: ${bookingId}`,
            startDateTime,
            durationMinutes: duration,
            coachTimezone,
            studentEmail,
            coachGoogleEmail: googleConnection.google_email,
          });

          // DIAGNOSTIC: Step 4 - Google API response
          console.log(`[DIAGNOSTIC] Step 4: Google API response received`);
          console.log(`[DIAGNOSTIC]   - success: ${calendarResult.success}`);
          console.log(`[DIAGNOSTIC]   - has_event_id: ${!!calendarResult.eventId}`);
          console.log(`[DIAGNOSTIC]   - event_id: ${calendarResult.eventId || "null"}`);
          console.log(`[DIAGNOSTIC]   - has_meet_url: ${!!calendarResult.meetUrl}`);
          console.log(`[DIAGNOSTIC]   - meet_url: ${calendarResult.meetUrl || "null"}`);
          console.log(`[DIAGNOSTIC]   - error: ${calendarResult.error || "none"}`);

          if (calendarResult.success) {
            meetUrl = calendarResult.meetUrl || null;
            calendarEventId = calendarResult.eventId || null;

            // DIAGNOSTIC: Step 5 - Database persistence check
            console.log(`[DIAGNOSTIC] Step 5: Attempting database update`);
            console.log(`[DIAGNOSTIC] Update payload fields: meeting_url, calendar_event_id, calendar_provider`);
            console.log(`[DIAGNOSTIC]   - meeting_url value: ${meetUrl}`);
            console.log(`[DIAGNOSTIC]   - calendar_event_id value: ${calendarEventId}`);
            console.log(`[DIAGNOSTIC]   - calendar_provider value: "google"`);
            console.log(`[DIAGNOSTIC]   - target booking_id: ${bookingId}`);

            const { error: calendarUpdateError } = await supabase
              .from("booking_requests")
              .update({
                meeting_url: meetUrl,
                calendar_event_id: calendarEventId,
                calendar_provider: "google",
              })
              .eq("id", bookingId);

            // DIAGNOSTIC: Log update result
            if (calendarUpdateError) {
              console.error(`[DIAGNOSTIC] Step 5 FAILED: Database update error`);
              console.error(`[DIAGNOSTIC]   - error.code: ${calendarUpdateError.code}`);
              console.error(`[DIAGNOSTIC]   - error.message: ${calendarUpdateError.message}`);
              console.error(`[DIAGNOSTIC]   - error.details: ${calendarUpdateError.details}`);
            } else {
              console.log(`[DIAGNOSTIC] Step 5 SUCCESS: Database updated`);
              console.log(`[DIAGNOSTIC] Calendar event saved: eventId=${calendarEventId}, meetUrl=${meetUrl}`);
            }
          } else {
            console.error(`[DIAGNOSTIC] Step 4 FAILED: Calendar event creation failed`);
            console.error(`[DIAGNOSTIC]   - error: ${calendarResult.error}`);
          }
        }
      } catch (calendarError) {
        // Don't fail the confirmation if calendar creation fails
        console.error(`[DIAGNOSTIC] EXCEPTION in calendar creation block:`);
        console.error(`[DIAGNOSTIC]   - error type: ${calendarError?.constructor?.name}`);
        console.error(`[DIAGNOSTIC]   - error message: ${calendarError instanceof Error ? calendarError.message : String(calendarError)}`);
        console.error(calendarError);
      }
    } else {
      console.log(`[DIAGNOSTIC] startDateTime is EMPTY - calendar creation path NOT reached`);
      console.log(`[DIAGNOSTIC] slot data: ${JSON.stringify(slot)}`);
    }

    // Build email body with optional meeting link
    let emailBody = `Hi ${studentName},

✅ Great news! Your session has been confirmed.

♟️ Session details:
- Coach: ${coachName}
- Time: ${formattedTime}
- Duration: ${duration} minutes
- Timezone: ${studentTimezone}`;

    if (meetUrl) {
      emailBody += `
- Meeting link: ${meetUrl}`;
    }

    emailBody += `

See you at the board!

Thanks for using ChessBooker.`;

    try {
      await sendEmail({
        to: studentEmail,
        subject: `✅ Your session with ${coachName} is confirmed`,
        text: emailBody,
      });
    } catch (emailError) {
      console.error("Failed to send confirmation email to student:", emailError);
    }
  }

  revalidatePath("/app/requests");
  return { success: true };
}

/**
 * Reschedule a booking to a new time slot
 */
export async function rescheduleBooking(
  bookingId: string,
  newDateTime: string,
  newDurationMinutes: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Fetch the booking with coach details
  const { data: booking, error: fetchError } = await supabase
    .from("booking_requests")
    .select("*, coaches(name, email, timezone)")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { success: false, error: fetchError?.message || "Booking not found" };
  }

  const coachName = booking.coaches?.name || "your coach";
  const coachEmail = booking.coaches?.email;
  const coachTimezone = booking.coaches?.timezone || "UTC";
  const studentEmail = booking.student_email;
  const studentName = booking.student_name;
  const studentTimezone = booking.student_timezone || "UTC";

  // Update the booking with new time
  const newSlot: SlotData = {
    datetime: newDateTime,
    duration_minutes: newDurationMinutes,
  };

  const { error: updateError } = await supabase
    .from("booking_requests")
    .update({
      requested_times: [newSlot],
    })
    .eq("id", bookingId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Update Google Calendar event if it exists
  if (booking.calendar_event_id) {
    try {
      const calendarResult = await updateCalendarEventTime({
        coachId: booking.coach_id,
        eventId: booking.calendar_event_id,
        startDateTime: newDateTime,
        durationMinutes: newDurationMinutes,
        timezone: coachTimezone,
      });

      if (!calendarResult.success) {
        console.error("[Reschedule] Google Calendar update failed:", calendarResult.error);
        // Continue anyway - booking is updated, calendar sync failed
      }
    } catch (calendarError) {
      console.error("[Reschedule] Google Calendar error:", calendarError);
    }
  }

  const formattedNewTime = formatDateTimeForEmail(newDateTime, studentTimezone);
  const formattedNewTimeCoach = formatDateTimeForEmail(newDateTime, coachTimezone);

  // Send email to student
  const studentEmailBody = `Hi ${studentName},

📅 Your session has been rescheduled.

♟️ New session details:
- Coach: ${coachName}
- New time: ${formattedNewTime}
- Duration: ${newDurationMinutes} minutes
- Timezone: ${studentTimezone}${booking.meeting_url ? `
- Meeting link: ${booking.meeting_url}` : ""}

If this time doesn't work for you, please reach out to your coach.

Thanks for using ChessBooker.`;

  try {
    await sendEmail({
      to: studentEmail,
      subject: `📅 Your session with ${coachName} has been rescheduled`,
      text: studentEmailBody,
    });
  } catch (emailError) {
    console.error("[Reschedule] Failed to send email to student:", emailError);
  }

  // Send email to coach
  if (coachEmail) {
    const coachEmailBody = `Hi ${coachName},

📅 You have rescheduled a session.

♟️ New session details:
- Student: ${studentName} (${studentEmail})
- New time: ${formattedNewTimeCoach}
- Duration: ${newDurationMinutes} minutes
- Timezone: ${coachTimezone}

Thanks for using ChessBooker.`;

    try {
      await sendEmail({
        to: coachEmail,
        subject: `📅 Session with ${studentName} rescheduled`,
        text: coachEmailBody,
      });
    } catch (emailError) {
      console.error("[Reschedule] Failed to send email to coach:", emailError);
    }
  }

  revalidatePath("/app/requests");
  return { success: true };
}

/**
 * Cancel a confirmed booking
 */
export async function cancelBooking(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Fetch the booking with coach details
  const { data: booking, error: fetchError } = await supabase
    .from("booking_requests")
    .select("*, coaches(name, email, timezone)")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { success: false, error: fetchError?.message || "Booking not found" };
  }

  const coachName = booking.coaches?.name || "your coach";
  const coachEmail = booking.coaches?.email;
  const coachTimezone = booking.coaches?.timezone || "UTC";
  const studentEmail = booking.student_email;
  const studentName = booking.student_name;
  const studentTimezone = booking.student_timezone || "UTC";

  // Get original session time for emails
  const requestedTimes = booking.requested_times as (string | SlotData)[];
  const slot = requestedTimes?.[0];
  let formattedTime = "the scheduled time";
  let formattedTimeCoach = "the scheduled time";

  if (slot) {
    if (typeof slot === "string") {
      formattedTime = formatDateTimeForEmail(slot, studentTimezone);
      formattedTimeCoach = formatDateTimeForEmail(slot, coachTimezone);
    } else if (slot.datetime) {
      formattedTime = formatDateTimeForEmail(slot.datetime, studentTimezone);
      formattedTimeCoach = formatDateTimeForEmail(slot.datetime, coachTimezone);
    }
  }

  // Delete Google Calendar event if it exists
  if (booking.calendar_event_id) {
    try {
      const deleted = await deleteCalendarEvent(
        booking.coach_id,
        booking.calendar_event_id
      );

      if (!deleted) {
        console.error("[Cancel] Google Calendar delete failed");
        // Continue anyway - we'll still cancel the booking
      }
    } catch (calendarError) {
      console.error("[Cancel] Google Calendar error:", calendarError);
    }
  }

  // Update booking status to cancelled and clear calendar data
  const { error: updateError } = await supabase
    .from("booking_requests")
    .update({
      status: "cancelled",
      calendar_event_id: null,
      meeting_url: null,
    })
    .eq("id", bookingId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Send email to student
  const studentEmailBody = `Hi ${studentName},

❌ Your session has been cancelled.

Session that was cancelled:
- Coach: ${coachName}
- Time: ${formattedTime}

If you'd like to book a new session, please visit your coach's booking page.

Thanks for using ChessBooker.`;

  try {
    await sendEmail({
      to: studentEmail,
      subject: `❌ Your session with ${coachName} has been cancelled`,
      text: studentEmailBody,
    });
  } catch (emailError) {
    console.error("[Cancel] Failed to send email to student:", emailError);
  }

  // Send email to coach
  if (coachEmail) {
    const coachEmailBody = `Hi ${coachName},

❌ A session has been cancelled.

Session that was cancelled:
- Student: ${studentName} (${studentEmail})
- Time: ${formattedTimeCoach}

Thanks for using ChessBooker.`;

    try {
      await sendEmail({
        to: coachEmail,
        subject: `❌ Session with ${studentName} cancelled`,
        text: coachEmailBody,
      });
    } catch (emailError) {
      console.error("[Cancel] Failed to send email to coach:", emailError);
    }
  }

  revalidatePath("/app/requests");
  return { success: true };
}
