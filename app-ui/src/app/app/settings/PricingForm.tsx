"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { revalidateDashboard } from "./actions";

interface Coach {
  id: string;
  timezone: string;
  slug: string;
  pricing: { "60min": number; "90min": number };
}

export default function PricingForm({ coach }: { coach: Coach | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [timezone, setTimezone] = useState(coach?.timezone || "UTC");
  const [slug, setSlug] = useState(coach?.slug || "");
  const [price60, setPrice60] = useState(coach?.pricing?.["60min"] || 50);
  const [price90, setPrice90] = useState(coach?.pricing?.["90min"] || 70);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("coaches")
      .update({
        timezone,
        slug,
        pricing: { "60min": price60, "90min": price90 },
      })
      .eq("id", coach!.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Settings saved!" });
      await revalidateDashboard();
      router.refresh();
    }

    setLoading(false);
  };

  const timezones = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Lima",
    "America/Bogota",
    "America/Mexico_City",
    "America/Sao_Paulo",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Madrid",
    "Europe/Rome",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Singapore",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Australia/Sydney",
    "Pacific/Auckland",
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="slug" className="label">
          Booking URL
        </label>
        <div className="flex rounded-md">
          <span className="inline-flex items-center px-4 rounded-l-md border border-r-0 border-cb-border bg-cb-bg text-cb-text-secondary text-sm">
            /c/
          </span>
          <input
            type="text"
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            className="flex-1 block w-full px-4 py-3.5 border border-cb-border rounded-none rounded-r-md text-sm transition-all duration-200 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral-light"
            required
          />
        </div>
        <p className="mt-1.5 text-xs text-cb-text-muted">
          This is your public booking link that students will use to book lessons.
        </p>
      </div>

      <div>
        <label htmlFor="timezone" className="label">
          Your Timezone
        </label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="input-field"
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-cb-text-muted">
          Your availability times will be displayed in this timezone.
        </p>
      </div>

      <div className="border-t border-cb-border-light pt-6">
        <h3 className="text-sm font-semibold text-cb-text mb-4">Lesson Pricing</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="price60" className="label">
              60-minute lesson
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cb-text-secondary">$</span>
              <input
                type="number"
                id="price60"
                value={price60}
                onChange={(e) => setPrice60(Number(e.target.value))}
                className="input-field pl-8"
                min="0"
              />
            </div>
          </div>
          <div>
            <label htmlFor="price90" className="label">
              90-minute lesson
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cb-text-secondary">$</span>
              <input
                type="number"
                id="price90"
                value={price90}
                onChange={(e) => setPrice90(Number(e.target.value))}
                className="input-field pl-8"
                min="0"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading ? "Saving..." : "Save Settings"}
        </button>

        {message && (
          <span
            className={`text-sm font-medium ${
              message.type === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}
