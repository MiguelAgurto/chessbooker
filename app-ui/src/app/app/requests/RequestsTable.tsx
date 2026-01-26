"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateBookingStatus, cancelBooking, rescheduleBooking } from "./actions";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-xs px-2 py-1 rounded border border-cb-border hover:border-coral hover:text-coral transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

interface SlotData {
  datetime: string;
  duration_minutes: number;
}

interface BookingRequest {
  id: string;
  coach_id: string;
  student_name: string;
  student_email: string;
  student_timezone: string;
  requested_times: (string | SlotData)[];
  status: string;
  created_at: string;
  meeting_url?: string | null;
  calendar_event_id?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  expires_at?: string | null;
}

interface RescheduleModalProps {
  booking: BookingRequest;
  onClose: () => void;
  onReschedule: (bookingId: string, newDateTime: string, durationMinutes: number) => Promise<void>;
  isLoading: boolean;
}

function RescheduleModal({ booking, onClose, onReschedule, isLoading }: RescheduleModalProps) {
  const timeSlot = booking.requested_times?.[0];
  const currentDuration = typeof timeSlot === "object" && timeSlot?.duration_minutes
    ? timeSlot.duration_minutes
    : 60;

  const currentDatetime = typeof timeSlot === "string"
    ? timeSlot
    : (timeSlot?.datetime || null);

  const formatForInput = (isoString: string | null): string => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [newDateTime, setNewDateTime] = useState(formatForInput(currentDatetime));
  const [duration, setDuration] = useState(currentDuration);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDateTime) return;
    const dateObj = new Date(newDateTime);
    await onReschedule(booking.id, dateObj.toISOString(), duration);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-cb-text mb-4">Reschedule Session</h3>
        <p className="text-sm text-cb-text-secondary mb-4">
          Reschedule session with <strong>{booking.student_name}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cb-text mb-1">New Date & Time</label>
            <input
              type="datetime-local"
              value={newDateTime}
              onChange={(e) => setNewDateTime(e.target.value)}
              className="w-full px-3 py-2 border border-cb-border rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-cb-text mb-1">Duration (minutes)</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-cb-border rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
              <option value={120}>120 minutes</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-cb-text-secondary border border-cb-border rounded-lg hover:bg-cb-bg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !newDateTime}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-coral rounded-lg hover:bg-coral-dark transition-colors disabled:opacity-50"
            >
              {isLoading ? "Rescheduling..." : "Reschedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatRequestedTime(time: string | SlotData): string {
  if (typeof time === "string") {
    return time;
  }
  if (time && typeof time === "object" && time.datetime) {
    const date = new Date(time.datetime);
    const formatted = date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${formatted} (${time.duration_minutes} min)`;
  }
  return String(time);
}

function getSessionDateTime(request: BookingRequest): Date | null {
  const time = request.requested_times?.[0];
  if (!time) return null;
  if (typeof time === "string") {
    return new Date(time);
  }
  if (time && typeof time === "object" && time.datetime) {
    return new Date(time.datetime);
  }
  return null;
}

function getDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const sessionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (sessionDate.getTime() === today.getTime()) {
    return "Today";
  }
  if (sessionDate.getTime() === tomorrow.getTime()) {
    return "Tomorrow";
  }
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function getGoogleCalendarUrl(sessionDate: Date | null): string {
  if (!sessionDate || isNaN(sessionDate.getTime())) {
    return "https://calendar.google.com/calendar/u/0/r";
  }
  const startStr = formatDateYYYYMMDD(sessionDate);
  const nextDay = new Date(sessionDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const endStr = formatDateYYYYMMDD(nextDay);
  return `https://calendar.google.com/calendar/u/0/r?tab=mc&mode=day&dates=${startStr}/${endStr}`;
}

function groupSessionsByDate(requests: BookingRequest[]): Map<string, BookingRequest[]> {
  const grouped = new Map<string, BookingRequest[]>();
  const sorted = [...requests].sort((a, b) => {
    const dateA = getSessionDateTime(a);
    const dateB = getSessionDateTime(b);
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
  });

  for (const request of sorted) {
    const sessionDate = getSessionDateTime(request);
    if (!sessionDate) continue;
    const label = getDateLabel(sessionDate);
    if (!grouped.has(label)) {
      grouped.set(label, []);
    }
    grouped.get(label)!.push(request);
  }

  return grouped;
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "pending":
      return "bg-coral-light text-coral";
    case "confirmed":
    case "accepted":
      return "bg-green-50 text-green-700";
    case "declined":
      return "bg-red-50 text-red-700";
    case "expired":
      return "bg-gray-100 text-gray-500";
    case "cancelled":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-cb-bg text-cb-text-secondary";
  }
}

type TabKey = "pending" | "confirmed" | "history";

interface RequestsTableProps {
  pendingRequests: BookingRequest[];
  confirmedRequests: BookingRequest[];
  resolvedRequests: BookingRequest[];
}

export default function RequestsTable({
  pendingRequests,
  confirmedRequests,
  resolvedRequests,
}: RequestsTableProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rescheduleBookingData, setRescheduleBookingData] = useState<BookingRequest | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("pending");

  const updateStatus = async (id: string, status: string) => {
    setLoading(id);
    setError(null);
    const result = await updateBookingStatus(id, status);
    if (!result.success) {
      setError(`Failed to update: ${result.error}`);
    } else {
      router.refresh();
    }
    setLoading(null);
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this session? The student will be notified.")) {
      return;
    }
    setLoading(id);
    setError(null);
    const result = await cancelBooking(id);
    if (!result.success) {
      setError(`Failed to cancel: ${result.error}`);
    } else {
      router.refresh();
    }
    setLoading(null);
  };

  const handleReschedule = async (bookingId: string, newDateTime: string, durationMinutes: number) => {
    setLoading(bookingId);
    setError(null);
    const result = await rescheduleBooking(bookingId, newDateTime, durationMinutes);
    if (!result.success) {
      setError(`Failed to reschedule: ${result.error}`);
    } else {
      setRescheduleBookingData(null);
      router.refresh();
    }
    setLoading(null);
  };

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "pending", label: "Pending", count: pendingRequests.length },
    { key: "confirmed", label: "Confirmed", count: confirmedRequests.length },
    { key: "history", label: "History", count: resolvedRequests.length },
  ];

  const totalRequests = pendingRequests.length + confirmedRequests.length + resolvedRequests.length;

  if (totalRequests === 0) {
    return (
      <div className="card p-6 text-center text-cb-text-secondary">
        No booking requests yet. Share your booking link with students!
      </div>
    );
  }

  return (
    <div>
      {/* Tab navigation */}
      <div className="flex gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.key
                ? "bg-coral text-white"
                : "bg-white text-cb-text-secondary border border-cb-border hover:border-coral hover:text-coral"
            }`}
          >
            {tab.label}
            <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
              activeTab === tab.key
                ? "bg-white/20 text-white"
                : "bg-cb-bg text-cb-text-muted"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-800 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Pending Tab */}
      {activeTab === "pending" && (
        pendingRequests.length === 0 ? (
          <div className="card p-6 text-center text-cb-text-secondary">
            No pending requests
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-cb-border-light">
              <thead className="bg-cb-bg">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-cb-text-secondary uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-cb-text-secondary uppercase tracking-wider">
                    Requested Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-cb-text-secondary uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-cb-text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-cb-border-light">
                {pendingRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-cb-bg transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-cb-text">{request.student_name}</div>
                      <div className="text-sm text-cb-text-secondary">{request.student_email}</div>
                      <div className="text-xs text-cb-text-muted">{request.student_timezone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <ul className="text-sm text-cb-text space-y-1">
                        {(request.requested_times || []).map((time, i) => (
                          <li key={i} className="truncate max-w-xs">
                            {formatRequestedTime(time)}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-cb-text-secondary">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => updateStatus(request.id, "accepted")}
                        disabled={loading === request.id}
                        className="text-green-600 hover:text-green-700 font-semibold transition-colors disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => updateStatus(request.id, "declined")}
                        disabled={loading === request.id}
                        className="text-red-500 hover:text-red-700 font-semibold transition-colors disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Confirmed Tab - Grouped by date */}
      {activeTab === "confirmed" && (
        confirmedRequests.length === 0 ? (
          <div className="card p-6 text-center text-cb-text-secondary">
            No confirmed sessions yet
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(groupSessionsByDate(confirmedRequests).entries()).map(([dateLabel, sessions]) => (
              <div key={dateLabel}>
                <h3 className="text-sm font-semibold text-cb-text-secondary uppercase tracking-wider mb-3">
                  {dateLabel}
                </h3>
                <div className="space-y-3">
                  {sessions.map((session) => {
                    const timeSlot = session.requested_times?.[0];
                    const duration = typeof timeSlot === "object" && timeSlot?.duration_minutes
                      ? timeSlot.duration_minutes
                      : 60;
                    const sessionDatetimeStr = typeof timeSlot === "string"
                      ? timeSlot
                      : (timeSlot?.datetime || null);
                    const sessionTime = sessionDatetimeStr ? new Date(sessionDatetimeStr) : null;

                    return (
                      <div key={session.id} className="card p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                              <span className="text-green-600 font-semibold text-sm">
                                {sessionTime?.toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-cb-text">{session.student_name}</div>
                              <div className="text-sm text-cb-text-secondary">{duration} min session</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-cb-text-muted">{session.student_email}</div>
                            <div className="flex gap-2 justify-end mt-1">
                              <button
                                onClick={() => setRescheduleBookingData(session)}
                                disabled={loading === session.id}
                                className="text-xs text-coral hover:text-coral-dark transition-colors"
                              >
                                Reschedule
                              </button>
                              <button
                                onClick={() => handleCancel(session.id)}
                                disabled={loading === session.id}
                                className="text-xs text-red-500 hover:text-red-700 transition-colors"
                              >
                                {loading === session.id ? "..." : "Cancel"}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Session link section */}
                        <div className="mt-4 pt-4 border-t border-cb-border-light">
                          <div className="text-xs font-semibold text-cb-text-secondary uppercase tracking-wider mb-2">
                            Session Link
                          </div>
                          {session.meeting_url ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-2 text-sm">
                                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                                <span className="text-cb-text-secondary">Google Meet</span>
                              </div>
                              <a
                                href={session.meeting_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs px-2 py-1 rounded bg-coral text-white hover:bg-coral-dark transition-colors"
                              >
                                Open
                              </a>
                              <CopyButton text={session.meeting_url} />
                            </div>
                          ) : (
                            <div className="text-sm text-cb-text-muted">
                              Meeting link will appear here once created.
                            </div>
                          )}

                          {session.calendar_event_id && (
                            <div className="mt-3">
                              <a
                                href={getGoogleCalendarUrl(sessionTime)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded border border-cb-border hover:border-coral hover:text-coral transition-colors"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                  <line x1="16" y1="2" x2="16" y2="6"/>
                                  <line x1="8" y1="2" x2="8" y2="6"/>
                                  <line x1="3" y1="10" x2="21" y2="10"/>
                                </svg>
                                Open in Google Calendar
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* History Tab - Read-only list */}
      {activeTab === "history" && (
        resolvedRequests.length === 0 ? (
          <div className="card p-6 text-center text-cb-text-secondary">
            No history yet
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-cb-border-light">
              <thead className="bg-cb-bg">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-cb-text-secondary uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-cb-text-secondary uppercase tracking-wider">
                    Requested Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-cb-text-secondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-cb-text-secondary uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-cb-border-light">
                {resolvedRequests.map((request) => (
                  <tr key={request.id} className="opacity-60">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-cb-text">{request.student_name}</div>
                      <div className="text-sm text-cb-text-secondary">{request.student_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <ul className="text-sm text-cb-text space-y-1">
                        {(request.requested_times || []).slice(0, 1).map((time, i) => (
                          <li key={i} className="truncate max-w-xs">
                            {formatRequestedTime(time)}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-cb-text-secondary">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Reschedule Modal */}
      {rescheduleBookingData && (
        <RescheduleModal
          booking={rescheduleBookingData}
          onClose={() => setRescheduleBookingData(null)}
          onReschedule={handleReschedule}
          isLoading={loading === rescheduleBookingData.id}
        />
      )}
    </div>
  );
}
