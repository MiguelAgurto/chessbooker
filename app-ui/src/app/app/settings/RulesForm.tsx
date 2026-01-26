"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { revalidateDashboard } from "./actions";

interface CoachSettings {
  coach_id: string;
  request_expiration_hours: number;
  coach_rules: Record<string, unknown> | null;
}

interface RulesFormProps {
  coachId: string;
  settings: CoachSettings | null;
}

export default function RulesForm({ coachId, settings }: RulesFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [expirationHours, setExpirationHours] = useState(
    settings?.request_expiration_hours ?? 24
  );
  const [rulesJson, setRulesJson] = useState(
    settings?.coach_rules ? JSON.stringify(settings.coach_rules, null, 2) : "{}"
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Validate JSON as user types
  const handleRulesChange = (value: string) => {
    setRulesJson(value);
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch (e) {
      setJsonError((e as Error).message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validate JSON before saving
    let parsedRules: Record<string, unknown>;
    try {
      parsedRules = JSON.parse(rulesJson);
    } catch (e) {
      setMessage({ type: "error", text: `Invalid JSON: ${(e as Error).message}` });
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // Upsert into coach_settings
    const { error } = await supabase
      .from("coach_settings")
      .upsert(
        {
          coach_id: coachId,
          request_expiration_hours: expirationHours,
          coach_rules: parsedRules,
        },
        { onConflict: "coach_id" }
      );

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Rules saved!" });
      await revalidateDashboard();
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Request Expiration */}
      <div>
        <label htmlFor="expirationHours" className="label">
          Request Expiration (hours)
        </label>
        <p className="text-xs text-cb-text-muted mb-2">
          Pending booking requests will automatically expire after this many hours if not confirmed.
        </p>
        <input
          type="number"
          id="expirationHours"
          value={expirationHours}
          onChange={(e) => setExpirationHours(Math.max(1, Math.min(168, Number(e.target.value))))}
          min={1}
          max={168}
          className="input-field w-32"
        />
        <p className="text-xs text-cb-text-muted mt-1">
          Range: 1-168 hours (1 hour to 1 week)
        </p>
      </div>

      {/* Coach Rules JSON */}
      <div>
        <label htmlFor="coachRules" className="label">
          Coach Rules (JSON)
        </label>
        <p className="text-xs text-cb-text-muted mb-2">
          Advanced configuration for booking rules. Must be valid JSON.
        </p>
        <textarea
          id="coachRules"
          value={rulesJson}
          onChange={(e) => handleRulesChange(e.target.value)}
          rows={8}
          className={`input-field font-mono text-sm ${jsonError ? "border-red-400 focus:ring-red-200" : ""}`}
          placeholder="{}"
        />
        {jsonError && (
          <p className="text-xs text-red-600 mt-1">
            Invalid JSON: {jsonError}
          </p>
        )}
        <p className="text-xs text-cb-text-muted mt-2">
          Example structure:
        </p>
        <pre className="text-xs text-cb-text-muted bg-cb-bg p-2 rounded mt-1 overflow-x-auto">
{`{
  "max_bookings_per_day": 5,
  "require_payment_upfront": false,
  "auto_confirm": false
}`}
        </pre>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={loading || !!jsonError}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Rules"}
        </button>
        {message && (
          <span
            className={`text-sm ${
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
