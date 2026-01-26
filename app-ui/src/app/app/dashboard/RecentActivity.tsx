import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getRelativeTimeAgo } from "@/lib/timezone";

interface RecentActivityProps {
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

export default async function RecentActivity({ timezone }: RecentActivityProps) {
  noStore();

  const supabase = await createClient();

  // RLS enforces coach_id filtering, no manual filter needed
  const { data: events } = await supabase
    .from("coach_notification_events")
    .select("created_at, event_type, entity_table, entity_id, metadata")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!events || events.length === 0) {
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
        {events.map((event, index) => {
          const { icon, color } = getEventIcon(event.event_type);
          const label = getEventLabel(event.event_type);
          const timeAgo = getRelativeTimeAgo(event.created_at, timezone);
          const metadata = event.metadata as Record<string, unknown> | null;
          const studentName = metadata?.student_name as string || "Student";

          return (
            <div
              key={`${event.entity_id}-${index}`}
              className={`flex items-start gap-2 p-2 rounded-lg ${color}`}
            >
              <span className="text-sm flex-shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-cb-text truncate">
                  {label} - {studentName}
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
