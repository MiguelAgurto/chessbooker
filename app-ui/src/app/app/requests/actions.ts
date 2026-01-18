"use server";

import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { createCalendarEvent } from "@/lib/google/calendar";

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
  const supabase = await createClient();

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

    // Try to create Google Calendar event with Meet link
    let meetUrl: string | null = booking.meeting_url || null;
    let calendarEventId: string | null = booking.calendar_event_id || null;

    if (startDateTime) {
      try {
        // Check if coach has Google connected
        console.log(
          `[Booking ${bookingId}] Checking Google connection for coach_id=${booking.coach_id}`
        );

        const { data: googleConnection, error: connError } = await supabase
          .from("google_connections")
          .select("google_email")
          .eq("coach_id", booking.coach_id)
          .single();

        if (connError || !googleConnection) {
          console.log(
            `[Booking ${bookingId}] No Google connection for coach_id=${booking.coach_id}` +
              (connError ? ` (error: ${connError.message})` : "")
          );
        } else {
          console.log(
            `[Booking ${bookingId}] Google connected as ${googleConnection.google_email}, creating calendar event...`
          );

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

          console.log(
            `[Booking ${bookingId}] Calendar API response: success=${calendarResult.success}, eventId=${calendarResult.eventId}, meetUrl=${calendarResult.meetUrl}, error=${calendarResult.error}`
          );

          if (calendarResult.success) {
            meetUrl = calendarResult.meetUrl || null;
            calendarEventId = calendarResult.eventId || null;

            // Update booking with calendar event info using server-side Supabase client
            console.log(
              `[Booking ${bookingId}] Updating booking_requests with meeting_url=${meetUrl}, calendar_event_id=${calendarEventId}`
            );

            const { error: calendarUpdateError } = await supabase
              .from("booking_requests")
              .update({
                meeting_url: meetUrl,
                calendar_event_id: calendarEventId,
                calendar_provider: "google",
              })
              .eq("id", bookingId);

            if (calendarUpdateError) {
              console.error(
                `[Booking ${bookingId}] Failed to update booking with calendar info: ${calendarUpdateError.message}`,
                calendarUpdateError
              );
            } else {
              console.log(
                `[Booking ${bookingId}] Successfully saved calendar event to booking: eventId=${calendarEventId}, meetUrl=${meetUrl}`
              );
            }
          } else {
            console.error(
              `[Booking ${bookingId}] Failed to create calendar event: ${calendarResult.error}`
            );
          }
        }
      } catch (calendarError) {
        // Don't fail the confirmation if calendar creation fails
        console.error(
          `[Booking ${bookingId}] Calendar event creation error:`,
          calendarError
        );
      }
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
