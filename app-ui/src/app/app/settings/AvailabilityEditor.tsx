"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface AvailabilityRule {
  id: string;
  coach_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AvailabilityEditor({
  availability,
  coachId,
}: {
  availability: AvailabilityRule[];
  coachId: string;
}) {
  const router = useRouter();
  const [rules, setRules] = useState(availability);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("17:00");

  const handleAdd = async () => {
    setError(null);

    if (newStart >= newEnd) {
      setError("Start time must be before end time");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data, error: insertError } = await supabase
      .from("availability_rules")
      .insert({
        coach_id: coachId,
        day_of_week: newDay,
        start_time: newStart,
        end_time: newEnd,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
    } else if (data) {
      setRules([...rules, data]);
      router.refresh();
    }

    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.from("availability_rules").delete().eq("id", id);

    if (!error) {
      setRules(rules.filter((r) => r.id !== id));
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden border border-cb-border-light rounded-lg">
        <table className="min-w-full divide-y divide-cb-border-light">
          <thead className="bg-cb-bg">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-cb-text-secondary uppercase tracking-wider">
                Day
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-cb-text-secondary uppercase tracking-wider">
                Start
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-cb-text-secondary uppercase tracking-wider">
                End
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-cb-text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-cb-border-light">
            {rules.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-sm text-cb-text-secondary text-center">
                  No availability rules set. Add one below.
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-cb-bg transition-colors">
                  <td className="px-4 py-3 text-sm text-cb-text">{DAYS[rule.day_of_week]}</td>
                  <td className="px-4 py-3 text-sm text-cb-text">{rule.start_time}</td>
                  <td className="px-4 py-3 text-sm text-cb-text">{rule.end_time}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <button
                      onClick={() => handleDelete(rule.id)}
                      disabled={loading}
                      className="text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-end gap-4 p-4 bg-cb-bg rounded-lg border border-cb-border-light">
        <div className="flex-1">
          <label className="label">Day</label>
          <select
            value={newDay}
            onChange={(e) => setNewDay(Number(e.target.value))}
            className="input-field"
          >
            {DAYS.map((day, i) => (
              <option key={i} value={i}>
                {day}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="label">Start</label>
          <input
            type="time"
            value={newStart}
            onChange={(e) => setNewStart(e.target.value)}
            className="input-field"
          />
        </div>
        <div className="flex-1">
          <label className="label">End</label>
          <input
            type="time"
            value={newEnd}
            onChange={(e) => setNewEnd(e.target.value)}
            className="input-field"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? "Adding..." : "Add"}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-800 text-sm border border-red-200">{error}</div>
      )}
    </div>
  );
}
