"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface GoogleCalendarConnectProps {
  isConnected: boolean;
  googleEmail: string | null;
}

export default function GoogleCalendarConnect({
  isConnected,
  googleEmail,
}: GoogleCalendarConnectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Show message from URL params (after OAuth redirect)
  const googleParam = searchParams.get("google");
  const reason = searchParams.get("reason");

  const getUrlMessage = () => {
    if (googleParam === "connected") {
      return { type: "success" as const, text: "Google Calendar connected successfully!" };
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
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {displayMessage.text}
        </div>
      )}

      {isConnected ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
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
            </div>
            <div>
              <div className="text-sm font-medium text-cb-text">Connected</div>
              <div className="text-sm text-cb-text-secondary">{googleEmail}</div>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="text-sm text-cb-text-muted hover:text-red-500 font-medium transition-colors disabled:opacity-50"
          >
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
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
