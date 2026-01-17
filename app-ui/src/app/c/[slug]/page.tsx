import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import BookingForm from "./BookingForm";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicBookingPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: coach } = await supabase
    .from("coaches")
    .select("id, name, timezone, pricing, headline, bio, languages, tags, rating, years_coaching, avatar_url")
    .eq("slug", slug)
    .single();

  if (!coach) {
    notFound();
  }

  const { data: availability } = await supabase
    .from("availability_rules")
    .select("day_of_week, start_time, end_time")
    .eq("coach_id", coach.id)
    .order("day_of_week", { ascending: true });

  // Fetch accepted bookings for the next 7 days to block those slots
  const { data: confirmedBookings } = await supabase
    .from("booking_requests")
    .select("requested_times")
    .eq("coach_id", coach.id)
    .eq("status", "accepted");

  return (
    <div className="min-h-screen bg-cb-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            {coach.avatar_url ? (
              <img
                src={coach.avatar_url}
                alt={coach.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-coral-light border-4 border-white shadow-lg flex items-center justify-center">
                <span className="text-3xl font-semibold text-coral">
                  {coach.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
            )}
          </div>
          <h1 className="font-display text-3xl text-cb-text">Book a Session</h1>
          <p className="mt-2 text-lg text-cb-text-secondary">with {coach.name}</p>
          {coach.headline && (
            <p className="mt-1 text-sm text-cb-text-muted">{coach.headline}</p>
          )}
        </div>

        {(coach.bio || coach.languages || coach.tags || coach.rating || coach.years_coaching) && (
          <div className="card p-6 mb-6">
            {coach.bio && (
              <p className="text-cb-text-secondary text-sm mb-4">{coach.bio}</p>
            )}
            {(coach.languages || coach.tags) && (
              <div className="flex flex-wrap gap-2 mb-3">
                {coach.languages?.split(",").map((lang: string) => (
                  <span key={lang.trim()} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                    {lang.trim()}
                  </span>
                ))}
                {coach.tags?.split(",").map((tag: string) => (
                  <span key={tag.trim()} className="px-3 py-1 bg-coral-light text-coral text-xs font-medium rounded-full">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}
            {(coach.rating || coach.years_coaching) && (
              <p className="text-xs text-cb-text-muted">
                {coach.rating && `Rating: ${coach.rating}`}
                {coach.rating && coach.years_coaching && " · "}
                {coach.years_coaching && `${coach.years_coaching} years coaching`}
              </p>
            )}
          </div>
        )}

        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-cb-text mb-4">Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-cb-bg p-4 rounded-lg text-center border border-cb-border-light">
              <div className="text-2xl font-bold text-cb-text">
                ${coach.pricing?.["60min"] || 50}
              </div>
              <div className="text-sm text-cb-text-secondary">60 minutes</div>
            </div>
            <div className="bg-cb-bg p-4 rounded-lg text-center border border-cb-border-light">
              <div className="text-2xl font-bold text-cb-text">
                ${coach.pricing?.["90min"] || 70}
              </div>
              <div className="text-sm text-cb-text-secondary">90 minutes</div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-cb-text mb-4">Request a Session</h2>
          <BookingForm
            coachId={coach.id}
            coachTimezone={coach.timezone || "UTC"}
            availability={availability || []}
            confirmedBookings={confirmedBookings || []}
          />
        </div>
      </div>
    </div>
  );
}
