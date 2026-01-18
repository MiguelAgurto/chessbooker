import { google } from "googleapis";
import crypto from "crypto";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];

/**
 * Get the OAuth2 client configured with credentials
 */
export function getOAuth2Client(redirectUri?: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

/**
 * Generate the redirect URI based on the request origin
 */
export function getRedirectUri(requestUrl: string): string {
  // If explicit redirect URI is set, use it
  if (process.env.GOOGLE_OAUTH_REDIRECT_URI) {
    return process.env.GOOGLE_OAUTH_REDIRECT_URI;
  }

  // Otherwise derive from request
  const url = new URL(requestUrl);
  return `${url.origin}/api/google/callback`;
}

/**
 * Generate a secure state parameter containing coach_id and nonce
 */
export function generateOAuthState(coachId: string): {
  state: string;
  nonce: string;
} {
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = JSON.stringify({ coachId, nonce });
  const secret = process.env.GOOGLE_CLIENT_SECRET || "fallback-secret";

  // Sign the payload
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const signature = hmac.digest("hex");

  // Combine payload and signature
  const state = Buffer.from(
    JSON.stringify({ payload, signature })
  ).toString("base64url");

  return { state, nonce };
}

/**
 * Validate and parse the OAuth state parameter
 */
export function validateOAuthState(state: string): {
  valid: boolean;
  coachId?: string;
  nonce?: string;
} {
  try {
    const decoded = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8")
    );
    const { payload, signature } = decoded;
    const secret = process.env.GOOGLE_CLIENT_SECRET || "fallback-secret";

    // Verify signature
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    if (signature !== expectedSignature) {
      return { valid: false };
    }

    const parsed = JSON.parse(payload);
    return {
      valid: true,
      coachId: parsed.coachId,
      nonce: parsed.nonce,
    };
  } catch {
    return { valid: false };
  }
}

/**
 * Generate the Google OAuth consent URL
 */
export function getAuthUrl(redirectUri: string, state: string): string {
  const oauth2Client = getOAuth2Client(redirectUri);

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    include_granted_scopes: true,
    state,
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}> {
  const oauth2Client = getOAuth2Client(redirectUri);
  const { tokens } = await oauth2Client.getToken(code);

  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token || undefined,
    expiry_date: tokens.expiry_date || undefined,
  };
}

/**
 * Get the user's email from Google
 */
export async function getGoogleUserEmail(accessToken: string): Promise<string> {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  return data.email || "";
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expiry_date?: number;
}> {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  return {
    access_token: credentials.access_token!,
    expiry_date: credentials.expiry_date || undefined,
  };
}
