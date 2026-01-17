"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface AvailabilityRule {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface Slot {
  date: string; // ISO date string YYYY-MM-DD
  time: string; // HH:MM
  label: string; // Display label like "Mon Jan 20"
  displayTime: string; // Display time like "9:00 AM"
}

interface BookedSlot {
  datetime: string;
  duration_minutes: number;
}

interface ConfirmedBooking {
  requested_times: BookedSlot[] | string[];
}

// Parse a booked slot into start/end timestamps (in ms)
function parseBookedInterval(slot: BookedSlot | string): { start: number; end: number } | null {
  let datetime: string;
  let durationMinutes: number;

  if (typeof slot === "string") {
    // Legacy format: just a datetime string, assume 60 minutes
    datetime = slot;
    durationMinutes = 60;
  } else if (slot && typeof slot === "object" && slot.datetime) {
    datetime = slot.datetime;
    durationMinutes = slot.duration_minutes || 60;
  } else {
    return null;
  }

  const start = new Date(datetime).getTime();
  if (isNaN(start)) return null;

  const end = start + durationMinutes * 60 * 1000;
  return { start, end };
}

// Check if a slot overlaps with any booked interval
function isSlotBlocked(
  slotDate: string,
  slotTime: string,
  slotDuration: number,
  bookedIntervals: { start: number; end: number }[]
): boolean {
  const slotStart = new Date(`${slotDate}T${slotTime}:00`).getTime();
  const slotEnd = slotStart + slotDuration * 60 * 1000;

  for (const booked of bookedIntervals) {
    // Overlap if slotStart < bookingEnd AND slotEnd > bookingStart
    if (slotStart < booked.end && slotEnd > booked.start) {
      return true;
    }
  }
  return false;
}

function generateSlots(
  availability: AvailabilityRule[],
  durationMinutes: number,
  bookedIntervals: { start: number; end: number }[]
): Slot[] {
  const slots: Slot[] = [];
  const now = new Date();

  // Generate slots for next 7 days
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);

    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const rulesForDay = availability.filter((r) => r.day_of_week === dayOfWeek);

    for (const rule of rulesForDay) {
      // Parse start and end times
      const [startHour, startMin] = rule.start_time.split(":").map(Number);
      const [endHour, endMin] = rule.end_time.split(":").map(Number);

      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      // Generate slots based on selected duration
      for (let mins = startMinutes; mins + durationMinutes <= endMinutes; mins += durationMinutes) {
        const slotHour = Math.floor(mins / 60);
        const slotMin = mins % 60;

        const timeStr = `${slotHour.toString().padStart(2, "0")}:${slotMin.toString().padStart(2, "0")}`;
        const dateStr = date.toISOString().split("T")[0];

        // Skip slots that are in the past (for today)
        if (dayOffset === 0) {
          const slotDate = new Date(date);
          slotDate.setHours(slotHour, slotMin, 0, 0);
          if (slotDate <= now) continue;
        }

        // Skip slots that overlap with confirmed bookings
        if (isSlotBlocked(dateStr, timeStr, durationMinutes, bookedIntervals)) {
          continue;
        }

        // Format display
        const dayLabel = date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });

        const displayTime = new Date(2000, 0, 1, slotHour, slotMin).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

        slots.push({
          date: dateStr,
          time: timeStr,
          label: dayLabel,
          displayTime,
        });
      }
    }
  }

  return slots;
}

// Group slots by date
function groupSlotsByDate(slots: Slot[]): Map<string, Slot[]> {
  const grouped = new Map<string, Slot[]>();
  for (const slot of slots) {
    const key = `${slot.date}|${slot.label}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(slot);
  }
  return grouped;
}

export default function BookingForm({
  coachId,
  coachTimezone,
  availability,
  confirmedBookings,
}: {
  coachId: string;
  coachTimezone: string;
  availability: AvailabilityRule[];
  confirmedBookings: ConfirmedBooking[];
}) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [duration, setDuration] = useState<60 | 90>(60);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Parse all confirmed bookings into blocked intervals
  const bookedIntervals = useMemo(() => {
    const intervals: { start: number; end: number }[] = [];
    for (const booking of confirmedBookings) {
      if (booking.requested_times && Array.isArray(booking.requested_times)) {
        for (const slot of booking.requested_times) {
          const interval = parseBookedInterval(slot);
          if (interval) {
            intervals.push(interval);
          }
        }
      }
    }
    return intervals;
  }, [confirmedBookings]);

  const slots = useMemo(
    () => generateSlots(availability, duration, bookedIntervals),
    [availability, duration, bookedIntervals]
  );
  const groupedSlots = useMemo(() => groupSlotsByDate(slots), [slots]);

  const handleDurationChange = (newDuration: 60 | 90) => {
    setDuration(newDuration);
    setSelectedSlot(null); // Clear selection when duration changes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedSlot) {
      setError("Please select a time slot.");
      return;
    }

    setLoading(true);

    // Store as object with datetime and duration
    const slotData = {
      datetime: `${selectedSlot.date}T${selectedSlot.time}:00`,
      duration_minutes: duration,
    };

    const supabase = createClient();

    const { error: insertError } = await supabase.from("booking_requests").insert({
      coach_id: coachId,
      student_name: studentName,
      student_email: studentEmail,
      student_timezone: coachTimezone,
      requested_times: [slotData],
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
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 fill-green-500" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-cb-text mb-2">Request Submitted!</h3>
        <p className="text-cb-text-secondary">
          The coach will review your request and get back to you at {studentEmail}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="label">
          Your Name
        </label>
        <input
          type="text"
          id="name"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          required
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="email" className="label">
          Your Email
        </label>
        <input
          type="email"
          id="email"
          value={studentEmail}
          onChange={(e) => setStudentEmail(e.target.value)}
          required
          className="input-field"
        />
      </div>

      <div>
        <label className="label">
          Session Duration
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleDurationChange(60)}
            className={`flex-1 py-3 px-4 text-sm font-semibold rounded-lg border-2 transition-all ${
              duration === 60
                ? "bg-coral text-white border-coral"
                : "bg-white text-cb-text border-cb-border hover:border-coral"
            }`}
          >
            60 minutes
          </button>
          <button
            type="button"
            onClick={() => handleDurationChange(90)}
            className={`flex-1 py-3 px-4 text-sm font-semibold rounded-lg border-2 transition-all ${
              duration === 90
                ? "bg-coral text-white border-coral"
                : "bg-white text-cb-text border-cb-border hover:border-coral"
            }`}
          >
            90 minutes
          </button>
        </div>
      </div>

      <div>
        <label className="label">
          Select a Time Slot
          <span className="text-cb-text-muted font-normal ml-1">({coachTimezone})</span>
        </label>

        {slots.length === 0 ? (
          <div className="p-4 bg-cb-bg rounded-lg text-center text-cb-text-secondary text-sm border border-cb-border-light">
            No available time slots in the next 7 days. Please check back later.
          </div>
        ) : (
          <div className="space-y-4 max-h-64 overflow-y-auto border border-cb-border-light rounded-lg p-4">
            {Array.from(groupedSlots.entries()).map(([key, daySlots]) => (
              <div key={key}>
                <div className="text-sm font-semibold text-cb-text mb-2">
                  {daySlots[0].label}
                </div>
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((slot) => {
                    const isSelected =
                      selectedSlot?.date === slot.date && selectedSlot?.time === slot.time;
                    return (
                      <button
                        key={`${slot.date}-${slot.time}`}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
                          isSelected
                            ? "bg-coral text-white border-coral"
                            : "bg-white text-cb-text-secondary border-cb-border hover:border-coral hover:text-coral"
                        }`}
                      >
                        {slot.displayTime}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedSlot && (
          <p className="mt-3 text-sm text-coral font-medium">
            Selected: {selectedSlot.label} at {selectedSlot.displayTime} ({duration} min)
          </p>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-800 text-sm border border-red-200">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading || slots.length === 0}
        className="btn-primary w-full"
      >
        {loading ? "Submitting..." : "Submit Request"}
      </button>
    </form>
  );
}
