import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: coach } = await supabase
    .from("coaches")
    .select("*")
    .eq("id", user!.id)
    .single();

  const { count: pendingCount } = await supabase
    .from("booking_requests")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", user!.id)
    .eq("status", "pending");

  const { count: confirmedCount } = await supabase
    .from("booking_requests")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", user!.id)
    .eq("status", "accepted");

  const { data: availability } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("coach_id", user!.id);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl text-cb-text">
          {coach?.name ? `Welcome, ${coach.name}` : "Dashboard"}
        </h1>
        <Link
          href="/app/settings"
          className="text-sm font-medium text-coral hover:text-coral-dark transition-colors"
        >
          Edit profile
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="card overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-coral-light rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 fill-coral" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </div>
              <div className="ml-5 flex-1">
                <p className="text-sm font-medium text-cb-text-secondary">Pending Requests</p>
                <p className="text-2xl font-semibold text-cb-text">{pendingCount || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-cb-bg px-6 py-4 border-t border-cb-border-light">
            <Link href="/app/requests" className="text-sm font-medium text-coral hover:text-coral-dark transition-colors">
              View all requests
            </Link>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 fill-green-500" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
              </div>
              <div className="ml-5 flex-1">
                <p className="text-sm font-medium text-cb-text-secondary">Confirmed Sessions</p>
                <p className="text-2xl font-semibold text-cb-text">{confirmedCount || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 fill-blue-500" viewBox="0 0 24 24">
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
                </svg>
              </div>
              <div className="ml-5 flex-1">
                <p className="text-sm font-medium text-cb-text-secondary">Availability Rules</p>
                <p className="text-2xl font-semibold text-cb-text">{availability?.length || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-cb-bg px-6 py-4 border-t border-cb-border-light">
            <Link href="/app/settings" className="text-sm font-medium text-coral hover:text-coral-dark transition-colors">
              Manage availability
            </Link>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-cb-text mb-4">Your Public Booking Link</h2>
        {coach?.slug ? (
          <>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-cb-bg px-4 py-3 rounded-lg border border-cb-border-light">
                <code className="text-sm text-cb-text break-all">
                  {process.env.NEXT_PUBLIC_SITE_URL || "https://app.chessbooker.com"}/c/{coach.slug}
                </code>
              </div>
              <Link
                href={`/c/${coach.slug}`}
                target="_blank"
                className="btn-primary"
              >
                Open
              </Link>
            </div>
            <p className="mt-3 text-sm text-cb-text-secondary">
              Share this link with students so they can request bookings.
            </p>
          </>
        ) : (
          <p className="text-sm text-cb-text-secondary">
            Setting up your profile... Please refresh the page in a moment.
          </p>
        )}
      </div>
    </div>
  );
}
