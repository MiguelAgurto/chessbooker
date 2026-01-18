import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  validateOAuthState,
  exchangeCodeForTokens,
  getGoogleUserEmail,
  getRedirectUri,
  getAppBaseUrl,
} from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const appBaseUrl = getAppBaseUrl();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Handle OAuth errors from Google
  if (error) {
    console.error("[Google OAuth] Error from Google:", error);
    return NextResponse.redirect(
      `${appBaseUrl}/app/settings?google=error&reason=${encodeURIComponent(error)}`
    );
  }

  // Validate required parameters
  if (!code || !state) {
    console.error("[Google OAuth] Missing code or state");
    return NextResponse.redirect(
      `${appBaseUrl}/app/settings?google=error&reason=missing_params`
    );
  }

  // Validate state parameter
  const stateValidation = validateOAuthState(state);
  if (!stateValidation.valid || !stateValidation.coachId) {
    console.error("[Google OAuth] Invalid state parameter");
    return NextResponse.redirect(
      `${appBaseUrl}/app/settings?google=error&reason=invalid_state`
    );
  }

  const { coachId } = stateValidation;

  // Verify the authenticated user matches the state coach ID
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || user.id !== coachId) {
    console.error("[Google OAuth] Auth mismatch or not logged in");
    return NextResponse.redirect(
      `${appBaseUrl}/app/settings?google=error&reason=auth_mismatch`
    );
  }

  try {
    // Exchange code for tokens (uses canonical redirect URI)
    const redirectUri = getRedirectUri();
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    console.log(
      `[Google OAuth] Tokens received for coach ${coachId}, has refresh_token: ${!!tokens.refresh_token}`
    );

    // Get Google user email
    const googleEmail = await getGoogleUserEmail(tokens.access_token);

    if (!googleEmail) {
      console.error("[Google OAuth] Could not get Google email");
      return NextResponse.redirect(
        `${appBaseUrl}/app/settings?google=error&reason=no_email`
      );
    }

    // Check if connection already exists
    const { data: existingConnection } = await supabase
      .from("google_connections")
      .select("refresh_token")
      .eq("coach_id", coachId)
      .single();

    // Prepare data for upsert
    const connectionData: Record<string, unknown> = {
      coach_id: coachId,
      google_email: googleEmail,
      access_token: tokens.access_token,
      token_expiry: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    };

    // Only update refresh_token if we got a new one
    // (Google doesn't always return refresh_token on re-auth)
    if (tokens.refresh_token) {
      connectionData.refresh_token = tokens.refresh_token;
    } else if (!existingConnection?.refresh_token) {
      // No new refresh token and no existing one - this is a problem
      console.error("[Google OAuth] No refresh token available");
      return NextResponse.redirect(
        `${appBaseUrl}/app/settings?google=error&reason=no_refresh_token`
      );
    }

    // Upsert the connection
    const { error: upsertError } = await supabase
      .from("google_connections")
      .upsert(connectionData, { onConflict: "coach_id" });

    if (upsertError) {
      console.error("[Google OAuth] Failed to save connection:", upsertError);
      return NextResponse.redirect(
        `${appBaseUrl}/app/settings?google=error&reason=save_failed`
      );
    }

    const finalRedirect = `${appBaseUrl}/app/settings?google=connected`;
    console.log(
      `[Google OAuth] Success for coach ${coachId}, redirecting to: ${finalRedirect}`
    );

    return NextResponse.redirect(finalRedirect);
  } catch (err) {
    console.error("[Google OAuth] Callback error:", err);
    return NextResponse.redirect(
      `${appBaseUrl}/app/settings?google=error&reason=exchange_failed`
    );
  }
}
