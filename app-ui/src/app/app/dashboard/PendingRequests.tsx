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
  duration_minutes: number;
  requested_times: (string | SlotData)[];
  preferred_time_1?: string | null;
  preferred_time_2?: string | null;
  preferred_time_3?: string | null;
  created_at: string;
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

interface AcceptModalProps {
  request: PendingRequest;
  timezone: string;
  onClose: () => void;
  onAccept: (requestId: string, selectedTime: string, duration: number) => Promise<void>;
  isLoading: boolean;
}

function AcceptModal({
  request,
  timezone,
  onClose,
  onAccept,
  isLoading,
}: AcceptModalProps) {
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(0);

  const times = getAvailableTimes(request);

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
  const { isValid: selectedIsValid } = selectedTime ? getTimeData(selectedTime) : { isValid: false };

  const handleAccept = async () => {
    if (!selectedIsValid) return;
    const selected = times[selectedTimeIndex];
    const { datetime, duration } = getTimeData(selected);
    await onAccept(request.id, datetime, duration);
  };

  const formatTimeDisplay = (time: string | SlotData): string => {
    const { datetime, isValid } = getTimeData(time);
    if (isValid) {
      return formatDateTimeForCoach(datetime, timezone);
    }
    // For non-ISO values, display as-is (legacy free-text format)
    return typeof time === "string" ? time : time.datetime;
  };

  if (times.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
          <h3 className="text-lg font-semibold text-cb-text mb-2">
            No Times Available
          </h3>
          <p className="text-sm text-cb-text-secondary mb-4">
            This booking request has no proposed times. Manual scheduling is required.
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
        <h3 className="text-lg font-semibold text-cb-text mb-2">
          Accept Booking
        </h3>
        <p className="text-sm text-cb-text-secondary mb-4">
          Select a time for the session with{" "}
          <strong>{request.student_name}</strong>
        </p>

        <div className="space-y-2 mb-4">
          {times.map((time, index) => {
            const { duration, isValid } = getTimeData(time);
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
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
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
                    {formatTimeDisplay(time)}
                  </p>
                  <p className="text-xs text-cb-text-muted">
                    {duration} min
                    {!isValid && (
                      <span className="ml-2 text-amber-600">(not a valid timestamp)</span>
                    )}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        {!selectedIsValid && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">
              The selected time is not a valid ISO timestamp. Manual scheduling is needed - please coordinate with the student directly.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-medium text-cb-text-secondary border border-cb-border rounded-lg hover:bg-cb-bg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={isLoading || !selectedIsValid}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Accepting..." : "Accept"}
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
  const [acceptModalRequest, setAcceptModalRequest] =
    useState<PendingRequest | null>(null);

  const handleAccept = async (
    requestId: string,
    selectedTime: string,
    duration: number
  ) => {
    setLoading(requestId);
    setError(null);

    const result = await acceptBookingRequest(requestId, selectedTime, duration);

    if (!result.success) {
      setError(result.error || "Failed to accept booking");
    } else {
      setAcceptModalRequest(null);
      router.refresh();
    }

    setLoading(null);
  };

  const handleDecline = async (requestId: string) => {
    if (!confirm("Are you sure you want to decline this request?")) {
      return;
    }

    setLoading(requestId);
    setError(null);

    const result = await declineBookingRequest(requestId);

    if (!result.success) {
      setError(result.error || "Failed to decline booking");
    } else {
      router.refresh();
    }

    setLoading(null);
  };

  const formatRequestedTime = (time: string | SlotData): string => {
    const datetime = typeof time === "string" ? time : time.datetime;
    const duration = typeof time === "object" ? time.duration_minutes : null;

    if (isValidISOTimestamp(datetime)) {
      const formatted = formatDateTimeForCoach(datetime, timezone);
      return duration ? `${formatted} (${duration} min)` : formatted;
    }
    // Return as-is for legacy free-text format
    return duration ? `${datetime} (${duration} min)` : datetime;
  };

  if (requests.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-cb-text mb-4">
          Pending Requests
        </h2>
        <p className="text-sm text-cb-text-secondary text-center py-4">
          No pending requests
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-cb-text mb-4">
        Pending Requests
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {requests.map((request) => {
          const times = getAvailableTimes(request);

          return (
            <div
              key={request.id}
              className="p-4 bg-cb-bg rounded-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cb-text">
                    {request.student_name}
                  </p>
                  <p className="text-xs text-cb-text-muted truncate">
                    {request.student_email}
                  </p>
                  <p className="text-xs text-cb-text-secondary mt-1">
                    {request.duration_minutes} min session
                  </p>

                  <div className="mt-2">
                    <p className="text-xs font-medium text-cb-text-secondary mb-1">
                      Requested times:
                    </p>
                    {times.length > 0 ? (
                      <ul className="space-y-0.5">
                        {times.map((time, i) => (
                          <li key={i} className="text-xs text-cb-text-muted">
                            {formatRequestedTime(time)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-cb-text-muted italic">
                        No times specified
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 sm:flex-col">
                  <button
                    onClick={() => setAcceptModalRequest(request)}
                    disabled={loading === request.id}
                    className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(request.id)}
                    disabled={loading === request.id}
                    className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {loading === request.id ? "..." : "Decline"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {acceptModalRequest && (
        <AcceptModal
          request={acceptModalRequest}
          timezone={timezone}
          onClose={() => setAcceptModalRequest(null)}
          onAccept={handleAccept}
          isLoading={loading === acceptModalRequest.id}
        />
      )}
    </div>
  );
}
