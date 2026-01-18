import { createClient } from "@/lib/supabase/server";
import PricingForm from "../PricingForm";
import SettingsNav from "../SettingsNav";

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: coach } = await supabase
    .from("coaches")
    .select("*")
    .eq("id", user!.id)
    .single();

  return (
    <div>
      <h1 className="font-display text-3xl text-cb-text mb-6">Settings</h1>

      <SettingsNav active="pricing" />

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-cb-text mb-4">Pricing & Booking</h2>
        <PricingForm coach={coach} />
      </div>
    </div>
  );
}
