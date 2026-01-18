import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import AuthUrlCleaner from "@/components/AuthUrlCleaner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: coach } = await supabase
    .from("coaches")
    .select("name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-cb-bg">
      <AuthUrlCleaner />
      <nav className="bg-white border-b border-cb-border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/app" className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-coral rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M19 22H5v-2h14v2M17.16 8.26A4.54 4.54 0 0 0 15 3.5V2h-2v1.5c0 .55-.45 1-1 1s-1-.45-1-1V2H9v1.5A4.54 4.54 0 0 0 6.84 8.26 5.93 5.93 0 0 0 6 11.5c0 2.21 1.12 4.15 2.81 5.29l-.81.81V19h8v-1.4l-.81-.81A6.46 6.46 0 0 0 18 11.5c0-1.17-.29-2.27-.84-3.24Z"/>
                    </svg>
                  </div>
                  <span className="text-lg font-bold text-cb-text">ChessBooker</span>
                </Link>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
                <Link
                  href="/app"
                  className="text-cb-text-secondary hover:text-cb-text hover:bg-cb-bg-alt inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/app/requests"
                  className="text-cb-text-secondary hover:text-cb-text hover:bg-cb-bg-alt inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Requests
                </Link>
                <Link
                  href="/app/settings"
                  className="text-cb-text-secondary hover:text-cb-text hover:bg-cb-bg-alt inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Settings
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {coach?.avatar_url ? (
                <img
                  src={coach.avatar_url}
                  alt={coach.name || "Profile"}
                  className="w-8 h-8 rounded-full object-cover hidden sm:block"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-coral-light hidden sm:flex items-center justify-center">
                  <span className="text-xs font-semibold text-coral">
                    {(coach?.name || user.email || "U")
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                </div>
              )}
              <span className="text-sm font-semibold text-cb-text hidden sm:block">
                {coach?.name || user.email}
              </span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
