import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateOAuthState,
  getAuthUrl,
  getRedirectUri,
} from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  try {
    // Verify coach is authenticated
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(
        new URL("/login?error=unauthorized", request.url)
      );
    }

    // Generate secure state with coach ID
    const { state } = generateOAuthState(user.id);

    // Get redirect URI based on current request origin
    const redirectUri = getRedirectUri(request.url);

    // Generate Google OAuth URL
    const authUrl = getAuthUrl(redirectUri, state);

    console.log(
      `[Google OAuth] Initiating connection for coach ${user.id}, redirect: ${redirectUri}`
    );

    // Redirect to Google consent screen
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("[Google OAuth] Connect error:", error);
    return NextResponse.redirect(
      new URL(
        "/app/settings?google=error&reason=connect_failed",
        request.url
      )
    );
  }
}
