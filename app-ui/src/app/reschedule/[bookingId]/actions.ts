"use server";

import { createClient } from "@/lib/supabase/server";
import { sendEmail, getAppUrl } from "@/lib/email";
import { revalidatePath } from "next/cache";

interface SlotData {
  datetime: string;
  duration_minutes: number;
}

interface CreateRescheduleParams {
  originalBookingId: string;
  coachId: string;
  studentName: string;
  studentEmail: string;
  studentTimezone: string;
  requestedTimes: SlotData[];
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

export async function createRescheduleRequest({
  originalBookingId,
  coachId,
  studentName,
  studentEmail,
  studentTimezone,
  requestedTimes,
}: CreateRescheduleParams): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Verify original booking exists and is confirmed
  const { data: originalBooking } = await supabase
    .from("booking_requests")
    .select("id, status, scheduled_start")
    .eq("id", originalBookingId)
    .single();

  if (!originalBooking) {
    return { success: false, error: "Original booking not found" };
  }

  if (originalBooking.status !== "confirmed") {
    return { success: false, error: "Can only reschedule confirmed bookings" };
  }

  // Check if there's already a pending reschedule
  const { data: existingReschedule } = await supabase
    .from("booking_requests")
    .select("id")
    .eq("reschedule_of", originalBookingId)
    .eq("status", "pending")
    .single();

  if (existingReschedule) {
    return { success: false, error: "A reschedule request is already pending" };
  }

  // Calculate scheduled times from the selected slot
  const selectedSlot = requestedTimes[0];
  const scheduledStart = new Date(selectedSlot.datetime);
  const scheduledEnd = new Date(scheduledStart.getTime() + selectedSlot.duration_minutes * 60 * 1000);

  // Insert the reschedule request with scheduled times to hold the new slot
  const { error: insertError } = await supabase.from("booking_requests").insert({
    coach_id: coachId,
    student_name: studentName,
    student_email: studentEmail,
    student_timezone: studentTimezone,
    requested_times: requestedTimes,
    scheduled_start: scheduledStart.toISOString(),
    scheduled_end: scheduledEnd.toISOString(),
    duration_minutes: selectedSlot.duration_minutes,
    status: "pending",
    reschedule_of: originalBookingId,
  });

  if (insertError) {
    // Check for exclusion constraint violation
    if (insertError.code === "23P01" || insertError.message?.includes("exclusion")) {
      return {
        success: false,
        error: "That time was just taken. Please pick another slot.",
      };
    }
    // Check for unique constraint on pending reschedules
    if (insertError.message?.includes("unique") || insertError.message?.includes("duplicate")) {
      return {
        success: false,
        error: "A reschedule request is already pending for this booking.",
      };
    }
    return { success: false, error: insertError.message };
  }

  // Fetch coach details for notifications
  const { data: coach } = await supabase
    .from("coaches")
    .select("name, email, timezone, slug")
    .eq("id", coachId)
    .single();

  if (!coach) {
    return { success: true }; // Reschedule created but couldn't notify
  }

  const formattedNewTime = formatDateTimeForEmail(selectedSlot.datetime, studentTimezone);
  const formattedOldTime = originalBooking.scheduled_start
    ? formatDateTimeForEmail(originalBooking.scheduled_start, studentTimezone)
    : "your current time";

  // Send email to student confirming reschedule request
  try {
    await sendEmail({
      to: studentEmail,
      subject: "Reschedule request sent",
      text: `Hi ${studentName},

Your reschedule request has been sent to ${coach.name}.

Current session: ${formattedOldTime}
Requested new time: ${formattedNewTime}
Duration: ${selectedSlot.duration_minutes} minutes

The coach will review and confirm your request shortly. You'll receive an email once they respond.

Thanks for using ChessBooker!`,
    });
  } catch (emailError) {
    console.error("Failed to send student reschedule confirmation:", emailError);
  }

  // Send email to coach about reschedule request
  if (coach.email) {
    try {
      const dashboardLink = getAppUrl("/app/requests");
      const coachFormattedNewTime = formatDateTimeForEmail(selectedSlot.datetime, coach.timezone || "UTC");
      const coachFormattedOldTime = originalBooking.scheduled_start
        ? formatDateTimeForEmail(originalBooking.scheduled_start, coach.timezone || "UTC")
        : "current time";

      await sendEmail({
        to: coach.email,
        subject: `Reschedule request from ${studentName}`,
        text: `Hi ${coach.name},

${studentName} would like to reschedule their session.

Current time: ${coachFormattedOldTime}
Requested new time: ${coachFormattedNewTime}
Duration: ${selectedSlot.duration_minutes} minutes

Review and respond here:
${dashboardLink}

Reply directly to this email to contact the student.`,
        replyTo: studentEmail,
      });
    } catch (emailError) {
      console.error("Failed to send coach reschedule notification:", emailError);
    }
  }

  // Revalidate relevant paths
  if (coach?.slug) {
    revalidatePath(`/c/${coach.slug}`);
  }
  revalidatePath("/app");

  return { success: true };
}
