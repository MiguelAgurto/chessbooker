import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: coach } = await supabase
    .from("coaches")
    .select("*")
    .eq("id", user!.id)
    .single();

  const { count: pendingCount } = await supabase
    .from("booking_requests")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", user!.id)
    .eq("status", "pending");

  const { count: confirmedCount } = await supabase
    .from("booking_requests")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", user!.id)
    .eq("status", "confirmed");

  const { data: availability } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("coach_id", user!.id);

  return (
    <div className="px-4 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">📬</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Requests
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {pendingCount || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link href="/app/requests" className="text-sm text-indigo-600 hover:text-indigo-900">
              View all requests
            </Link>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">✅</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Confirmed Sessions
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {confirmedCount || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">📅</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Availability Rules
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {availability?.length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link href="/app/settings" className="text-sm text-indigo-600 hover:text-indigo-900">
              Manage availability
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Your Public Booking Link</h2>
        <div className="flex items-center space-x-4">
          <code className="flex-1 bg-gray-100 px-4 py-2 rounded text-sm text-gray-800 break-all">
            /c/{coach?.slug}
          </code>
          <Link
            href={`/c/${coach?.slug}`}
            target="_blank"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Open
          </Link>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Share this link with students so they can request bookings.
        </p>
      </div>
    </div>
  );
}
