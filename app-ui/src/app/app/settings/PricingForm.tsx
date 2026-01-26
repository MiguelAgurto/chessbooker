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
  min_notice_minutes: number | null;
  buffer_minutes: number | null;
}

export default function PricingForm({ coach }: { coach: Coach | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [timezone, setTimezone] = useState(coach?.timezone || "UTC");
  const [slug, setSlug] = useState(coach?.slug || "");
  const [price60, setPrice60] = useState(coach?.pricing?.["60min"] || 50);
  const [price90, setPrice90] = useState(coach?.pricing?.["90min"] || 70);
  const [minNotice, setMinNotice] = useState(coach?.min_notice_minutes ?? 60);
  const [buffer, setBuffer] = useState(coach?.buffer_minutes ?? 0);

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
        min_notice_minutes: minNotice,
        buffer_minutes: buffer,
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

      <div className="border-t border-cb-border-light pt-6">
        <h3 className="text-sm font-semibold text-cb-text mb-4">Booking Rules</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="minNotice" className="label">
              Minimum notice
            </label>
            <select
              id="minNotice"
              value={minNotice}
              onChange={(e) => setMinNotice(Number(e.target.value))}
              className="input-field"
            >
              <option value={0}>No minimum</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={360}>6 hours</option>
              <option value={720}>12 hours</option>
              <option value={1440}>24 hours</option>
              <option value={2880}>48 hours</option>
            </select>
            <p className="mt-1.5 text-xs text-cb-text-muted">
              Students must book at least this far in advance.
            </p>
          </div>
          <div>
            <label htmlFor="buffer" className="label">
              Buffer between lessons
            </label>
            <select
              id="buffer"
              value={buffer}
              onChange={(e) => setBuffer(Number(e.target.value))}
              className="input-field"
            >
              <option value={0}>No buffer</option>
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={20}>20 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
            <p className="mt-1.5 text-xs text-cb-text-muted">
              Prevents back-to-back bookings.
            </p>
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
