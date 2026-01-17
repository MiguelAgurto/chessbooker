import { createClient } from "@/lib/supabase/server";
import RequestsTable from "./RequestsTable";

export default async function RequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: requests } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("coach_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-display text-3xl text-cb-text mb-8">Booking Requests</h1>
      <RequestsTable requests={requests || []} />
    </div>
  );
}
