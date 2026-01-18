"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

// Get the current date in a specific timezone as YYYY-MM-DD
function getDateInTimezone(date: Date, timezone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone: timezone }); // en-CA gives YYYY-MM-DD
}

// Get day of week (0=Sun, 6=Sat) for a date in a specific timezone
function getDayOfWeekInTimezone(date: Date, timezone: string): number {
  const dayStr = date.toLocaleDateString("en-US", { timeZone: timezone, weekday: "short" });
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.indexOf(dayStr);
}

// Create a UTC timestamp from a date string and time in a specific timezone
function createTimestampInTimezone(dateStr: string, timeStr: string, timezone: string): number {
  // Parse the time
  const [hour, min] = timeStr.split(":").map(Number);

  // We need to find what UTC time corresponds to dateStr + timeStr in the target timezone
  // Use an iterative approach: start with a guess and adjust
  let guess = new Date(`${dateStr}T${timeStr}:00Z`).getTime();

  for (let i = 0; i < 3; i++) {
    const guessDate = new Date(guess);
    const guessInTz = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(guessDate);

    // Parse "YYYY-MM-DD, HH:MM" format
    const [gDatePart, gTimePart] = guessInTz.split(", ");
    const [gHour, gMin] = gTimePart.split(":").map(Number);

    const targetMins = hour * 60 + min;
    const guessMins = gHour * 60 + gMin;
    const diffMins = targetMins - guessMins;

    // Also check date
    if (gDatePart !== dateStr) {
      // Date is off, adjust by a day
      const dayDiff = gDatePart < dateStr ? 1 : -1;
      guess += dayDiff * 24 * 60 * 60 * 1000;
    }

    guess += diffMins * 60 * 1000;
  }

  return guess;
}

interface AvailabilityRule {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface Slot {
  startUtc: number;    // UTC timestamp in ms - used for comparisons and storage
  durationMins: number;
  label: string;       // Display label like "Mon Jan 20" in student timezone
  displayTime: string; // Display time like "9:00 AM" in student timezone
}

interface BookedSlot {
  datetime: string;
  duration_minutes: number;
}

interface ConfirmedBooking {
  requested_times: BookedSlot[] | string[];
}

// Parse a booked slot into start/end timestamps (in ms) - treats datetime as UTC or ISO
function parseBookedInterval(slot: BookedSlot | string): { start: number; end: number } | null {
  let datetime: string;
  let durationMinutes: number;

  if (typeof slot === "string") {
    datetime = slot;
    durationMinutes = 60;
  } else if (slot && typeof slot === "object" && slot.datetime) {
    datetime = slot.datetime;
    durationMinutes = slot.duration_minutes || 60;
  } else {
    return null;
  }

  // If datetime doesn't have timezone info, treat as UTC
  const isoDatetime = datetime.includes("Z") || datetime.includes("+") ? datetime : datetime + "Z";
  const start = new Date(isoDatetime).getTime();
  if (isNaN(start)) return null;

  const end = start + durationMinutes * 60 * 1000;
  return { start, end };
}

// Check if a slot overlaps with any booked interval (all in UTC ms)
function isSlotBlocked(
  slotStartUtc: number,
  slotDurationMins: number,
  bookedIntervals: { start: number; end: number }[]
): boolean {
  const slotEnd = slotStartUtc + slotDurationMins * 60 * 1000;

  for (const booked of bookedIntervals) {
    if (slotStartUtc < booked.end && slotEnd > booked.start) {
      return true;
    }
  }
  return false;
}

function generateSlots(
  availability: AvailabilityRule[],
  durationMinutes: number,
  bookedIntervals: { start: number; end: number }[],
  coachTimezone: string,
  studentTimezone: string
): Slot[] {
  const slots: Slot[] = [];
  const nowUtc = Date.now();

  // Generate slots for next 7 days (in coach timezone)
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    // Get the date in coach timezone
    const refDate = new Date(nowUtc + dayOffset * 24 * 60 * 60 * 1000);
    const dateStrInCoachTz = getDateInTimezone(refDate, coachTimezone);
    const dayOfWeek = getDayOfWeekInTimezone(refDate, coachTimezone);

    const rulesForDay = availability.filter((r) => r.day_of_week === dayOfWeek);

    for (const rule of rulesForDay) {
      const [startHour, startMin] = rule.start_time.split(":").map(Number);
      const [endHour, endMin] = rule.end_time.split(":").map(Number);

      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      for (let mins = startMinutes; mins + durationMinutes <= endMinutes; mins += durationMinutes) {
        const slotHour = Math.floor(mins / 60);
        const slotMin = mins % 60;
        const timeStr = `${slotHour.toString().padStart(2, "0")}:${slotMin.toString().padStart(2, "0")}`;

        // Convert coach date+time to UTC timestamp
        const slotStartUtc = createTimestampInTimezone(dateStrInCoachTz, timeStr, coachTimezone);

        // Skip past slots (compare in UTC)
        if (slotStartUtc <= nowUtc) continue;

        // Skip blocked slots
        if (isSlotBlocked(slotStartUtc, durationMinutes, bookedIntervals)) continue;

        // Format display in student timezone
        const slotDate = new Date(slotStartUtc);
        const dayLabel = slotDate.toLocaleDateString("en-US", {
          timeZone: studentTimezone,
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const displayTime = slotDate.toLocaleTimeString("en-US", {
          timeZone: studentTimezone,
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

        slots.push({
          startUtc: slotStartUtc,
          durationMins: durationMinutes,
          label: dayLabel,
          displayTime,
        });
      }
    }
  }

  // Sort by UTC time and remove duplicates
  slots.sort((a, b) => a.startUtc - b.startUtc);
  return slots;
}

// Group slots by display date label
function groupSlotsByDate(slots: Slot[]): Map<string, Slot[]> {
  const grouped = new Map<string, Slot[]>();
  for (const slot of slots) {
    if (!grouped.has(slot.label)) {
      grouped.set(slot.label, []);
    }
    grouped.get(slot.label)!.push(slot);
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

  const userTimezone = useMemo(() => getBrowserTimezone(), []);

  // Parse accepted bookings into blocked intervals (only first slot = chosen time)
  const bookedIntervals = useMemo(() => {
    const intervals: { start: number; end: number }[] = [];
    for (const booking of confirmedBookings) {
      if (booking.requested_times && Array.isArray(booking.requested_times) && booking.requested_times.length > 0) {
        const interval = parseBookedInterval(booking.requested_times[0]);
        if (interval) {
          intervals.push(interval);
        }
      }
    }
    return intervals;
  }, [confirmedBookings]);

  const slots = useMemo(
    () => generateSlots(availability, duration, bookedIntervals, coachTimezone, userTimezone),
    [availability, duration, bookedIntervals, coachTimezone, userTimezone]
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

    // Store as ISO datetime in UTC
    const slotData = {
      datetime: new Date(selectedSlot.startUtc).toISOString(),
      duration_minutes: selectedSlot.durationMins,
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
        <label className="label">Select a Time Slot</label>
        <p className="text-xs text-cb-text-muted mb-2">
          Times shown in your timezone: {userTimezone}
        </p>
        <p className="text-sm text-cb-text-secondary mb-3">
          {slots.length > 0
            ? `Next available: ${slots[0].label} ${slots[0].displayTime}`
            : "No availability in the next 7 days"}
        </p>

        {slots.length === 0 ? (
          <div className="p-4 bg-cb-bg rounded-lg text-center text-cb-text-secondary text-sm border border-cb-border-light">
            Please check back later.
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
                    const isSelected = selectedSlot?.startUtc === slot.startUtc;
                    return (
                      <button
                        key={slot.startUtc}
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
