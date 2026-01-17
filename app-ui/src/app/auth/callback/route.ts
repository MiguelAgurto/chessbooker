import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if coach profile exists, if not create one
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: coach } = await supabase
          .from("coaches")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!coach) {
          // Create initial coach profile
          await supabase.from("coaches").insert({
            id: user.id,
            name: user.email?.split("@")[0] || "Coach",
            timezone: "UTC",
            slug: user.id.slice(0, 8),
            pricing: { "60min": 50, "90min": 70 },
          });
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`);
}
