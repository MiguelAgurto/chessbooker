"use server";

import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";

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
    .select("*, coaches(name, email)")
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
    const studentEmail = booking.student_email;
    const studentName = booking.student_name;
    const studentTimezone = booking.student_timezone || "UTC";

    // Get the requested time slot
    const requestedTimes = booking.requested_times as (string | SlotData)[];
    const slot = requestedTimes?.[0];

    let formattedTime = "the scheduled time";
    let duration = 60;

    if (slot) {
      if (typeof slot === "string") {
        formattedTime = formatDateTimeForEmail(slot, studentTimezone);
      } else if (slot.datetime) {
        formattedTime = formatDateTimeForEmail(slot.datetime, studentTimezone);
        duration = slot.duration_minutes || 60;
      }
    }

    try {
      await sendEmail({
        to: studentEmail,
        subject: `✅ Your session with ${coachName} is confirmed`,
        text: `Hi ${studentName},

✅ Great news! Your session has been confirmed.

♟️ Session details:
- Coach: ${coachName}
- Time: ${formattedTime}
- Duration: ${duration} minutes
- Timezone: ${studentTimezone}

See you at the board!

Thanks for using ChessBooker.`,
      });
    } catch (emailError) {
      console.error("Failed to send confirmation email to student:", emailError);
    }
  }

  revalidatePath("/app/requests");
  return { success: true };
}
