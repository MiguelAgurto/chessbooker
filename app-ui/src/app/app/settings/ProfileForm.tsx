"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { revalidateDashboard } from "./actions";

interface Achievement {
  id?: string;
  result: string;
  event?: string;
  year?: number;
  sort_order: number;
}

interface Coach {
  id: string;
  name: string;
  title?: string;
  headline?: string;
  bio?: string;
  languages?: string;
  tags?: string;
  rating?: number;
  years_coaching?: number;
}

const CHESS_TITLES = [
  { value: "", label: "None" },
  { value: "GM", label: "GM (Grandmaster)" },
  { value: "IM", label: "IM (International Master)" },
  { value: "FM", label: "FM (FIDE Master)" },
  { value: "CM", label: "CM (Candidate Master)" },
  { value: "WGM", label: "WGM (Woman Grandmaster)" },
  { value: "WIM", label: "WIM (Woman International Master)" },
  { value: "WFM", label: "WFM (Woman FIDE Master)" },
];

export default function ProfileForm({
  coach,
  initialAchievements,
}: {
  coach: Coach | null;
  initialAchievements: Achievement[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [name, setName] = useState(coach?.name || "");
  const [title, setTitle] = useState(coach?.title || "");
  const [headline, setHeadline] = useState(coach?.headline || "");
  const [bio, setBio] = useState(coach?.bio || "");
  const [languages, setLanguages] = useState(coach?.languages || "");
  const [tags, setTags] = useState(coach?.tags || "");
  const [rating, setRating] = useState<number | "">(coach?.rating ?? "");
  const [yearsCoaching, setYearsCoaching] = useState<number | "">(coach?.years_coaching ?? "");
  const [achievements, setAchievements] = useState<Achievement[]>(initialAchievements);

  // Track which achievements to delete (by id)
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();

    // 1. Update coach profile (including title)
    const { error: coachError } = await supabase
      .from("coaches")
      .update({
        name,
        title: title || null,
        headline: headline || null,
        bio: bio || null,
        languages: languages || null,
        tags: tags || null,
        rating: rating === "" ? null : rating,
        years_coaching: yearsCoaching === "" ? null : yearsCoaching,
      })
      .eq("id", coach!.id);

    if (coachError) {
      setMessage({ type: "error", text: coachError.message });
      setLoading(false);
      return;
    }

    // 2. Delete removed achievements
    if (deletedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("coach_achievements")
        .delete()
        .in("id", deletedIds);

      if (deleteError) {
        setMessage({ type: "error", text: deleteError.message });
        setLoading(false);
        return;
      }
    }

    // 3. Upsert achievements (insert new, update existing)
    const validAchievements = achievements.filter(a => a.result.trim() !== "");

    for (let i = 0; i < validAchievements.length; i++) {
      const achievement = validAchievements[i];
      const data = {
        coach_id: coach!.id,
        result: achievement.result.trim(),
        event: achievement.event?.trim() || null,
        year: achievement.year || null,
        sort_order: i,
      };

      if (achievement.id) {
        // Update existing
        const { error } = await supabase
          .from("coach_achievements")
          .update(data)
          .eq("id", achievement.id);

        if (error) {
          setMessage({ type: "error", text: error.message });
          setLoading(false);
          return;
        }
      } else {
        // Insert new
        const { error } = await supabase
          .from("coach_achievements")
          .insert(data);

        if (error) {
          setMessage({ type: "error", text: error.message });
          setLoading(false);
          return;
        }
      }
    }

    setMessage({ type: "success", text: "Profile saved!" });
    setDeletedIds([]);
    await revalidateDashboard();
    router.refresh();

    setLoading(false);
  };

  const addAchievement = () => {
    if (achievements.length < 5) {
      setAchievements([
        ...achievements,
        { result: "", event: "", year: undefined, sort_order: achievements.length },
      ]);
    }
  };

  const removeAchievement = (index: number) => {
    const achievement = achievements[index];
    if (achievement.id) {
      setDeletedIds([...deletedIds, achievement.id]);
    }
    setAchievements(achievements.filter((_, i) => i !== index));
  };

  const updateAchievement = (
    index: number,
    field: keyof Omit<Achievement, "id" | "sort_order">,
    value: string | number | undefined
  ) => {
    const updated = [...achievements];
    updated[index] = { ...updated[index], [field]: value };
    setAchievements(updated);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
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
          <label htmlFor="title" className="label">
            Title
          </label>
          <select
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
          >
            {CHESS_TITLES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
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
          placeholder="e.g., 10+ years experience | Openings specialist"
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

      {/* Achievements Section */}
      <div className="border-t border-cb-border-light pt-5">
        <div className="flex items-center justify-between mb-3">
          <label className="label mb-0">Achievements (optional)</label>
          {achievements.length < 5 && (
            <button
              type="button"
              onClick={addAchievement}
              className="text-sm text-coral hover:text-coral-dark font-medium transition-colors"
            >
              + Add achievement
            </button>
          )}
        </div>
        <p className="text-xs text-cb-text-muted mb-3">
          Add up to 5 notable tournament results or titles.
        </p>

        {achievements.length === 0 ? (
          <div className="text-sm text-cb-text-muted py-3 text-center border border-dashed border-cb-border-light rounded-lg">
            No achievements added yet
          </div>
        ) : (
          <div className="space-y-3">
            {achievements.map((achievement, index) => (
              <div key={achievement.id || `new-${index}`} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-6 gap-2">
                  <input
                    type="text"
                    value={achievement.result}
                    onChange={(e) => updateAchievement(index, "result", e.target.value)}
                    placeholder="Result (e.g., 1st Place)"
                    className="input-field col-span-2"
                  />
                  <input
                    type="text"
                    value={achievement.event || ""}
                    onChange={(e) => updateAchievement(index, "event", e.target.value)}
                    placeholder="Event (optional)"
                    className="input-field col-span-3"
                  />
                  <input
                    type="number"
                    value={achievement.year || ""}
                    onChange={(e) => updateAchievement(index, "year", e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Year"
                    className="input-field col-span-1"
                    min="1900"
                    max={new Date().getFullYear()}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeAchievement(index)}
                  className="p-2 text-cb-text-muted hover:text-red-500 transition-colors"
                  title="Remove"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
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
