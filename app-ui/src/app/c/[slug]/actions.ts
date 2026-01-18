"use server";

import { createClient } from "@/lib/supabase/server";
import { sendEmail, getAppUrl } from "@/lib/email";

interface SlotData {
  datetime: string;
  duration_minutes: number;
}

interface CreateBookingParams {
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

export async function createBookingRequest({
  coachId,
  studentName,
  studentEmail,
  studentTimezone,
  requestedTimes,
}: CreateBookingParams): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Insert the booking request
  const { error: insertError } = await supabase.from("booking_requests").insert({
    coach_id: coachId,
    student_name: studentName,
    student_email: studentEmail,
    student_timezone: studentTimezone,
    requested_times: requestedTimes,
    status: "pending",
  });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // Fetch coach details for the emails
  const { data: coach } = await supabase
    .from("coaches")
    .select("name, email")
    .eq("id", coachId)
    .single();

  if (!coach) {
    // Booking was created but we couldn't fetch coach data - still a success
    console.error("Could not fetch coach data for email notifications");
    return { success: true };
  }

  const slot = requestedTimes[0];
  const formattedTime = formatDateTimeForEmail(slot.datetime, studentTimezone);
  const duration = slot.duration_minutes;

  // Send email to student: Booking Request Received
  try {
    await sendEmail({
      to: studentEmail,
      subject: "♟️ Your session request has been sent",
      text: `Hi ${studentName},

✅ Your session request has been sent to ${coach.name}.

Request details:
- Coach: ${coach.name}
- Time: ${formattedTime}
- Duration: ${duration} minutes
- Timezone: ${studentTimezone}

⏳ The coach will review and confirm your request shortly. You'll receive an email once they respond.

Thanks for using ChessBooker!`,
    });
  } catch (emailError) {
    console.error("Failed to send student confirmation email:", emailError);
  }

  // Send email to coach: New Booking Request
  if (coach.email) {
    try {
      const dashboardLink = getAppUrl("/app/requests");
      await sendEmail({
        to: coach.email,
        subject: `📥 New session request from ${studentName}`,
        text: `Hi ${coach.name},

📥 You have a new session request!

👤 Student: ${studentName}
📧 Email: ${studentEmail}
⏰ Requested time: ${formattedTime}
⏱ Duration: ${duration} minutes
🌍 Timezone: ${studentTimezone}

👉 Review and respond here:
${dashboardLink}

Reply directly to this email to contact the student.`,
        replyTo: studentEmail,
      });
    } catch (emailError) {
      console.error("Failed to send coach notification email:", emailError);
    }
  }

  return { success: true };
}
