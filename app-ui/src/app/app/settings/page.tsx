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
    <div className="px-4 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Profile</h2>
          <SettingsForm coach={coach} />
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Availability</h2>
          <AvailabilityEditor availability={availability || []} coachId={user!.id} />
        </div>
      </div>
    </div>
  );
}
