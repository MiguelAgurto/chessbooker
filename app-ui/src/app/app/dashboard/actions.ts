"use server";

import { createClient } from "@/lib/supabase/server";
import { sendEmail, getAppUrl } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { createCalendarEvent } from "@/lib/google/calendar";
import { enqueueNotificationEvent } from "@/lib/notifications";

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
  durationMinutes: number,
  manualMeetingUrl?: string
): Promise<{ success: boolean; error?: string; isOverlapError?: boolean; isInsufficientScopes?: boolean }> {
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
  const isReschedule = !!booking.reschedule_of;

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

  // Check if booking already has a calendar event (prevent duplicates)
  if (booking.calendar_event_id) {
    console.log(`[Confirm Lesson] Booking ${bookingId} already has calendar_event_id=${booking.calendar_event_id}, skipping calendar creation`);
  }

  // STEP 1: Create Google Calendar event FIRST (before confirming)
  // OR use manual meeting URL if provided (for coaches without Google Calendar)
  let meetUrl: string | null = null;
  let calendarEventId: string | null = booking.calendar_event_id || null;

  // If manual meeting URL is provided, use it directly (skip Google Calendar)
  if (manualMeetingUrl) {
    console.log(`[Confirm Lesson] Using manual meeting URL for booking ${bookingId}`);
    meetUrl = manualMeetingUrl;
  }
  // Only create calendar event if one doesn't already exist and no manual URL provided
  else if (!calendarEventId) {
    console.log(`[Confirm Lesson] Creating calendar event for booking ${bookingId}`);

    // Fetch Google connection
    const { data: googleConnection, error: connError } = await supabase
      .from("google_connections")
      .select("google_email, refresh_token")
      .eq("coach_id", booking.coach_id)
      .single();

    if (connError || !googleConnection) {
      console.error(`[Confirm Lesson] No Google Calendar connection for coach ${booking.coach_id}:`, connError);
      return {
        success: false,
        error: "Google Calendar not connected. Please connect your Google account in Settings before confirming lessons.",
      };
    }

    console.log(`[Confirm Lesson] Found Google connection: email=${googleConnection.google_email}, calendarId=primary`);

    // Create the calendar event
    const calendarResult = await createCalendarEvent({
      coachId: booking.coach_id,
      bookingId,
      summary: `Chess lesson - ${studentName}`,
      description: `ChessBooker lesson with ${studentName}\n\nStudent email: ${studentEmail}\nBooking ID: ${bookingId}`,
      startDateTime: scheduledStart.toISOString(),
      durationMinutes,
      coachTimezone,
      studentEmail,
      coachGoogleEmail: googleConnection.google_email,
    });

    if (!calendarResult.success) {
      console.error(`[Confirm Lesson] Calendar creation failed for booking ${bookingId}:`, calendarResult.error);

      // Check for insufficient scopes error
      if (calendarResult.isInsufficientScopes || calendarResult.error === "INSUFFICIENT_SCOPES") {
        return {
          success: false,
          error: "Your Google connection needs updated permissions. Please go to Settings and click 'Reconnect' on Google Calendar to grant calendar access.",
          isInsufficientScopes: true,
        };
      }

      return {
        success: false,
        error: `Failed to create calendar event: ${calendarResult.error}. Please try again or check your Google Calendar connection in Settings.`,
      };
    }

    calendarEventId = calendarResult.eventId || null;
    meetUrl = calendarResult.meetUrl || null;

    console.log(`[Confirm Lesson] Calendar event created: eventId=${calendarEventId}, meetUrl=${meetUrl}`);
  } else {
    // Use existing meeting URL if calendar event already exists
    meetUrl = booking.meeting_url || null;
    console.log(`[Confirm Lesson] Using existing calendar event: eventId=${calendarEventId}, meetUrl=${meetUrl}`);
  }

  // STEP 2: Update booking status to confirmed (with calendar info) in a single update
  const { error: updateError } = await supabase
    .from("booking_requests")
    .update({
      status: "confirmed",
      scheduled_start: scheduledStart.toISOString(),
      scheduled_end: scheduledEnd.toISOString(),
      meeting_url: meetUrl,
      calendar_event_id: calendarEventId,
      calendar_provider: calendarEventId ? "google" : null,
    })
    .eq("id", bookingId);

  if (updateError) {
    // Check for Postgres exclusion constraint violation (23P01)
    // This happens when trying to book an overlapping time slot
    if (updateError.code === "23P01" || updateError.message?.includes("exclusion")) {
      console.error(`[Confirm Lesson] Time slot overlap for booking ${bookingId}`);
      return {
        success: false,
        error: "That time was just taken. Please pick another slot.",
        isOverlapError: true,
      };
    }
    console.error(`[Confirm Lesson] Database update failed for booking ${bookingId}:`, updateError);
    return { success: false, error: updateError.message };
  }

  console.log(`[Confirm Lesson] Booking ${bookingId} confirmed successfully`);

  // STEP 3: If this is a reschedule confirmation, cancel the original booking
  if (isReschedule && booking.reschedule_of) {
    const { error: cancelError } = await supabase
      .from("booking_requests")
      .update({
        status: "cancelled",
        scheduled_start: null,
        scheduled_end: null,
      })
      .eq("id", booking.reschedule_of);

    if (cancelError) {
      console.error(`[Confirm Lesson] Failed to cancel original booking ${booking.reschedule_of}:`, cancelError);
      // Continue anyway - the new booking is confirmed
    }
  }

  // STEP 4: Send confirmation email
  const formattedTime = formatDateTimeForEmail(scheduledStart.toISOString(), studentTimezone);
  const rescheduleLink = getAppUrl(`/reschedule/${bookingId}`);

  let emailBody = `Hi ${studentName},

Great news! Your ${isReschedule ? "rescheduled " : ""}lesson has been confirmed.

Lesson details:
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

Need to reschedule? Use this link:
${rescheduleLink}

${coachName}`;

  try {
    await sendEmail({
      to: studentEmail,
      subject: `Your lesson with ${coachName} is confirmed`,
      text: emailBody,
    });
  } catch (emailError) {
    console.error(`[Confirm Lesson] Failed to send confirmation email for booking ${bookingId}:`, emailError);
  }

  // Enqueue notification event
  await enqueueNotificationEvent({
    coachId: booking.coach_id,
    eventType: isReschedule ? "reschedule_confirmed" : "request_confirmed",
    bookingId,
    studentName,
    studentEmail,
    metadata: {
      scheduledStart: scheduledStart.toISOString(),
      durationMinutes,
    },
  });

  revalidatePath("/app");
  revalidatePath("/app/requests");

  return { success: true };
}

export async function declineBookingRequest(
  bookingId: string,
  declineMessage?: string
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

  let emailBody = `Hi ${studentName},

Thank you for your lesson request. Unfortunately, the time you requested isn't available right now.`;

  if (declineMessage && declineMessage.trim()) {
    emailBody += `

A note from me:
"${declineMessage.trim()}"`;
  }

  emailBody += `

I'd love to work with you — feel free to pick another time that works for you. 🙂

${coachName}`;

  try {
    await sendEmail({
      to: studentEmail,
      subject: `Lesson request update`,
      text: emailBody,
    });
  } catch (emailError) {
    console.error("Failed to send decline email:", emailError);
  }

  // Enqueue notification event
  await enqueueNotificationEvent({
    coachId: booking.coach_id,
    eventType: "request_declined",
    bookingId,
    studentName,
    studentEmail,
  });

  revalidatePath("/app");
  revalidatePath("/app/requests");

  return { success: true };
}

/**
 * Update coach notes for a booking (private notes visible only to coach)
 */
export async function updateCoachNotes(
  bookingId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from("booking_requests")
    .update({ coach_notes: notes })
    .eq("id", bookingId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/app");
  return { success: true };
}

/**
 * Mark a lesson as completed (only valid if scheduled_start is in the past)
 */
export async function markLessonCompleted(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Fetch booking to validate
  const { data: booking, error: fetchError } = await supabase
    .from("booking_requests")
    .select("scheduled_start, status")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { success: false, error: fetchError?.message || "Booking not found" };
  }

  // Verify the lesson is in the past
  if (booking.scheduled_start) {
    const scheduledStart = new Date(booking.scheduled_start);
    if (scheduledStart > new Date()) {
      return { success: false, error: "Cannot mark a future lesson as completed" };
    }
  }

  // Verify it's currently confirmed
  if (booking.status !== "confirmed") {
    return { success: false, error: "Only confirmed lessons can be marked as completed" };
  }

  const { error: updateError } = await supabase
    .from("booking_requests")
    .update({ status: "completed" })
    .eq("id", bookingId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/app");
  revalidatePath("/app/requests");

  return { success: true };
}

/**
 * Send lesson recap to student via email
 */
export async function sendLessonRecap(
  bookingId: string,
  recapText: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Fetch booking with coach details
  const { data: booking, error: fetchError } = await supabase
    .from("booking_requests")
    .select("*, coaches(name, timezone)")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { success: false, error: fetchError?.message || "Booking not found" };
  }

  const coachName = booking.coaches?.name || "Your coach";
  const coachTimezone = booking.coaches?.timezone || "UTC";
  const studentEmail = booking.student_email;
  const studentName = booking.student_name;

  // Format lesson date/time
  const lessonDate = booking.scheduled_start
    ? formatDateTimeForEmail(booking.scheduled_start, coachTimezone)
    : "your recent lesson";

  // Update recap in database first
  const { error: updateError } = await supabase
    .from("booking_requests")
    .update({
      student_recap: recapText,
      recap_sent_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Send recap email
  const emailBody = `Hi ${studentName},

Here's your recap from our lesson on ${lessonDate}:

${recapText}

See you at the board!

${coachName}`;

  try {
    await sendEmail({
      to: studentEmail,
      subject: `Your lesson recap with ${coachName}`,
      text: emailBody,
    });
  } catch (emailError) {
    console.error("Failed to send recap email:", emailError);
    return { success: false, error: "Failed to send email. Recap was saved." };
  }

  revalidatePath("/app");
  return { success: true };
}
