"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTimeForCoach } from "@/lib/timezone";
import { acceptBookingRequest, declineBookingRequest, updateCoachPaymentDefaults } from "./actions";

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

export interface PaymentDefaults {
  default_payment_method?: string | null;
  default_payment_instructions?: string | null;
  default_payment_link?: string | null;
  default_payment_due?: string | null;
}

export interface PaymentData {
  payment_method?: string;
  payment_instructions?: string;
  payment_link?: string;
  payment_due?: string;
}

interface PendingRequestsProps {
  requests: PendingRequest[];
  timezone: string;
  isGoogleConnected?: boolean;
  paymentDefaults?: PaymentDefaults;
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
  onConfirm: (requestId: string, selectedTime: string, duration: number, manualMeetingUrl?: string, paymentData?: PaymentData, saveAsDefault?: boolean) => Promise<void>;
  isLoading: boolean;
  isGoogleConnected: boolean;
  paymentDefaults?: PaymentDefaults;
}

const PAYMENT_METHODS = [
  { value: "", label: "Select payment method..." },
  { value: "paypal", label: "PayPal" },
  { value: "stripe", label: "Stripe" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

const PAYMENT_DUE_OPTIONS = [
  { value: "", label: "When is payment due?" },
  { value: "before_lesson", label: "Before the lesson" },
  { value: "at_start", label: "At the start of the lesson" },
  { value: "after_lesson", label: "After the lesson" },
  { value: "custom", label: "Custom (see instructions)" },
];

/**
 * Validate that a string is a valid URL
 */
function isValidUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function ConfirmModal({
  request,
  timezone,
  onClose,
  onConfirm,
  isLoading,
  isGoogleConnected,
  paymentDefaults,
}: ConfirmModalProps) {
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(0);
  const [manualMeetingUrl, setManualMeetingUrl] = useState("");

  // Payment fields - prefilled from coach defaults
  const [paymentMethod, setPaymentMethod] = useState(paymentDefaults?.default_payment_method || "");
  const [paymentDue, setPaymentDue] = useState(paymentDefaults?.default_payment_due || "");
  const [paymentLink, setPaymentLink] = useState(paymentDefaults?.default_payment_link || "");
  const [paymentInstructions, setPaymentInstructions] = useState(paymentDefaults?.default_payment_instructions || "");
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [showPaymentSection, setShowPaymentSection] = useState(false);

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
    // If Google is not connected, require a valid meeting URL
    if (!isGoogleConnected && !isValidUrl(manualMeetingUrl)) return;
    const selected = times[selectedTimeIndex];
    const { datetime, duration } = getTimeData(selected);

    // Build payment data only if any payment field is filled
    const hasPaymentData = paymentMethod || paymentDue || paymentLink || paymentInstructions;
    const paymentData: PaymentData | undefined = hasPaymentData
      ? {
          payment_method: paymentMethod || undefined,
          payment_due: paymentDue || undefined,
          payment_link: paymentLink || undefined,
          payment_instructions: paymentInstructions || undefined,
        }
      : undefined;

    await onConfirm(
      request.id,
      datetime,
      duration,
      isGoogleConnected ? undefined : manualMeetingUrl,
      paymentData,
      saveAsDefault
    );
  };

  // Determine if confirm button should be enabled
  const canConfirm = selectedIsValid && (isGoogleConnected || isValidUrl(manualMeetingUrl));

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

  // Get display info for selected time
  const selectedTimeDisplay = selectedTime ? formatTimeDisplay(selectedTime) : { date: "", time: "" };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-cb-text mb-4">
          {isReschedule ? "Confirm rescheduled lesson" : "Confirm lesson"}
        </h3>

        {/* Lesson summary with icons */}
        <div className="bg-cb-bg rounded-lg p-4 mb-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-cb-text-muted">👤</span>
            <span className="text-sm text-cb-text font-medium">{request.student_name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-cb-text-muted">📅</span>
            <span className="text-sm text-cb-text font-medium">{selectedTimeDisplay.date}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-cb-text-muted">🕒</span>
            <span className="text-sm text-cb-text font-medium">{selectedTimeDisplay.time}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-cb-text-muted">⏱️</span>
            <span className="text-sm text-cb-text font-medium">{selectedDuration} minutes</span>
          </div>
        </div>

        {/* Time selection (only if multiple options) */}
        {times.length > 1 && (
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

        {/* Manual meeting link input when Google is not connected */}
        {!isGoogleConnected && (
          <div className="mb-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-3">
              <p className="text-xs text-blue-700">
                Google Calendar is not connected. Please provide your meeting link below.
              </p>
            </div>
            <label htmlFor="meetingUrl" className="text-xs font-medium text-cb-text-muted mb-1.5 block">
              Meeting link <span className="text-red-500">*</span>
            </label>
            <input
              id="meetingUrl"
              type="url"
              value={manualMeetingUrl}
              onChange={(e) => setManualMeetingUrl(e.target.value)}
              placeholder="https://meet.google.com/... or https://zoom.us/..."
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent ${
                manualMeetingUrl && !isValidUrl(manualMeetingUrl)
                  ? "border-red-300 bg-red-50"
                  : "border-cb-border"
              }`}
            />
            {manualMeetingUrl && !isValidUrl(manualMeetingUrl) && (
              <p className="text-xs text-red-500 mt-1">Please enter a valid URL</p>
            )}
            <p className="text-xs text-cb-text-muted mt-1">
              Zoom, Google Meet, Discord, or any video call link
            </p>
          </div>
        )}

        {/* Payment Instructions Section */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowPaymentSection(!showPaymentSection)}
            className="flex items-center gap-2 text-sm font-medium text-cb-text-secondary hover:text-cb-text transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showPaymentSection ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Payment instructions
            {(paymentMethod || paymentLink || paymentInstructions) && (
              <span className="w-2 h-2 rounded-full bg-green-500" title="Payment info added" />
            )}
          </button>

          {showPaymentSection && (
            <div className="mt-3 p-4 bg-cb-bg rounded-lg space-y-3">
              {/* Payment Method */}
              <div>
                <label htmlFor="paymentMethod" className="text-xs font-medium text-cb-text-muted mb-1.5 block">
                  Payment method
                </label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-cb-border rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent bg-white"
                >
                  {PAYMENT_METHODS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Due */}
              <div>
                <label htmlFor="paymentDue" className="text-xs font-medium text-cb-text-muted mb-1.5 block">
                  Payment due
                </label>
                <select
                  id="paymentDue"
                  value={paymentDue}
                  onChange={(e) => setPaymentDue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-cb-border rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent bg-white"
                >
                  {PAYMENT_DUE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Link */}
              <div>
                <label htmlFor="paymentLink" className="text-xs font-medium text-cb-text-muted mb-1.5 block">
                  Payment link (optional)
                </label>
                <input
                  id="paymentLink"
                  type="url"
                  value={paymentLink}
                  onChange={(e) => setPaymentLink(e.target.value)}
                  placeholder="https://paypal.me/... or payment page URL"
                  className="w-full px-3 py-2 text-sm border border-cb-border rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
                />
              </div>

              {/* Payment Instructions */}
              <div>
                <label htmlFor="paymentInstructions" className="text-xs font-medium text-cb-text-muted mb-1.5 block">
                  Additional instructions (optional)
                </label>
                <textarea
                  id="paymentInstructions"
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  placeholder="e.g., Please include your name in the payment reference..."
                  className="w-full px-3 py-2 text-sm border border-cb-border rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
                  rows={2}
                />
              </div>

              {/* Save as default checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAsDefault}
                  onChange={(e) => setSaveAsDefault(e.target.checked)}
                  className="w-4 h-4 rounded border-cb-border text-coral focus:ring-coral"
                />
                <span className="text-xs text-cb-text-secondary">
                  Save as my default payment method
                </span>
              </label>
            </div>
          )}
        </div>

        <p className="text-xs text-cb-text-muted mb-4">
          All times are shown in your timezone. The student will receive a confirmation email.
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
            disabled={isLoading || !canConfirm}
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
          Decline lesson
        </h3>
        <p className="text-sm text-cb-text-secondary mb-4">
          {request.student_name} will be notified that the requested time isn&apos;t available.
        </p>

        <div className="mb-4">
          <label htmlFor="declineMessage" className="text-xs font-medium text-cb-text-muted mb-1.5 block">
            Optional message to student
          </label>
          <textarea
            id="declineMessage"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Sorry — I'm not available at this time."
            className="w-full px-3 py-2 text-sm border border-cb-border rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
            rows={3}
          />
        </div>

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
            {isLoading ? "Declining..." : "Decline lesson"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PendingRequests({
  requests,
  timezone,
  isGoogleConnected = false,
  paymentDefaults,
}: PendingRequestsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScopeError, setIsScopeError] = useState(false);
  const [confirmModalRequest, setConfirmModalRequest] = useState<PendingRequest | null>(null);
  const [declineModalRequest, setDeclineModalRequest] = useState<PendingRequest | null>(null);

  const handleConfirm = async (
    requestId: string,
    selectedTime: string,
    duration: number,
    manualMeetingUrl?: string,
    paymentData?: PaymentData,
    saveAsDefault?: boolean
  ) => {
    setLoading(requestId);
    setError(null);
    setIsScopeError(false);

    // If saveAsDefault is checked, update coach defaults first
    if (saveAsDefault && paymentData) {
      await updateCoachPaymentDefaults({
        default_payment_method: paymentData.payment_method,
        default_payment_instructions: paymentData.payment_instructions,
        default_payment_link: paymentData.payment_link,
        default_payment_due: paymentData.payment_due,
      });
    }

    const result = await acceptBookingRequest(requestId, selectedTime, duration, manualMeetingUrl, paymentData);

    if (!result.success) {
      // Handle overlap error specially - close modal and show message
      if (result.isOverlapError) {
        setConfirmModalRequest(null);
        setError(result.error || "That time was just taken. Please pick another slot.");
        router.refresh(); // Refresh to update availability
      } else if (result.isInsufficientScopes) {
        // Handle insufficient scopes - close modal and show link to Settings
        setConfirmModalRequest(null);
        setError("Your Google Calendar connection needs updated permissions to create lesson events.");
        setIsScopeError(true);
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
          <div className="flex items-start gap-2 flex-1">
            <span className="flex-shrink-0">⚠️</span>
            <div>
              <span>{error}</span>
              {isScopeError && (
                <div className="mt-2">
                  <a
                    href="/app/settings"
                    className="inline-flex items-center gap-1 text-sm font-medium text-coral hover:text-coral-dark underline"
                  >
                    Go to Settings to reconnect
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => { setError(null); setIsScopeError(false); }}
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
                <div className="mb-3">
                  <div className="flex items-center gap-5 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-cb-text-muted">📅</span>
                      <span className="text-cb-text font-medium">{dateDisplay}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-cb-text-muted">🕒</span>
                      <span className="text-cb-text font-medium">{timeDisplay}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-cb-text-muted">⏱️</span>
                      <span className="text-cb-text font-medium">{primaryTime.duration} min</span>
                    </div>
                  </div>
                  <p className="text-xs text-cb-text-muted mt-1">Your time</p>
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
                  Decline lesson
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
          isGoogleConnected={isGoogleConnected}
          paymentDefaults={paymentDefaults}
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
