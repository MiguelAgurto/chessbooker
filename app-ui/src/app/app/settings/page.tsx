import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./ProfileForm";
import AvatarUpload from "./AvatarUpload";
import SettingsNav from "./SettingsNav";

export default async function ProfilePage() {
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

      <SettingsNav active="profile" />

      <div className="space-y-6">
        <div className="card p-6">
          <AvatarUpload coachId={user!.id} currentAvatarUrl={coach?.avatar_url || null} />
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-cb-text mb-4">Profile Information</h2>
          <ProfileForm coach={coach} />
        </div>
      </div>
    </div>
  );
}
