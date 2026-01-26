"use client";

import { useState, useMemo } from "react";
import { createBookingRequest } from "./actions";

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

// Blocked booking from DB (pending or confirmed with scheduled times)
interface BlockedBooking {
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number | null;
}

// Check if a slot overlaps with any booked interval (all in UTC ms)
// Buffer time extends the blocked window on both sides
function isSlotBlocked(
  slotStartUtc: number,
  slotDurationMins: number,
  bookedIntervals: { start: number; end: number }[],
  bufferMinutes: number = 0
): boolean {
  const slotEnd = slotStartUtc + slotDurationMins * 60 * 1000;
  const bufferMs = bufferMinutes * 60 * 1000;

  for (const booked of bookedIntervals) {
    // Extend the blocked window by buffer on both sides
    const blockedStart = booked.start - bufferMs;
    const blockedEnd = booked.end + bufferMs;

    if (slotStartUtc < blockedEnd && slotEnd > blockedStart) {
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
  studentTimezone: string,
  minNoticeMinutes: number = 0,
  bufferMinutes: number = 0
): Slot[] {
  const slots: Slot[] = [];
  const nowUtc = Date.now();

  // Calculate the earliest bookable time (now + min notice)
  const earliestBookableTime = nowUtc + minNoticeMinutes * 60 * 1000;

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

      // Use 30-minute grid for slot start times (:00 and :30 only)
      for (let mins = startMinutes; mins + durationMinutes <= endMinutes; mins += 30) {
        const slotHour = Math.floor(mins / 60);
        const slotMin = mins % 60;
        const timeStr = `${slotHour.toString().padStart(2, "0")}:${slotMin.toString().padStart(2, "0")}`;

        // Convert coach date+time to UTC timestamp
        const slotStartUtc = createTimestampInTimezone(dateStrInCoachTz, timeStr, coachTimezone);

        // Skip past slots (compare in UTC)
        if (slotStartUtc <= nowUtc) continue;

        // Skip slots that don't meet minimum notice requirement
        if (slotStartUtc < earliestBookableTime) continue;

        // Skip blocked slots (with buffer time applied)
        if (isSlotBlocked(slotStartUtc, durationMinutes, bookedIntervals, bufferMinutes)) continue;

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
  blockedBookings,
  pricing,
  minNoticeMinutes = 0,
  bufferMinutes = 0,
}: {
  coachId: string;
  coachTimezone: string;
  availability: AvailabilityRule[];
  blockedBookings: BlockedBooking[];
  pricing: { "60min": number; "90min": number };
  minNoticeMinutes?: number;
  bufferMinutes?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [duration, setDuration] = useState<60 | 90>(60);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const userTimezone = useMemo(() => getBrowserTimezone(), []);

  // Parse blocked bookings (pending + confirmed) into intervals for slot blocking
  const bookedIntervals = useMemo(() => {
    const intervals: { start: number; end: number }[] = [];
    for (const booking of blockedBookings) {
      if (booking.scheduled_start && booking.scheduled_end) {
        const start = new Date(booking.scheduled_start).getTime();
        const end = new Date(booking.scheduled_end).getTime();
        if (!isNaN(start) && !isNaN(end)) {
          intervals.push({ start, end });
        }
      }
    }
    return intervals;
  }, [blockedBookings]);

  const slots = useMemo(
    () => generateSlots(availability, duration, bookedIntervals, coachTimezone, userTimezone, minNoticeMinutes, bufferMinutes),
    [availability, duration, bookedIntervals, coachTimezone, userTimezone, minNoticeMinutes, bufferMinutes]
  );
  const groupedSlots = useMemo(() => groupSlotsByDate(slots), [slots]);

  const handleDurationChange = (newDuration: 60 | 90) => {
    setDuration(newDuration);
    setSelectedSlot(null); // Clear selection when duration changes
  };

  // Form validation - check if all required fields are filled
  const isFormValid = studentName.trim() !== "" && studentEmail.trim() !== "" && selectedSlot !== null;

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

    const result = await createBookingRequest({
      coachId,
      studentName,
      studentEmail,
      studentTimezone: userTimezone,
      requestedTimes: [slotData],
    });

    if (!result.success) {
      setError(result.error || "Failed to submit request");
    } else {
      setSubmitted(true);
    }

    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="card p-6">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 fill-green-500" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-cb-text mb-2">Request Submitted!</h3>
          <p className="text-cb-text-secondary text-sm">
            The coach will review your request and get back to you at {studentEmail}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pricing Section - Selectable cards */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-cb-text mb-4">Select a Session</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleDurationChange(60)}
            className={`p-4 rounded-lg text-center border-2 transition-all ${
              duration === 60
                ? "border-coral bg-coral/5"
                : "border-cb-border-light bg-cb-bg hover:border-cb-border"
            }`}
          >
            <div className={`text-2xl font-bold ${duration === 60 ? "text-coral" : "text-cb-text"}`}>
              ${pricing["60min"]}
            </div>
            <div className={`text-sm ${duration === 60 ? "text-coral" : "text-cb-text-secondary"}`}>
              60 minutes
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleDurationChange(90)}
            className={`p-4 rounded-lg text-center border-2 transition-all ${
              duration === 90
                ? "border-coral bg-coral/5"
                : "border-cb-border-light bg-cb-bg hover:border-cb-border"
            }`}
          >
            <div className={`text-2xl font-bold ${duration === 90 ? "text-coral" : "text-cb-text"}`}>
              ${pricing["90min"]}
            </div>
            <div className={`text-sm ${duration === 90 ? "text-coral" : "text-cb-text-secondary"}`}>
              90 minutes
            </div>
          </button>
        </div>
      </div>

      {/* Booking Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <h2 className="text-lg font-semibold text-cb-text">Your Details</h2>

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
          <p className="mt-1.5 text-sm text-cb-text-secondary">
            Used only to confirm your session
          </p>
        </div>

        {/* Time Selection with improved hierarchy */}
        <div>
          <label className="label">Select a Time</label>

          {/* Timezone info - most prominent context */}
          <p className="text-sm text-cb-text-secondary mb-1">
            Times shown in your timezone: {userTimezone}
          </p>

          {/* Next available - secondary context */}
          {slots.length > 0 && (
            <p className="text-sm text-cb-text-secondary mb-4">
              Next available: {slots[0].label} at {slots[0].displayTime}
            </p>
          )}

          {slots.length === 0 ? (
            <div className="p-4 bg-cb-bg rounded-lg text-center text-cb-text-secondary text-sm border border-cb-border-light">
              No availability in the next 7 days. Please check back later.
            </div>
          ) : (
            <div className="space-y-4 max-h-64 overflow-y-auto border border-cb-border-light rounded-lg p-4">
              {Array.from(groupedSlots.entries()).map(([key, daySlots]) => (
                <div key={key}>
                  {/* Date - prominent */}
                  <div className="text-sm font-semibold text-cb-text mb-2 pb-1 border-b border-cb-border-light">
                    {daySlots[0].label}
                  </div>
                  {/* Time slots - secondary */}
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
                              ? "bg-coral text-white border-coral shadow-sm"
                              : "bg-white text-cb-text-muted border-cb-border-light hover:border-coral hover:text-coral"
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

        <div>
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Request Session"}
          </button>
          <p className="mt-3 text-sm text-cb-text-secondary text-center">
            You&apos;ll receive a confirmation email once the coach approves.
          </p>
        </div>
      </form>
    </div>
  );
}
