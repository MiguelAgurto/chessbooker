"use server";

import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { createCalendarEvent } from "@/lib/google/calendar";

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

/**
 * Validate that a string is a valid ISO timestamp
 */
function isValidISOTimestamp(value: string): boolean {
  if (!value) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

export async function acceptBookingRequest(
  bookingId: string,
  selectedDateTime: string,
  durationMinutes: number
): Promise<{ success: boolean; error?: string }> {
  // Validate selectedDateTime before proceeding
  if (!isValidISOTimestamp(selectedDateTime)) {
    return {
      success: false,
      error: `Invalid datetime format: "${selectedDateTime}". Expected a valid ISO timestamp.`,
    };
  }

  const supabase = await createClient();

  // Fetch booking with coach details
  const { data: booking, error: fetchError } = await supabase
    .from("booking_requests")
    .select("*, coaches(name, email, timezone)")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { success: false, error: fetchError?.message || "Booking not found" };
  }

  const coachTimezone = booking.coaches?.timezone || "UTC";
  const coachName = booking.coaches?.name || "your coach";
  const studentEmail = booking.student_email;
  const studentName = booking.student_name;
  const studentTimezone = booking.student_timezone || "UTC";

  // Calculate scheduled times
  const scheduledStart = new Date(selectedDateTime);
  const scheduledEnd = new Date(scheduledStart.getTime() + durationMinutes * 60 * 1000);

  // Validate parsed dates
  if (isNaN(scheduledStart.getTime()) || isNaN(scheduledEnd.getTime())) {
    return {
      success: false,
      error: "Failed to parse scheduled times. Please provide a valid datetime.",
    };
  }

  // Update booking status and scheduled times
  const { error: updateError } = await supabase
    .from("booking_requests")
    .update({
      status: "confirmed",
      scheduled_start: scheduledStart.toISOString(),
      scheduled_end: scheduledEnd.toISOString(),
    })
    .eq("id", bookingId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Only proceed with calendar + email AFTER DB update succeeds
  // Try to create Google Calendar event
  let meetUrl: string | null = null;
  let calendarEventId: string | null = null;

  try {
    const { data: googleConnection } = await supabase
      .from("google_connections")
      .select("google_email, refresh_token")
      .eq("coach_id", booking.coach_id)
      .single();

    if (googleConnection) {
      const calendarResult = await createCalendarEvent({
        coachId: booking.coach_id,
        bookingId,
        summary: `Chess lesson - ${studentName}`,
        description: `ChessBooker session with ${studentName}\n\nStudent email: ${studentEmail}\nBooking ID: ${bookingId}`,
        startDateTime: scheduledStart.toISOString(),
        durationMinutes,
        coachTimezone,
        studentEmail,
        coachGoogleEmail: googleConnection.google_email,
      });

      if (calendarResult.success) {
        meetUrl = calendarResult.meetUrl || null;
        calendarEventId = calendarResult.eventId || null;

        // Update booking with calendar info
        await supabase
          .from("booking_requests")
          .update({
            meeting_url: meetUrl,
            calendar_event_id: calendarEventId,
            calendar_provider: "google",
          })
          .eq("id", bookingId);
      }
    }
  } catch (calendarError) {
    console.error("Calendar creation failed:", calendarError);
    // Continue - booking is confirmed, calendar is optional
  }

  // Send confirmation email
  const formattedTime = formatDateTimeForEmail(scheduledStart.toISOString(), studentTimezone);

  let emailBody = `Hi ${studentName},

Great news! Your session has been confirmed.

Session details:
- Coach: ${coachName}
- Time: ${formattedTime}
- Duration: ${durationMinutes} minutes
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
      subject: `Your session with ${coachName} is confirmed`,
      text: emailBody,
    });
  } catch (emailError) {
    console.error("Failed to send confirmation email:", emailError);
  }

  revalidatePath("/app");
  revalidatePath("/app/requests");

  return { success: true };
}

export async function declineBookingRequest(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Fetch booking with coach details
  const { data: booking, error: fetchError } = await supabase
    .from("booking_requests")
    .select("*, coaches(name)")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { success: false, error: fetchError?.message || "Booking not found" };
  }

  // Update status to declined
  const { error: updateError } = await supabase
    .from("booking_requests")
    .update({ status: "declined" })
    .eq("id", bookingId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Send decline notification
  const coachName = booking.coaches?.name || "your coach";
  const studentEmail = booking.student_email;
  const studentName = booking.student_name;

  const emailBody = `Hi ${studentName},

Unfortunately, ${coachName} is unable to accept your booking request at this time.

Please feel free to submit a new request with different times.

Thanks for using ChessBooker.`;

  try {
    await sendEmail({
      to: studentEmail,
      subject: `Booking request update from ${coachName}`,
      text: emailBody,
    });
  } catch (emailError) {
    console.error("Failed to send decline email:", emailError);
  }

  revalidatePath("/app");
  revalidatePath("/app/requests");

  return { success: true };
}
