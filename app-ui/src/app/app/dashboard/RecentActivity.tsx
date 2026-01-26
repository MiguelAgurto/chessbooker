"use client";

import { getRelativeTimeAgo } from "@/lib/timezone";

interface NotificationEvent {
  id: string;
  event_type: string;
  student_name: string;
  student_email: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface RecentActivityProps {
  events: NotificationEvent[];
  timezone: string;
}

function getEventIcon(eventType: string): { icon: string; color: string } {
  switch (eventType) {
    case "request_created":
      return { icon: "📥", color: "bg-blue-50" };
    case "request_confirmed":
      return { icon: "✅", color: "bg-green-50" };
    case "request_declined":
      return { icon: "❌", color: "bg-red-50" };
    case "request_expired":
      return { icon: "⏰", color: "bg-gray-50" };
    case "reschedule_requested":
      return { icon: "🔄", color: "bg-amber-50" };
    case "reschedule_confirmed":
      return { icon: "✅", color: "bg-green-50" };
    default:
      return { icon: "📋", color: "bg-gray-50" };
  }
}

function getEventLabel(eventType: string): string {
  switch (eventType) {
    case "request_created":
      return "New request";
    case "request_confirmed":
      return "Confirmed";
    case "request_declined":
      return "Declined";
    case "request_expired":
      return "Expired";
    case "reschedule_requested":
      return "Reschedule requested";
    case "reschedule_confirmed":
      return "Reschedule confirmed";
    default:
      return eventType;
  }
}

export default function RecentActivity({ events, timezone }: RecentActivityProps) {
  if (events.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-cb-text mb-3">Recent Activity</h3>
        <p className="text-xs text-cb-text-muted text-center py-4">
          No recent activity
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-cb-text mb-3">Recent Activity</h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {events.map((event) => {
          const { icon, color } = getEventIcon(event.event_type);
          const label = getEventLabel(event.event_type);
          const timeAgo = getRelativeTimeAgo(event.created_at, timezone);

          return (
            <div
              key={event.id}
              className={`flex items-start gap-2 p-2 rounded-lg ${color}`}
            >
              <span className="text-sm flex-shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-cb-text truncate">
                  {label} - {event.student_name}
                </p>
                <p className="text-xs text-cb-text-muted">{timeAgo}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
