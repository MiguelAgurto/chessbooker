import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./ProfileForm";
import AvatarUpload from "./AvatarUpload";
import SettingsNav from "./SettingsNav";
import GoogleCalendarConnect from "./GoogleCalendarConnect";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: coach } = await supabase
    .from("coaches")
    .select("*")
    .eq("id", user!.id)
    .single();

  // Fetch achievements from coach_achievements table
  const { data: achievementsRaw } = await supabase
    .from("coach_achievements")
    .select("id, result, event, year, sort_order")
    .eq("coach_id", user!.id);

  // Sort: by sort_order asc, then by year desc (nulls last)
  const achievements = (achievementsRaw || []).sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    if (a.year !== null && b.year !== null) return b.year - a.year;
    if (a.year === null && b.year !== null) return 1;
    if (a.year !== null && b.year === null) return -1;
    return 0;
  });

  // Fetch Google Calendar connection status
  const { data: googleConnection } = await supabase
    .from("google_connections")
    .select("google_email")
    .eq("coach_id", user!.id)
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
          <ProfileForm coach={coach} initialAchievements={achievements || []} />
        </div>

        <div className="card p-6">
          <GoogleCalendarConnect
            isConnected={!!googleConnection}
            googleEmail={googleConnection?.google_email || null}
          />
        </div>
      </div>
    </div>
  );
}
