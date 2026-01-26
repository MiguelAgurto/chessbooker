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
    .select("id, name, title, timezone, pricing, headline, bio, languages, tags, rating, years_coaching, avatar_url, min_notice_minutes, buffer_minutes")
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

  // Fetch bookings that should block availability (pending holds + confirmed)
  // Only include bookings with scheduled_start/end set
  const { data: blockedBookings } = await supabase
    .from("booking_requests")
    .select("scheduled_start, scheduled_end, duration_minutes")
    .eq("coach_id", coach.id)
    .in("status", ["pending", "confirmed"])
    .not("scheduled_start", "is", null)
    .not("scheduled_end", "is", null);

  // Fetch achievements from coach_achievements table
  const { data: achievementsRaw } = await supabase
    .from("coach_achievements")
    .select("id, result, event, year, sort_order")
    .eq("coach_id", coach.id);

  // Sort: by sort_order asc, then by year desc (nulls last)
  const achievements = (achievementsRaw || []).sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    // Both have year: sort descending
    if (a.year !== null && b.year !== null) return b.year - a.year;
    // Null years go last
    if (a.year === null && b.year !== null) return 1;
    if (a.year !== null && b.year === null) return -1;
    return 0;
  });

  const hasMetadata = coach.languages || coach.tags || coach.rating || coach.years_coaching || (achievements && achievements.length > 0);

  return (
    <div className="min-h-screen bg-cb-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        {/* Coach-centric header */}
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
          <h1 className="font-display text-3xl text-cb-text">{coach.name}</h1>
          {coach.title && (
            <p className="mt-1 text-lg text-cb-text-secondary">{coach.title}</p>
          )}
          {coach.headline && (
            <p className="mt-2 text-sm text-cb-text-muted leading-relaxed max-w-md mx-auto">{coach.headline}</p>
          )}
        </div>

        {/* Coach bio card - improved layout */}
        {(coach.bio || hasMetadata) && (
          <div className="card mb-6 overflow-hidden">
            {/* Bio section */}
            {coach.bio && (
              <div className="px-5 py-4">
                <p className="text-cb-text-secondary text-sm leading-relaxed">{coach.bio}</p>
              </div>
            )}

            {/* Metadata section - visually distinct */}
            {hasMetadata && (
              <div className={`px-5 py-4 bg-cb-bg/50 ${coach.bio ? "border-t border-cb-border-light" : ""}`}>
                {/* Languages and tags */}
                {(coach.languages || coach.tags) && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
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

                {/* Rating and experience */}
                {(coach.rating || coach.years_coaching) && (
                  <div className="flex items-center gap-4 text-sm text-cb-text-secondary">
                    {coach.rating && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                        {coach.rating}
                      </span>
                    )}
                    {coach.years_coaching && (
                      <span>{coach.years_coaching} years coaching</span>
                    )}
                  </div>
                )}

                {/* Achievements */}
                {achievements && achievements.length > 0 && (
                  <div className={`${(coach.languages || coach.tags || coach.rating || coach.years_coaching) ? "mt-3 pt-3 border-t border-cb-border-light" : ""}`}>
                    <div className="space-y-1.5">
                      {achievements.map((achievement) => (
                        <div key={achievement.id} className="flex items-start gap-2 text-xs text-cb-text-muted">
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
          </div>
        )}

        {/* How lessons work - 3 simple steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-4 px-2">
            <div className="flex-1 text-center">
              <div className="w-10 h-10 rounded-full bg-coral-light text-coral flex items-center justify-center mx-auto mb-2 text-sm font-semibold">1</div>
              <p className="text-xs text-cb-text-secondary leading-tight">Pick a time that works for you</p>
            </div>
            <div className="w-8 border-t border-dashed border-cb-border"></div>
            <div className="flex-1 text-center">
              <div className="w-10 h-10 rounded-full bg-coral-light text-coral flex items-center justify-center mx-auto mb-2 text-sm font-semibold">2</div>
              <p className="text-xs text-cb-text-secondary leading-tight">Your coach confirms the lesson</p>
            </div>
            <div className="w-8 border-t border-dashed border-cb-border"></div>
            <div className="flex-1 text-center">
              <div className="w-10 h-10 rounded-full bg-coral-light text-coral flex items-center justify-center mx-auto mb-2 text-sm font-semibold">3</div>
              <p className="text-xs text-cb-text-secondary leading-tight">Meet online at your scheduled time</p>
            </div>
          </div>
        </div>

        <BookingForm
          coachId={coach.id}
          coachName={coach.name}
          coachTimezone={coach.timezone || "UTC"}
          availability={availability || []}
          blockedBookings={blockedBookings || []}
          pricing={coach.pricing || { "60min": 50, "90min": 70 }}
          minNoticeMinutes={coach.min_notice_minutes ?? 0}
          bufferMinutes={coach.buffer_minutes ?? 0}
        />
      </div>
    </div>
  );
}
