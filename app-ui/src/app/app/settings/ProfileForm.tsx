"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { revalidateDashboard } from "./actions";

interface Coach {
  id: string;
  name: string;
  headline?: string;
  bio?: string;
  languages?: string;
  tags?: string;
  rating?: number;
  years_coaching?: number;
}

export default function ProfileForm({ coach }: { coach: Coach | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [name, setName] = useState(coach?.name || "");
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
      setMessage({ type: "success", text: "Profile saved!" });
      await revalidateDashboard();
      router.refresh();
    }

    setLoading(false);
  };

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

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading ? "Saving..." : "Save Profile"}
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
