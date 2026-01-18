"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm font-medium text-cb-text-secondary hover:text-coral px-3 py-1.5 rounded-lg border border-cb-border hover:border-coral transition-colors"
    >
      Sign out
    </button>
  );
}
