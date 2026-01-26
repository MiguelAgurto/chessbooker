import { createClient } from "@/lib/supabase/server";
import RulesForm from "../RulesForm";
import SettingsNav from "../SettingsNav";

export default async function RulesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch coach settings
  const { data: settings } = await supabase
    .from("coach_settings")
    .select("*")
    .eq("coach_id", user!.id)
    .single();

  return (
    <div>
      <h1 className="font-display text-3xl text-cb-text mb-6">Settings</h1>

      <SettingsNav active="rules" />

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-cb-text mb-4">Booking Rules</h2>
        <p className="text-sm text-cb-text-secondary mb-6">
          Configure how booking requests are handled, including expiration policies and custom rules.
        </p>
        <RulesForm coachId={user!.id} settings={settings} />
      </div>
    </div>
  );
}
