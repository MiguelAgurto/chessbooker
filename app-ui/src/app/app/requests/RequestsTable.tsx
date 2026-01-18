"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

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
}

function formatRequestedTime(time: string | SlotData): string {
  if (typeof time === "string") {
    // Legacy format or plain string
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

function groupSessionsByDate(requests: BookingRequest[]): Map<string, BookingRequest[]> {
  const grouped = new Map<string, BookingRequest[]>();

  // Sort by session datetime first
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

type StatusFilter = "pending" | "accepted" | "declined" | "all";

export default function RequestsTable({ requests }: { requests: BookingRequest[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get initial filter from URL params, default to "pending"
  const urlStatus = searchParams.get("status") as StatusFilter | null;
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    urlStatus && ["pending", "accepted", "declined", "all"].includes(urlStatus) ? urlStatus : "pending"
  );

  // Filter requests based on selected status
  const filteredRequests = statusFilter === "all"
    ? requests
    : requests.filter((r) => r.status === statusFilter);

  // Count requests by status
  const counts = {
    pending: requests.filter((r) => r.status === "pending").length,
    accepted: requests.filter((r) => r.status === "accepted").length,
    declined: requests.filter((r) => r.status === "declined").length,
    all: requests.length,
  };

  const updateStatus = async (id: string, status: string) => {
    setLoading(id);
    setError(null);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("booking_requests")
      .update({ status })
      .eq("id", id);

    if (updateError) {
      console.error("Failed to update status:", updateError);
      setError(`Failed to update: ${updateError.message}`);
    } else {
      router.refresh();
    }

    setLoading(null);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-coral-light text-coral";
      case "accepted":
        return "bg-green-50 text-green-700";
      case "declined":
        return "bg-red-50 text-red-700";
      default:
        return "bg-cb-bg text-cb-text-secondary";
    }
  };

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "accepted", label: "Confirmed" },
    { key: "declined", label: "Declined" },
    { key: "all", label: "All" },
  ];

  if (requests.length === 0) {
    return (
      <div className="card p-6 text-center text-cb-text-secondary">
        No booking requests yet. Share your booking link with students!
      </div>
    );
  }

  return (
    <div>
      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === tab.key
                ? "bg-coral text-white"
                : "bg-white text-cb-text-secondary border border-cb-border hover:border-coral hover:text-coral"
            }`}
          >
            {tab.label}
            <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
              statusFilter === tab.key
                ? "bg-white/20 text-white"
                : "bg-cb-bg text-cb-text-muted"
            }`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {filteredRequests.length === 0 ? (
        <div className="card p-6 text-center text-cb-text-secondary">
          {statusFilter === "pending" && "No pending requests"}
          {statusFilter === "accepted" && "No confirmed sessions yet"}
          {statusFilter === "declined" && "No declined requests"}
          {statusFilter === "all" && "No requests"}
        </div>
      ) : statusFilter === "accepted" ? (
        // Grouped sessions view for confirmed sessions
        <div className="space-y-6">
          {Array.from(groupSessionsByDate(filteredRequests).entries()).map(([dateLabel, sessions]) => (
            <div key={dateLabel}>
              <h3 className="text-sm font-semibold text-cb-text-secondary uppercase tracking-wider mb-3">
                {dateLabel}
              </h3>
              <div className="space-y-3">
                {sessions.map((session) => {
                  const sessionTime = getSessionDateTime(session);
                  const timeSlot = session.requested_times?.[0];
                  const duration = typeof timeSlot === "object" && timeSlot?.duration_minutes
                    ? timeSlot.duration_minutes
                    : 60;

                  return (
                    <div
                      key={session.id}
                      className="card p-4 flex items-center justify-between"
                    >
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
                          <div className="text-sm font-medium text-cb-text">
                            {session.student_name}
                          </div>
                          <div className="text-sm text-cb-text-secondary">
                            {duration} min session
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-cb-text-muted">
                          {session.student_email}
                        </div>
                        <button
                          onClick={() => updateStatus(session.id, "pending")}
                          disabled={loading === session.id}
                          className="text-xs text-cb-text-muted hover:text-cb-text transition-colors mt-1"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
      <div className="card overflow-hidden">
      {error && (
        <div className="p-4 bg-red-50 text-red-800 text-sm border-b border-red-200">
          {error}
        </div>
      )}
      <table className="min-w-full divide-y divide-cb-border-light">
        <thead className="bg-cb-bg">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-cb-text-secondary uppercase tracking-wider">
              Student
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-cb-text-secondary uppercase tracking-wider">
              Requested Times
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-cb-text-secondary uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-cb-text-secondary uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-cb-text-secondary uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-cb-border-light">
          {filteredRequests.map((request) => (
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
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(
                    request.status
                  )}`}
                >
                  {request.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-cb-text-secondary">
                {new Date(request.created_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                {request.status === "pending" && (
                  <>
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
                  </>
                )}
                {request.status !== "pending" && (
                  <button
                    onClick={() => updateStatus(request.id, "pending")}
                    disabled={loading === request.id}
                    className="text-cb-text-secondary hover:text-cb-text font-semibold transition-colors disabled:opacity-50"
                  >
                    Reset
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
      )}
    </div>
  );
}
