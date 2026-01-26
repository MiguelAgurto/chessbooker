"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTimeForCoach } from "@/lib/timezone";
import { acceptBookingRequest, declineBookingRequest } from "./actions";

interface SlotData {
  datetime: string;
  duration_minutes: number;
}

interface PendingRequest {
  id: string;
  student_name: string;
  student_email: string;
  student_timezone?: string | null;
  duration_minutes: number;
  requested_times: (string | SlotData)[];
  preferred_time_1?: string | null;
  preferred_time_2?: string | null;
  preferred_time_3?: string | null;
  created_at: string;
  status: string;
  expires_at?: string | null;
  reschedule_of?: string | null;
}

interface PendingRequestsProps {
  requests: PendingRequest[];
  timezone: string;
}

/**
 * Check if a string is a valid ISO 8601 timestamp
 */
function isValidISOTimestamp(value: string): boolean {
  if (!value) return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && value.includes("T");
}

/**
 * Get available times from request, falling back to legacy fields
 */
function getAvailableTimes(request: PendingRequest): (string | SlotData)[] {
  // If requested_times has data, use it
  if (request.requested_times && request.requested_times.length > 0) {
    return request.requested_times.slice(0, 3);
  }

  // Fallback to legacy preferred_time_1/2/3 fields
  const legacyTimes: string[] = [];
  if (request.preferred_time_1) legacyTimes.push(request.preferred_time_1);
  if (request.preferred_time_2) legacyTimes.push(request.preferred_time_2);
  if (request.preferred_time_3) legacyTimes.push(request.preferred_time_3);

  return legacyTimes;
}

/**
 * Check if request is using legacy free-text times only (no valid ISO timestamps)
 */
function isLegacyOnlyRequest(request: PendingRequest): boolean {
  // If requested_times has data, it's not legacy-only
  if (request.requested_times && request.requested_times.length > 0) {
    return false;
  }

  // Check if we have any legacy times
  const hasLegacyTimes =
    !!request.preferred_time_1 ||
    !!request.preferred_time_2 ||
    !!request.preferred_time_3;

  if (!hasLegacyTimes) {
    return false; // No times at all
  }

  // Check if any legacy time is a valid ISO timestamp
  const legacyTimes = [
    request.preferred_time_1,
    request.preferred_time_2,
    request.preferred_time_3,
  ].filter(Boolean) as string[];

  const hasValidISOTime = legacyTimes.some(isValidISOTimestamp);

  // It's legacy-only if we have legacy times but none are valid ISO
  return !hasValidISOTime;
}

/**
 * Get the primary requested time for display
 */
function getPrimaryTime(request: PendingRequest): { datetime: string; duration: number; isValid: boolean } | null {
  const times = getAvailableTimes(request);
  if (times.length === 0) return null;

  const time = times[0];
  if (typeof time === "string") {
    return {
      datetime: time,
      duration: request.duration_minutes || 60,
      isValid: isValidISOTimestamp(time),
    };
  }
  return {
    datetime: time.datetime,
    duration: time.duration_minutes || 60,
    isValid: isValidISOTimestamp(time.datetime),
  };
}

interface ConfirmModalProps {
  request: PendingRequest;
  timezone: string;
  onClose: () => void;
  onConfirm: (requestId: string, selectedTime: string, duration: number) => Promise<void>;
  isLoading: boolean;
}

function ConfirmModal({
  request,
  timezone,
  onClose,
  onConfirm,
  isLoading,
}: ConfirmModalProps) {
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(0);

  const times = getAvailableTimes(request);
  const isReschedule = !!request.reschedule_of;

  const getTimeData = (time: string | SlotData): { datetime: string; duration: number; isValid: boolean } => {
    if (typeof time === "string") {
      return {
        datetime: time,
        duration: request.duration_minutes || 60,
        isValid: isValidISOTimestamp(time),
      };
    }
    return {
      datetime: time.datetime,
      duration: time.duration_minutes || 60,
      isValid: isValidISOTimestamp(time.datetime),
    };
  };

  const selectedTime = times[selectedTimeIndex];
  const { isValid: selectedIsValid, duration: selectedDuration } = selectedTime ? getTimeData(selectedTime) : { isValid: false, duration: 60 };

  const handleConfirm = async () => {
    if (!selectedIsValid) return;
    const selected = times[selectedTimeIndex];
    const { datetime, duration } = getTimeData(selected);
    await onConfirm(request.id, datetime, duration);
  };

  const formatTimeDisplay = (time: string | SlotData): { date: string; time: string } => {
    const { datetime, isValid } = getTimeData(time);
    if (isValid) {
      const d = new Date(datetime);
      const dateStr = d.toLocaleDateString("en-US", {
        timeZone: timezone,
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const timeStr = d.toLocaleTimeString("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return { date: dateStr, time: timeStr };
    }
    // For non-ISO values, display as-is (legacy free-text format)
    return { date: "", time: typeof time === "string" ? time : time.datetime };
  };

  if (times.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
          <h3 className="text-lg font-semibold text-cb-text mb-2">
            No times available
          </h3>
          <p className="text-sm text-cb-text-secondary mb-4">
            This request has no proposed times. Please coordinate with the student directly.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-cb-text-secondary border border-cb-border rounded-lg hover:bg-cb-bg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-cb-text mb-4">
          {isReschedule ? "Confirm rescheduled lesson" : "Confirm lesson"}
        </h3>

        {/* Lesson summary */}
        <div className="bg-cb-bg rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-coral-light flex items-center justify-center">
              <span className="text-coral font-semibold text-sm">
                {request.student_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-cb-text">{request.student_name}</p>
              <p className="text-xs text-cb-text-muted">{request.student_email}</p>
            </div>
          </div>
        </div>

        {/* Time selection */}
        {times.length === 1 ? (
          <div className="mb-4">
            <p className="text-xs font-medium text-cb-text-muted mb-2">Requested time</p>
            <div className="p-3 rounded-lg border border-coral bg-coral-light">
              <p className="text-sm font-medium text-cb-text">
                {formatTimeDisplay(times[0]).date} at {formatTimeDisplay(times[0]).time}
              </p>
              <p className="text-xs text-cb-text-muted">{selectedDuration} minutes</p>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-xs font-medium text-cb-text-muted mb-2">Select a time</p>
            <div className="space-y-2">
              {times.map((time, index) => {
                const { duration, isValid } = getTimeData(time);
                const { date, time: timeStr } = formatTimeDisplay(time);
                return (
                  <label
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTimeIndex === index
                        ? "border-coral bg-coral-light"
                        : "border-cb-border hover:border-coral"
                    } ${!isValid ? "opacity-70" : ""}`}
                  >
                    <input
                      type="radio"
                      name="selectedTime"
                      checked={selectedTimeIndex === index}
                      onChange={() => setSelectedTimeIndex(index)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedTimeIndex === index
                          ? "border-coral"
                          : "border-cb-border"
                      }`}
                    >
                      {selectedTimeIndex === index && (
                        <div className="w-2 h-2 rounded-full bg-coral" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-cb-text">
                        {date} at {timeStr}
                      </p>
                      <p className="text-xs text-cb-text-muted">
                        {duration} min
                        {!isValid && (
                          <span className="ml-2 text-amber-600">(invalid format)</span>
                        )}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {!selectedIsValid && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">
              This time format cannot be processed automatically. Please coordinate with the student directly.
            </p>
          </div>
        )}

        <p className="text-xs text-cb-text-muted mb-4">
          The student will receive a confirmation email with the lesson details.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-cb-text-secondary border border-cb-border rounded-lg hover:bg-cb-bg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || !selectedIsValid}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Confirming..." : "Confirm lesson"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DeclineModalProps {
  request: PendingRequest;
  onClose: () => void;
  onDecline: (requestId: string, message?: string) => Promise<void>;
  isLoading: boolean;
}

function DeclineModal({
  request,
  onClose,
  onDecline,
  isLoading,
}: DeclineModalProps) {
  const [message, setMessage] = useState("");

  const handleDecline = async () => {
    await onDecline(request.id, message.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-cb-text mb-2">
          Decline request
        </h3>
        <p className="text-sm text-cb-text-secondary mb-4">
          Are you sure you want to decline the lesson request from <strong>{request.student_name}</strong>?
        </p>

        <div className="mb-4">
          <label htmlFor="declineMessage" className="text-xs font-medium text-cb-text-muted mb-1.5 block">
            Message to student (optional)
          </label>
          <textarea
            id="declineMessage"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g., I'm fully booked this week. Please try again next week."
            className="w-full px-3 py-2 text-sm border border-cb-border rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        <p className="text-xs text-cb-text-muted mb-4">
          The student will be notified that you are unable to accept at this time.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-cb-text-secondary border border-cb-border rounded-lg hover:bg-cb-bg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Declining..." : "Decline"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PendingRequests({
  requests,
  timezone,
}: PendingRequestsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmModalRequest, setConfirmModalRequest] = useState<PendingRequest | null>(null);
  const [declineModalRequest, setDeclineModalRequest] = useState<PendingRequest | null>(null);

  const handleConfirm = async (
    requestId: string,
    selectedTime: string,
    duration: number
  ) => {
    setLoading(requestId);
    setError(null);

    const result = await acceptBookingRequest(requestId, selectedTime, duration);

    if (!result.success) {
      // Handle overlap error specially - close modal and show message
      if (result.isOverlapError) {
        setConfirmModalRequest(null);
        setError(result.error || "That time was just taken. Please pick another slot.");
        router.refresh(); // Refresh to update availability
      } else {
        setError(result.error || "Failed to confirm lesson");
      }
    } else {
      setConfirmModalRequest(null);
      router.refresh();
    }

    setLoading(null);
  };

  const handleDecline = async (requestId: string, message?: string) => {
    setLoading(requestId);
    setError(null);

    const result = await declineBookingRequest(requestId, message);

    if (!result.success) {
      setError(result.error || "Failed to decline request");
    } else {
      setDeclineModalRequest(null);
      router.refresh();
    }

    setLoading(null);
  };

  if (requests.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-cb-text mb-4">
          Pending Requests
        </h2>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-cb-bg rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-cb-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-cb-text-secondary">
            No pending requests
          </p>
          <p className="text-xs text-cb-text-muted mt-1">
            New booking requests will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 flex flex-col" style={{ maxHeight: "400px" }}>
      <h2 className="text-lg font-semibold text-cb-text mb-4 flex-shrink-0">
        Pending Requests
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg flex-shrink-0 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0">⚠️</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-amber-600 hover:text-amber-800 flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      <div className="space-y-3 overflow-y-auto flex-1 pr-1">
        {requests.map((request) => {
          const isLegacyOnly = isLegacyOnlyRequest(request);
          const isReschedule = !!request.reschedule_of;
          const primaryTime = getPrimaryTime(request);

          // Format primary time for display
          let dateDisplay = "";
          let timeDisplay = "";
          if (primaryTime && primaryTime.isValid) {
            const d = new Date(primaryTime.datetime);
            dateDisplay = d.toLocaleDateString("en-US", {
              timeZone: timezone,
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            timeDisplay = d.toLocaleTimeString("en-US", {
              timeZone: timezone,
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
          }

          return (
            <div
              key={request.id}
              className="p-4 bg-cb-bg rounded-lg"
            >
              {/* Header: Student info + badge */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-coral-light flex items-center justify-center flex-shrink-0">
                    <span className="text-coral font-medium text-xs">
                      {request.student_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-cb-text truncate">
                        {request.student_name}
                      </p>
                      {isReschedule && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded flex-shrink-0">
                          Reschedule
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-cb-text-muted truncate">
                      {request.student_email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lesson details: Date, time, duration */}
              {primaryTime && primaryTime.isValid ? (
                <div className="flex items-center gap-4 mb-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-cb-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-cb-text font-medium">{dateDisplay}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-cb-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-cb-text font-medium">{timeDisplay}</span>
                  </div>
                  <span className="text-cb-text-muted">{primaryTime.duration} min</span>
                </div>
              ) : (
                <p className="text-xs text-cb-text-muted mb-3 italic">
                  {isLegacyOnly ? "Manual scheduling required" : "No time specified"}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {isLegacyOnly ? (
                  <div
                    className="flex-1 px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg cursor-not-allowed text-center"
                    title="This request uses free-text times. Please confirm manually."
                  >
                    Manual scheduling
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmModalRequest(request)}
                    disabled={loading === request.id}
                    className="flex-1 px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {loading === request.id ? "..." : "Confirm lesson"}
                  </button>
                )}
                <button
                  onClick={() => setDeclineModalRequest(request)}
                  disabled={loading === request.id}
                  className="px-3 py-2 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {confirmModalRequest && (
        <ConfirmModal
          request={confirmModalRequest}
          timezone={timezone}
          onClose={() => setConfirmModalRequest(null)}
          onConfirm={handleConfirm}
          isLoading={loading === confirmModalRequest.id}
        />
      )}

      {declineModalRequest && (
        <DeclineModal
          request={declineModalRequest}
          onClose={() => setDeclineModalRequest(null)}
          onDecline={handleDecline}
          isLoading={loading === declineModalRequest.id}
        />
      )}
    </div>
  );
}
