"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

export default function BookingForm({ coachId }: { coachId: string }) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentTimezone, setStudentTimezone] = useState("UTC");
  const [time1, setTime1] = useState("");
  const [time2, setTime2] = useState("");
  const [time3, setTime3] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const requestedTimes = [time1, time2, time3].filter((t) => t.trim() !== "");

    if (requestedTimes.length === 0) {
      setError("Please provide at least one preferred time.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const { error: insertError } = await supabase.from("booking_requests").insert({
      coach_id: coachId,
      student_name: studentName,
      student_email: studentEmail,
      student_timezone: studentTimezone,
      requested_times: requestedTimes,
      status: "pending",
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setSubmitted(true);
    }

    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Request Submitted!</h3>
        <p className="text-gray-600">
          The coach will review your request and get back to you at {studentEmail}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Your Name
        </label>
        <input
          type="text"
          id="name"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Your Email
        </label>
        <input
          type="email"
          id="email"
          value={studentEmail}
          onChange={(e) => setStudentEmail(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
          Your Timezone
        </label>
        <select
          id="timezone"
          value={studentTimezone}
          onChange={(e) => setStudentTimezone(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Preferred Times (provide up to 3 options)
        </label>
        <div className="space-y-2">
          <input
            type="text"
            value={time1}
            onChange={(e) => setTime1(e.target.value)}
            placeholder="e.g., Monday 3pm, Tuesday 10am"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          <input
            type="text"
            value={time2}
            onChange={(e) => setTime2(e.target.value)}
            placeholder="Option 2 (optional)"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          <input
            type="text"
            value={time3}
            onChange={(e) => setTime3(e.target.value)}
            placeholder="Option 3 (optional)"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Times are in your selected timezone.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 text-red-800 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Submitting..." : "Submit Request"}
      </button>
    </form>
  );
}
