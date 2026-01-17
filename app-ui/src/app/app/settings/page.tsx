import { createClient } from "@/lib/supabase/server";
import SettingsForm from "./SettingsForm";
import AvailabilityEditor from "./AvailabilityEditor";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: coach } = await supabase
    .from("coaches")
    .select("*")
    .eq("id", user!.id)
    .single();

  const { data: availability } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("coach_id", user!.id)
    .order("day_of_week", { ascending: true });

  return (
    <div>
      <h1 className="font-display text-3xl text-cb-text mb-8">Settings</h1>

      <div className="space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-cb-text mb-4">Profile</h2>
          <SettingsForm coach={coach} />
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-cb-text mb-4">Availability</h2>
          <AvailabilityEditor availability={availability || []} coachId={user!.id} />
        </div>
      </div>
    </div>
  );
}
