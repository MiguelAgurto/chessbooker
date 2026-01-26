import { google, calendar_v3 } from "googleapis";
import { getOAuth2Client, refreshAccessToken } from "./oauth";
import { createClient } from "@/lib/supabase/server";

interface GoogleConnection {
  coach_id: string;
  google_email: string;
  refresh_token: string;
  access_token: string | null;
  token_expiry: string | null;
}

interface CreateEventParams {
  coachId: string;
  bookingId: string;
  summary: string;
  description: string;
  startDateTime: string; // ISO string
  durationMinutes: number;
  coachTimezone: string;
  studentEmail: string;
  coachGoogleEmail?: string;
}

interface CreateEventResult {
  success: boolean;
  eventId?: string;
  meetUrl?: string;
  error?: string;
  isInsufficientScopes?: boolean;
}

/**
 * Get an authenticated Google Calendar client for a coach
 */
async function getCalendarClient(
  connection: GoogleConnection
): Promise<calendar_v3.Calendar | null> {
  const oauth2Client = getOAuth2Client();

  // Check if we need to refresh the token
  const now = Date.now();
  const tokenExpiry = connection.token_expiry
    ? new Date(connection.token_expiry).getTime()
    : 0;
  const needsRefresh = !connection.access_token || tokenExpiry < now + 60000; // 1 min buffer

  if (needsRefresh) {
    try {
      const { access_token, expiry_date } = await refreshAccessToken(
        connection.refresh_token
      );

      // Update tokens in database
      const supabase = await createClient();
      await supabase
        .from("google_connections")
        .update({
          access_token,
          token_expiry: expiry_date
            ? new Date(expiry_date).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("coach_id", connection.coach_id);

      oauth2Client.setCredentials({
        access_token,
        refresh_token: connection.refresh_token,
      });
    } catch (error) {
      console.error("Failed to refresh Google access token:", error);
      return null;
    }
  } else {
    oauth2Client.setCredentials({
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
    });
  }

  return google.calendar({ version: "v3", auth: oauth2Client });
}

/**
 * Create a Google Calendar event with Google Meet link
 */
export async function createCalendarEvent(
  params: CreateEventParams
): Promise<CreateEventResult> {
  const {
    coachId,
    bookingId,
    summary,
    description,
    startDateTime,
    durationMinutes,
    coachTimezone,
    studentEmail,
    coachGoogleEmail,
  } = params;

  // Fetch Google connection
  console.log(`[Google Calendar] Fetching connection for coach_id=${coachId}`);

  const supabase = await createClient();
  const { data: connection, error: connError } = await supabase
    .from("google_connections")
    .select("*")
    .eq("coach_id", coachId)
    .single();

  if (connError || !connection) {
    console.error(
      `[Google Calendar] No connection found for coach_id=${coachId}`,
      connError
    );
    return {
      success: false,
      error: `Google Calendar not connected: ${connError?.message || "no row"}`,
    };
  }

  console.log(
    `[Google Calendar] Connection found: google_email=${connection.google_email}, has_refresh_token=${!!connection.refresh_token}`
  );

  const calendar = await getCalendarClient(connection as GoogleConnection);
  if (!calendar) {
    console.error(`[Google Calendar] Failed to get authenticated client for coach_id=${coachId}`);
    return {
      success: false,
      error: "Failed to authenticate with Google Calendar",
    };
  }

  console.log(`[Google Calendar] Authenticated client ready for coach_id=${coachId}`);

  // Calculate end time
  const startDate = new Date(startDateTime);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  // Build attendees list
  const attendees: calendar_v3.Schema$EventAttendee[] = [
    { email: studentEmail },
  ];
  if (coachGoogleEmail) {
    attendees.push({ email: coachGoogleEmail });
  }

  // Create unique request ID for conference
  const requestId = `chessbooker-${bookingId}-${Date.now()}`;

  try {
    console.log(
      `[Google Calendar] Creating event: summary="${summary}", start=${startDate.toISOString()}, timezone=${coachTimezone}, requestId=${requestId}`
    );

    const event = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "all",
      requestBody: {
        summary,
        description,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: coachTimezone,
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: coachTimezone,
        },
        attendees,
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
          },
        },
      },
    });

    console.log(
      `[Google Calendar] Event insert response: id=${event.data.id}, status=${event.data.status}, hangoutLink=${event.data.hangoutLink}`
    );

    // Extract Meet URL
    let meetUrl: string | undefined;

    // Try to get from entryPoints first
    const videoEntryPoint = event.data.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === "video"
    );
    if (videoEntryPoint?.uri) {
      meetUrl = videoEntryPoint.uri;
      console.log(`[Google Calendar] Got Meet URL from entryPoints: ${meetUrl}`);
    } else if (event.data.hangoutLink) {
      // Fallback to hangoutLink
      meetUrl = event.data.hangoutLink;
      console.log(`[Google Calendar] Got Meet URL from hangoutLink: ${meetUrl}`);
    } else {
      console.warn(`[Google Calendar] No Meet URL found in response for event ${event.data.id}`);
    }

    console.log(
      `[Google Calendar] Event created successfully: eventId=${event.data.id}, meetUrl=${meetUrl}`
    );

    return {
      success: true,
      eventId: event.data.id || undefined,
      meetUrl,
    };
  } catch (error) {
    console.error("[Google Calendar] Failed to create event:", error);

    // Extract detailed error info
    let errorMessage = "Unknown error";
    let isInsufficientScopes = false;

    if (error && typeof error === "object") {
      // Check for GaxiosError structure (Google API errors)
      const gaxiosError = error as {
        response?: {
          status?: number;
          statusText?: string;
          data?: {
            error?: {
              code?: number;
              message?: string;
              status?: string;
              errors?: Array<{ domain?: string; reason?: string; message?: string }>;
            };
          };
        };
        message?: string;
        code?: string | number;
      };

      // Log detailed error response
      if (gaxiosError.response) {
        console.error("[Google Calendar] API error response:", {
          status: gaxiosError.response.status,
          statusText: gaxiosError.response.statusText,
          data: JSON.stringify(gaxiosError.response.data, null, 2),
        });

        const apiError = gaxiosError.response.data?.error;
        if (apiError) {
          errorMessage = apiError.message || errorMessage;

          // Check for insufficient scopes / permission denied
          const isForbidden =
            apiError.status === "PERMISSION_DENIED" ||
            apiError.code === 403 ||
            gaxiosError.response.status === 403;

          const hasScopeError =
            apiError.message?.toLowerCase().includes("insufficient") ||
            apiError.message?.toLowerCase().includes("scope") ||
            apiError.message?.toLowerCase().includes("permission") ||
            apiError.errors?.some(
              (e) =>
                e.reason === "insufficientPermissions" ||
                e.reason === "forbidden" ||
                e.reason === "accessNotConfigured"
            );

          if (isForbidden || hasScopeError) {
            isInsufficientScopes = true;
            errorMessage = "INSUFFICIENT_SCOPES";
            console.error(
              "[Google Calendar] INSUFFICIENT SCOPES DETECTED. User needs to reconnect Google Calendar with updated permissions.",
              { status: gaxiosError.response.status, apiError }
            );
          }
        }
      } else if (gaxiosError.message) {
        errorMessage = gaxiosError.message;
        if (
          gaxiosError.message.toLowerCase().includes("insufficient") ||
          gaxiosError.message.toLowerCase().includes("scope") ||
          gaxiosError.message.toLowerCase().includes("permission") ||
          gaxiosError.code === 403 ||
          gaxiosError.code === "403"
        ) {
          isInsufficientScopes = true;
          errorMessage = "INSUFFICIENT_SCOPES";
        }
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
      isInsufficientScopes,
    };
  }
}

interface UpdateEventParams {
  coachId: string;
  eventId: string;
  startDateTime: string; // ISO string
  durationMinutes: number;
  timezone: string;
}

interface UpdateEventResult {
  success: boolean;
  error?: string;
}

/**
 * Update a Google Calendar event's time (for rescheduling)
 */
export async function updateCalendarEventTime(
  params: UpdateEventParams
): Promise<UpdateEventResult> {
  const { coachId, eventId, startDateTime, durationMinutes, timezone } = params;

  const supabase = await createClient();
  const { data: connection, error: connError } = await supabase
    .from("google_connections")
    .select("*")
    .eq("coach_id", coachId)
    .single();

  if (connError || !connection) {
    console.error("[Google Calendar] No connection found for coach:", coachId);
    return { success: false, error: "Google Calendar not connected" };
  }

  const calendar = await getCalendarClient(connection as GoogleConnection);
  if (!calendar) {
    return { success: false, error: "Failed to authenticate with Google Calendar" };
  }

  // Calculate end time
  const startDate = new Date(startDateTime);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  try {
    await calendar.events.patch({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
      requestBody: {
        start: {
          dateTime: startDate.toISOString(),
          timeZone: timezone,
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: timezone,
        },
      },
    });

    console.log(`[Google Calendar] Event rescheduled: ${eventId}`);
    return { success: true };
  } catch (error) {
    console.error("[Google Calendar] Failed to update event:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a Google Calendar event
 */
export async function deleteCalendarEvent(
  coachId: string,
  eventId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data: connection, error: connError } = await supabase
    .from("google_connections")
    .select("*")
    .eq("coach_id", coachId)
    .single();

  if (connError || !connection) {
    console.error("[Google Calendar] No connection found for coach:", coachId);
    return false;
  }

  const calendar = await getCalendarClient(connection as GoogleConnection);
  if (!calendar) {
    return false;
  }

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
    });
    console.log(`[Google Calendar] Event deleted: ${eventId}`);
    return true;
  } catch (error) {
    console.error("[Google Calendar] Failed to delete event:", error);
    return false;
  }
}
