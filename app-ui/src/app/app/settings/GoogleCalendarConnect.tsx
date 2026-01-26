"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface GoogleCalendarConnectProps {
  isConnected: boolean;
  googleEmail: string | null;
  needsReconnect?: boolean; // True if scopes are insufficient
}

export default function GoogleCalendarConnect({
  isConnected,
  googleEmail,
  needsReconnect = false,
}: GoogleCalendarConnectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [disconnecting, setDisconnecting] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  // Show message from URL params (after OAuth redirect)
  const googleParam = searchParams.get("google");
  const reason = searchParams.get("reason");

  const getUrlMessage = () => {
    if (googleParam === "connected") {
      return { type: "success" as const, text: "Google Calendar connected successfully!" };
    }
    if (googleParam === "reconnected") {
      return { type: "success" as const, text: "Google Calendar reconnected with updated permissions!" };
    }
    if (googleParam === "disconnected") {
      return { type: "success" as const, text: "Google Calendar disconnected." };
    }
    if (googleParam === "error") {
      const errorMessages: Record<string, string> = {
        connect_failed: "Failed to initiate connection.",
        missing_params: "Missing OAuth parameters.",
        invalid_state: "Invalid state parameter. Please try again.",
        auth_mismatch: "Authentication mismatch. Please log in again.",
        no_email: "Could not retrieve your Google email.",
        no_refresh_token: "Could not get authorization. Please try again.",
        save_failed: "Failed to save connection.",
        exchange_failed: "Failed to complete authorization.",
        access_denied: "Access was denied.",
        insufficient_scopes: "Calendar permissions not granted. Please reconnect and allow calendar access.",
      };
      return {
        type: "error" as const,
        text: errorMessages[reason || ""] || "An error occurred. Please try again.",
      };
    }
    return null;
  };

  const urlMessage = getUrlMessage();

  const handleConnect = () => {
    // Navigate to the connect endpoint
    window.location.href = "/api/google/connect";
  };

  const handleReconnect = async () => {
    setReconnecting(true);
    setMessage(null);

    try {
      // First disconnect, then redirect to connect
      const response = await fetch("/api/google/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        // Redirect to reconnect with force consent
        window.location.href = "/api/google/connect?reconnect=true";
      } else {
        setMessage({ type: "error", text: "Failed to reconnect. Please try again." });
        setReconnecting(false);
      }
    } catch {
      setMessage({ type: "error", text: "Failed to reconnect. Please try again." });
      setReconnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/google/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Google Calendar disconnected." });
        router.refresh();
      } else {
        setMessage({ type: "error", text: "Failed to disconnect. Please try again." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to disconnect. Please try again." });
    }

    setDisconnecting(false);
  };

  const displayMessage = message || urlMessage;

  return (
    <div>
      <h2 className="text-lg font-semibold text-cb-text mb-4">
        Google Calendar Integration
      </h2>

      <p className="text-sm text-cb-text-secondary mb-4">
        Connect your Google Calendar to automatically create calendar events with
        Google Meet links when you confirm bookings.
      </p>

      {displayMessage && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            displayMessage.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : displayMessage.type === "warning"
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {displayMessage.text}
        </div>
      )}

      {/* Reconnect warning banner */}
      {isConnected && needsReconnect && !displayMessage && (
        <div className="mb-4 p-3 rounded-lg text-sm bg-amber-50 text-amber-700 border border-amber-200">
          <p className="font-medium mb-1">⚠️ Update required</p>
          <p className="text-amber-600">
            Your Google connection needs updated permissions to create calendar events.
            Please reconnect to grant calendar access.
          </p>
        </div>
      )}

      {isConnected ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                needsReconnect ? "bg-amber-50" : "bg-green-50"
              }`}>
                {needsReconnect ? (
                  <svg
                    className="w-5 h-5 text-amber-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-green-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 12l2 2 4-4" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-cb-text">
                  {needsReconnect ? "Needs reconnection" : "Connected"}
                </div>
                <div className="text-sm text-cb-text-secondary">{googleEmail}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReconnect}
                disabled={reconnecting || disconnecting}
                className={`text-sm font-medium transition-colors disabled:opacity-50 ${
                  needsReconnect
                    ? "text-coral hover:text-coral-dark"
                    : "text-cb-text-muted hover:text-coral"
                }`}
              >
                {reconnecting ? "Reconnecting..." : "Reconnect"}
              </button>
              <span className="text-cb-border">|</span>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting || reconnecting}
                className="text-sm text-cb-text-muted hover:text-red-500 font-medium transition-colors disabled:opacity-50"
              >
                {disconnecting ? "..." : "Disconnect"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          className="flex items-center gap-3 px-4 py-3 bg-white border border-cb-border rounded-lg hover:border-coral hover:bg-coral/5 transition-colors w-full"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-sm font-medium text-cb-text">
            Connect Google Calendar
          </span>
        </button>
      )}
    </div>
  );
}
