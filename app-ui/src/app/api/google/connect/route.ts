import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateOAuthState,
  getAuthUrl,
  getRedirectUri,
  getAppBaseUrl,
} from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const appBaseUrl = getAppBaseUrl();

  try {
    // Verify coach is authenticated
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(`${appBaseUrl}/login?error=unauthorized`);
    }

    // Generate secure state with coach ID
    const { state } = generateOAuthState(user.id);

    // Get redirect URI (uses canonical domain)
    const redirectUri = getRedirectUri();

    // Generate Google OAuth URL
    const authUrl = getAuthUrl(redirectUri, state);

    console.log(
      `[Google OAuth] Initiating: redirect_uri=${redirectUri}, post_callback_base=${appBaseUrl}`
    );

    // Redirect to Google consent screen
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("[Google OAuth] Connect error:", error);
    return NextResponse.redirect(
      `${appBaseUrl}/app/settings?google=error&reason=connect_failed`
    );
  }
}
