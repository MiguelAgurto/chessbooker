import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import RescheduleForm from "./RescheduleForm";

interface PageProps {
  params: Promise<{ bookingId: string }>;
}

export default async function ReschedulePage({ params }: PageProps) {
  const { bookingId } = await params;
  const supabase = await createClient();

  // Fetch the original booking with coach details
  const { data: booking } = await supabase
    .from("booking_requests")
    .select(`
      id,
      coach_id,
      student_name,
      student_email,
      student_timezone,
      duration_minutes,
      scheduled_start,
      scheduled_end,
      status,
      coaches (
        id,
        name,
        timezone,
        slug,
        pricing,
        min_notice_minutes,
        buffer_minutes
      )
    `)
    .eq("id", bookingId)
    .single();

  if (!booking) {
    notFound();
  }

  // Only allow rescheduling of confirmed bookings
  if (booking.status !== "confirmed") {
    return (
      <div className="min-h-screen bg-cb-bg py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto">
          <div className="card p-6 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-cb-text mb-2">
              Cannot Reschedule
            </h2>
            <p className="text-sm text-cb-text-secondary">
              {booking.status === "pending"
                ? "This booking is still pending confirmation."
                : booking.status === "completed"
                ? "This lesson has already been completed."
                : booking.status === "cancelled"
                ? "This booking has been cancelled."
                : "This booking cannot be rescheduled."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check if there's already a pending reschedule request
  const { data: pendingReschedule } = await supabase
    .from("booking_requests")
    .select("id")
    .eq("reschedule_of", bookingId)
    .eq("status", "pending")
    .single();

  if (pendingReschedule) {
    return (
      <div className="min-h-screen bg-cb-bg py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto">
          <div className="card p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-cb-text mb-2">
              Reschedule Request Pending
            </h2>
            <p className="text-sm text-cb-text-secondary">
              You already have a pending reschedule request for this lesson. Please wait for the coach to respond.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const coach = booking.coaches as {
    id: string;
    name: string;
    timezone: string;
    slug: string;
    pricing: { "60min": number; "90min": number };
    min_notice_minutes: number | null;
    buffer_minutes: number | null;
  };

  // Fetch coach availability
  const { data: availability } = await supabase
    .from("availability_rules")
    .select("day_of_week, start_time, end_time")
    .eq("coach_id", coach.id)
    .order("day_of_week", { ascending: true });

  // Fetch blocked bookings (exclude the current booking being rescheduled)
  const { data: blockedBookings } = await supabase
    .from("booking_requests")
    .select("scheduled_start, scheduled_end, duration_minutes")
    .eq("coach_id", coach.id)
    .in("status", ["pending", "confirmed"])
    .not("scheduled_start", "is", null)
    .not("scheduled_end", "is", null)
    .neq("id", bookingId); // Exclude current booking so its slot is available

  // Format original booking time for display
  const originalTime = booking.scheduled_start
    ? new Date(booking.scheduled_start).toLocaleString("en-US", {
        timeZone: booking.student_timezone || "UTC",
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "Unknown";

  return (
    <div className="min-h-screen bg-cb-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-cb-text">Reschedule Session</h1>
          <p className="mt-2 text-lg text-cb-text-secondary">
            with {coach.name}
          </p>
        </div>

        {/* Current booking info */}
        <div className="card p-4 mb-6 bg-blue-50 border-blue-200">
          <p className="text-sm font-medium text-blue-800 mb-1">Current Session</p>
          <p className="text-sm text-blue-700">{originalTime}</p>
          <p className="text-xs text-blue-600 mt-1">{booking.duration_minutes} minutes</p>
        </div>

        <RescheduleForm
          originalBooking={{
            id: booking.id,
            coachId: coach.id,
            studentName: booking.student_name,
            studentEmail: booking.student_email,
            studentTimezone: booking.student_timezone || "UTC",
            durationMinutes: booking.duration_minutes,
          }}
          coachTimezone={coach.timezone}
          availability={availability || []}
          blockedBookings={blockedBookings || []}
          minNoticeMinutes={coach.min_notice_minutes ?? 0}
          bufferMinutes={coach.buffer_minutes ?? 0}
        />
      </div>
    </div>
  );
}
