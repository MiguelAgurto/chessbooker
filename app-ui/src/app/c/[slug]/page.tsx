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
    .select("id, name, title, timezone, pricing, headline, bio, languages, tags, rating, years_coaching, avatar_url, achievements")
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
          <p className="mt-2 text-lg text-cb-text-secondary">
            with {coach.name}
            {coach.title && (
              <span className="ml-1.5 text-coral font-medium">{coach.title}</span>
            )}
          </p>
          {coach.headline && (
            <p className="mt-1 text-sm text-cb-text-muted">{coach.headline}</p>
          )}
        </div>

        {/* Coach bio - visually secondary */}
        {(coach.bio || coach.languages || coach.tags || coach.rating || coach.years_coaching || (coach.achievements && coach.achievements.length > 0)) && (
          <div className="card px-5 py-4 mb-6">
            {coach.bio && (
              <p className="text-cb-text-muted text-xs leading-relaxed mb-3">{coach.bio}</p>
            )}
            {(coach.languages || coach.tags) && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {coach.languages?.split(",").map((lang: string) => (
                  <span key={lang.trim()} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
                    {lang.trim()}
                  </span>
                ))}
                {coach.tags?.split(",").map((tag: string) => (
                  <span key={tag.trim()} className="px-2 py-0.5 bg-coral-light/50 text-coral text-xs rounded-full">
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
            {/* Achievements */}
            {coach.achievements && coach.achievements.length > 0 && (
              <div className={`${(coach.bio || coach.languages || coach.tags || coach.rating || coach.years_coaching) ? "mt-3 pt-3 border-t border-cb-border-light" : ""}`}>
                <div className="space-y-1.5">
                  {coach.achievements.map((achievement: { result: string; event?: string; year?: number }, index: number) => (
                    <div key={index} className="flex items-start gap-2 text-xs text-cb-text-muted">
                      <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                      </svg>
                      <span>
                        <span className="font-medium text-cb-text-secondary">{achievement.result}</span>
                        {achievement.event && <span> - {achievement.event}</span>}
                        {achievement.year && <span className="text-cb-text-muted"> ({achievement.year})</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <BookingForm
          coachId={coach.id}
          coachTimezone={coach.timezone || "UTC"}
          availability={availability || []}
          confirmedBookings={confirmedBookings || []}
          pricing={coach.pricing || { "60min": 50, "90min": 70 }}
        />
      </div>
    </div>
  );
}
