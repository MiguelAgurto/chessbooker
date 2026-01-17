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
    <div className="px-4 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Booking Requests</h1>
      <RequestsTable requests={requests || []} />
    </div>
  );
}
