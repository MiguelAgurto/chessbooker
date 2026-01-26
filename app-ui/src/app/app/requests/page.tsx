import { createClient } from "@/lib/supabase/server";
import RequestsTable from "./RequestsTable";

export default async function RequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch actionable pending requests only
  // status = 'pending' AND (expires_at is null OR expires_at > now)
  const { data: pendingRequests } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("coach_id", user!.id)
    .eq("status", "pending")
    .or("expires_at.is.null,expires_at.gt.now()")
    .order("created_at", { ascending: false });

  // Fetch confirmed sessions (for the Confirmed tab)
  const { data: confirmedRequests } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("coach_id", user!.id)
    .eq("status", "confirmed")
    .order("scheduled_start", { ascending: true });

  // Fetch resolved/history requests (expired, declined, cancelled)
  const { data: resolvedRequests } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("coach_id", user!.id)
    .in("status", ["expired", "declined", "cancelled"])
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="font-display text-3xl text-cb-text mb-8">Booking Requests</h1>
      <RequestsTable
        pendingRequests={pendingRequests || []}
        confirmedRequests={confirmedRequests || []}
        resolvedRequests={resolvedRequests || []}
      />
    </div>
  );
}
