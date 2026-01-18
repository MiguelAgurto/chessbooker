import { createClient } from "@/lib/supabase/server";
import AvailabilityEditor from "../settings/AvailabilityEditor";

export default async function SchedulesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: availability } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("coach_id", user!.id)
    .order("day_of_week", { ascending: true });

  return (
    <div>
      <h1 className="font-display text-3xl text-cb-text mb-8">Schedules</h1>

      <div className="card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-cb-text">Your Availability</h2>
          <p className="text-sm text-cb-text-secondary mt-1">
            Set the times when students can book lessons with you.
          </p>
        </div>
        <AvailabilityEditor availability={availability || []} coachId={user!.id} />
      </div>
    </div>
  );
}
