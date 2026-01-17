import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import BookingForm from "./BookingForm";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicBookingPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: coach } = await supabase
    .from("coaches")
    .select("id, name, timezone, pricing")
    .eq("slug", slug)
    .single();

  if (!coach) {
    notFound();
  }

  const { data: availability } = await supabase
    .from("availability_rules")
    .select("day_of_week, start_time, end_time")
    .eq("coach_id", coach.id)
    .order("day_of_week", { ascending: true });

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">♞ Book a Session</h1>
          <p className="mt-2 text-lg text-gray-600">with {coach.name}</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-900">
                ${coach.pricing?.["60min"] || 50}
              </div>
              <div className="text-sm text-gray-500">60 minutes</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-900">
                ${coach.pricing?.["90min"] || 70}
              </div>
              <div className="text-sm text-gray-500">90 minutes</div>
            </div>
          </div>
        </div>

        {availability && availability.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Availability ({coach.timezone})
            </h2>
            <ul className="space-y-2 text-sm text-gray-600">
              {availability.map((rule, i) => (
                <li key={i} className="flex justify-between">
                  <span>{DAYS[rule.day_of_week]}</span>
                  <span>
                    {rule.start_time} - {rule.end_time}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Request a Session</h2>
          <BookingForm coachId={coach.id} />
        </div>
      </div>
    </div>
  );
}
