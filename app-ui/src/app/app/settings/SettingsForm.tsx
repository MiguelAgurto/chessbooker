"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { revalidateDashboard } from "./actions";

interface Coach {
  id: string;
  name: string;
  timezone: string;
  slug: string;
  pricing: { "60min": number; "90min": number };
  headline?: string;
  bio?: string;
  languages?: string;
  tags?: string;
  rating?: number;
  years_coaching?: number;
}

export default function SettingsForm({ coach }: { coach: Coach | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [name, setName] = useState(coach?.name || "");
  const [timezone, setTimezone] = useState(coach?.timezone || "UTC");
  const [slug, setSlug] = useState(coach?.slug || "");
  const [price60, setPrice60] = useState(coach?.pricing?.["60min"] || 50);
  const [price90, setPrice90] = useState(coach?.pricing?.["90min"] || 70);
  const [headline, setHeadline] = useState(coach?.headline || "");
  const [bio, setBio] = useState(coach?.bio || "");
  const [languages, setLanguages] = useState(coach?.languages || "");
  const [tags, setTags] = useState(coach?.tags || "");
  const [rating, setRating] = useState<number | "">(coach?.rating ?? "");
  const [yearsCoaching, setYearsCoaching] = useState<number | "">(coach?.years_coaching ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("coaches")
      .update({
        name,
        timezone,
        slug,
        pricing: { "60min": price60, "90min": price90 },
        headline: headline || null,
        bio: bio || null,
        languages: languages || null,
        tags: tags || null,
        rating: rating === "" ? null : rating,
        years_coaching: yearsCoaching === "" ? null : yearsCoaching,
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
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney",
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="label">
          Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field"
          required
        />
      </div>

      <div>
        <label htmlFor="headline" className="label">
          Headline
        </label>
        <input
          type="text"
          id="headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="e.g., FIDE Master | 10+ years experience"
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="bio" className="label">
          Bio
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          placeholder="Tell students about yourself and your coaching style..."
          className="input-field"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="languages" className="label">
            Languages
          </label>
          <input
            type="text"
            id="languages"
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            placeholder="e.g., English, Spanish"
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor="tags" className="label">
            Focus Tags
          </label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., Openings, Endgames"
            className="input-field"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="rating" className="label">
            Rating (optional)
          </label>
          <input
            type="number"
            id="rating"
            value={rating}
            onChange={(e) => setRating(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="e.g., 2200"
            className="input-field"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="yearsCoaching" className="label">
            Years Coaching (optional)
          </label>
          <input
            type="number"
            id="yearsCoaching"
            value={yearsCoaching}
            onChange={(e) => setYearsCoaching(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="e.g., 5"
            className="input-field"
            min="0"
          />
        </div>
      </div>

      <div>
        <label htmlFor="timezone" className="label">
          Timezone
        </label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="input-field"
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="slug" className="label">
          Booking URL Slug
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="price60" className="label">
            60-min Price ($)
          </label>
          <input
            type="number"
            id="price60"
            value={price60}
            onChange={(e) => setPrice60(Number(e.target.value))}
            className="input-field"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="price90" className="label">
            90-min Price ($)
          </label>
          <input
            type="number"
            id="price90"
            value={price90}
            onChange={(e) => setPrice90(Number(e.target.value))}
            className="input-field"
            min="0"
          />
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
