import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import BookingLinkBox from "@/components/BookingLinkBox";
import CoachHeader from "./dashboard/CoachHeader";
import UpcomingLessons from "./dashboard/UpcomingLessons";
import PastLessons from "./dashboard/PastLessons";
import PendingRequests from "./dashboard/PendingRequests";
import RecentActivity from "./dashboard/RecentActivity";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch coach data
  const { data: coach } = await supabase
    .from("coaches")
    .select("*")
    .eq("id", user!.id)
    .single();

  const timezone = coach?.timezone || "UTC";

  // Fetch upcoming lessons from view
  const { data: upcomingLessons } = await supabase
    .from("upcoming_lessons")
    .select("*")
    .eq("coach_id", user!.id)
    .limit(20);

  // Fetch pending and recently expired requests
  const { data: pendingRequests } = await supabase
    .from("booking_requests")
    .select("id, student_name, student_email, student_timezone, duration_minutes, requested_times, preferred_time_1, preferred_time_2, preferred_time_3, created_at, status, expires_at, reschedule_of")
    .eq("coach_id", user!.id)
    .in("status", ["pending", "expired"])
    .order("status", { ascending: true }) // pending first, then expired
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch past lessons (scheduled_start in the past, status confirmed or completed)
  const { data: pastLessons } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("coach_id", user!.id)
    .in("status", ["confirmed", "completed"])
    .lt("scheduled_start", new Date().toISOString())
    .order("scheduled_start", { ascending: false })
    .limit(20);

  // Fetch all confirmed/completed lessons for student history and retention signals
  const { data: allLessons } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("coach_id", user!.id)
    .in("status", ["confirmed", "completed"])
    .order("scheduled_start", { ascending: false });

  // Build map of student_email -> most recent completed lesson date
  const studentLastLesson: Record<string, string> = {};
  if (allLessons) {
    for (const lesson of allLessons) {
      // Only consider completed lessons for retention signals
      if (lesson.status === "completed" && !studentLastLesson[lesson.student_email]) {
        studentLastLesson[lesson.student_email] = lesson.scheduled_start;
      }
    }
  }

  // Get most recent lesson date for retention nudge (allLessons is sorted desc)
  const lastLessonDate = allLessons?.[0]?.scheduled_start || null;

  // Count stats
  const { count: pendingCount } = await supabase
    .from("booking_requests")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", user!.id)
    .eq("status", "pending");

  // Determine current month in coach's timezone for accurate monthly stats
  const coachDateStr = new Date().toLocaleDateString("en-CA", { timeZone: timezone }); // "YYYY-MM-DD"
  const [year, month] = coachDateStr.split("-").map(Number);
  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));

  // Count confirmed lessons scheduled this month
  const { count: confirmedThisMonth } = await supabase
    .from("booking_requests")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", user!.id)
    .eq("status", "confirmed")
    .gte("scheduled_start", firstDayOfMonth.toISOString());

  // Count completed lessons this month (high-signal activity metric)
  const { count: completedThisMonth } = await supabase
    .from("booking_requests")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", user!.id)
    .eq("status", "completed")
    .gte("scheduled_start", firstDayOfMonth.toISOString());

  const nextLesson = upcomingLessons?.[0] || null;

  return (
    <div>
      {/* Header Card */}
      <CoachHeader
        coachName={coach?.name || "Coach"}
        timezone={timezone}
        nextLesson={nextLesson}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-coral-light rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 fill-coral" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-cb-text">
                {pendingCount || 0}
              </p>
              <p className="text-xs text-cb-text-secondary">Pending</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 fill-blue-500" viewBox="0 0 24 24">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-cb-text">
                {confirmedThisMonth || 0}
              </p>
              <p className="text-xs text-cb-text-secondary">Scheduled</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 fill-green-500" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-semibold text-cb-text">
                {completedThisMonth || 0}
              </p>
              <p className="text-xs text-cb-text-secondary">Lessons this month</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Upcoming Lessons */}
        <UpcomingLessons lessons={upcomingLessons || []} timezone={timezone} coachSlug={coach?.slug} lastLessonDate={lastLessonDate} />

        {/* Pending Requests */}
        <PendingRequests requests={pendingRequests || []} timezone={timezone} />

        {/* Recent Activity */}
        <RecentActivity timezone={timezone} />
      </div>

      {/* Past Lessons */}
      <div className="mb-6">
        <PastLessons
          lessons={pastLessons || []}
          timezone={timezone}
          studentLastLesson={studentLastLesson}
          allLessons={allLessons || []}
        />
      </div>

      {/* Booking Link */}
      <div id="booking-link" className="card p-6 scroll-mt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-cb-text">
            Your Public Booking Link
          </h2>
          <Link
            href="/app/settings"
            className="text-sm font-medium text-coral hover:text-coral-dark transition-colors"
          >
            Edit profile
          </Link>
        </div>
        {coach?.slug ? (
          <BookingLinkBox slug={coach.slug} />
        ) : (
          <p className="text-sm text-cb-text-secondary">
            Setting up your profile... Please refresh the page in a moment.
          </p>
        )}
      </div>
    </div>
  );
}
