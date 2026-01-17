"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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

export default function RequestsTable({ requests }: { requests: BookingRequest[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "declined":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (requests.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
        No booking requests yet. Share your booking link with students!
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {error && (
        <div className="p-3 bg-red-50 text-red-800 text-sm border-b border-red-100">
          {error}
        </div>
      )}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Student
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Requested Times
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {requests.map((request) => (
            <tr key={request.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{request.student_name}</div>
                <div className="text-sm text-gray-500">{request.student_email}</div>
                <div className="text-xs text-gray-400">{request.student_timezone}</div>
              </td>
              <td className="px-6 py-4">
                <ul className="text-sm text-gray-900 space-y-1">
                  {(request.requested_times || []).map((time, i) => (
                    <li key={i} className="truncate max-w-xs">
                      {formatRequestedTime(time)}
                    </li>
                  ))}
                </ul>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(
                    request.status
                  )}`}
                >
                  {request.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(request.created_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                {request.status === "pending" && (
                  <>
                    <button
                      onClick={() => updateStatus(request.id, "accepted")}
                      disabled={loading === request.id}
                      className="text-green-600 hover:text-green-900 disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => updateStatus(request.id, "declined")}
                      disabled={loading === request.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </>
                )}
                {request.status !== "pending" && (
                  <button
                    onClick={() => updateStatus(request.id, "pending")}
                    disabled={loading === request.id}
                    className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
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
  );
}
