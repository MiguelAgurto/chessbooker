"use server";

import { createServiceClient } from "@/lib/supabase/service";

export type NotificationEventType =
  | "request_created"
  | "request_confirmed"
  | "request_declined"
  | "request_expired"
  | "reschedule_requested"
  | "reschedule_confirmed";

interface EnqueueNotificationParams {
  coachId: string;
  eventType: NotificationEventType;
  bookingId: string;
  studentName: string;
  studentEmail: string;
  metadata?: Record<string, unknown>;
}

/**
 * Enqueue a notification event for later processing (email digests, etc.)
 * Uses service role to bypass RLS for insert.
 */
export async function enqueueNotificationEvent({
  coachId,
  eventType,
  bookingId,
  studentName,
  studentEmail,
  metadata = {},
}: EnqueueNotificationParams): Promise<void> {
  try {
    const supabase = createServiceClient();

    // Call the RPC function to enqueue the notification
    const { error } = await supabase.rpc("enqueue_coach_notification", {
      p_coach_id: coachId,
      p_event_type: eventType,
      p_booking_id: bookingId,
      p_student_name: studentName,
      p_student_email: studentEmail,
      p_metadata: metadata,
    });

    if (error) {
      console.error("Failed to enqueue notification event:", error);
    }
  } catch (err) {
    // Log but don't throw - notifications are non-critical
    console.error("Error enqueueing notification:", err);
  }
}
