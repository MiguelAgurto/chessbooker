"use client";

import { useState, useMemo } from "react";
import { createRescheduleRequest } from "./actions";

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function getDateInTimezone(date: Date, timezone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone: timezone });
}

function getDayOfWeekInTimezone(date: Date, timezone: string): number {
  const dayStr = date.toLocaleDateString("en-US", { timeZone: timezone, weekday: "short" });
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.indexOf(dayStr);
}

function createTimestampInTimezone(dateStr: string, timeStr: string, timezone: string): number {
  const [hour, min] = timeStr.split(":").map(Number);
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

    const [gDatePart, gTimePart] = guessInTz.split(", ");
    const [gHour, gMin] = gTimePart.split(":").map(Number);

    const targetMins = hour * 60 + min;
    const guessMins = gHour * 60 + gMin;
    const diffMins = targetMins - guessMins;

    if (gDatePart !== dateStr) {
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
  startUtc: number;
  durationMins: number;
  label: string;
  displayTime: string;
}

interface BlockedBooking {
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number | null;
}

function isSlotBlocked(
  slotStartUtc: number,
  slotDurationMins: number,
  bookedIntervals: { start: number; end: number }[],
  bufferMinutes: number = 0
): boolean {
  const slotEnd = slotStartUtc + slotDurationMins * 60 * 1000;
  const bufferMs = bufferMinutes * 60 * 1000;

  for (const booked of bookedIntervals) {
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
  const earliestBookableTime = nowUtc + minNoticeMinutes * 60 * 1000;

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const refDate = new Date(nowUtc + dayOffset * 24 * 60 * 60 * 1000);
    const dateStrInCoachTz = getDateInTimezone(refDate, coachTimezone);
    const dayOfWeek = getDayOfWeekInTimezone(refDate, coachTimezone);

    const rulesForDay = availability.filter((r) => r.day_of_week === dayOfWeek);

    for (const rule of rulesForDay) {
      const [startHour, startMin] = rule.start_time.split(":").map(Number);
      const [endHour, endMin] = rule.end_time.split(":").map(Number);

      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      for (let mins = startMinutes; mins + durationMinutes <= endMinutes; mins += 30) {
        const slotHour = Math.floor(mins / 60);
        const slotMin = mins % 60;
        const timeStr = `${slotHour.toString().padStart(2, "0")}:${slotMin.toString().padStart(2, "0")}`;

        const slotStartUtc = createTimestampInTimezone(dateStrInCoachTz, timeStr, coachTimezone);

        if (slotStartUtc <= nowUtc) continue;
        if (slotStartUtc < earliestBookableTime) continue;
        if (isSlotBlocked(slotStartUtc, durationMinutes, bookedIntervals, bufferMinutes)) continue;

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

  slots.sort((a, b) => a.startUtc - b.startUtc);
  return slots;
}

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

interface OriginalBooking {
  id: string;
  coachId: string;
  studentName: string;
  studentEmail: string;
  studentTimezone: string;
  durationMinutes: number;
}

export default function RescheduleForm({
  originalBooking,
  coachTimezone,
  availability,
  blockedBookings,
  minNoticeMinutes = 0,
  bufferMinutes = 0,
}: {
  originalBooking: OriginalBooking;
  coachTimezone: string;
  availability: AvailabilityRule[];
  blockedBookings: BlockedBooking[];
  minNoticeMinutes?: number;
  bufferMinutes?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const userTimezone = useMemo(() => getBrowserTimezone(), []);

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
    () => generateSlots(
      availability,
      originalBooking.durationMinutes,
      bookedIntervals,
      coachTimezone,
      userTimezone,
      minNoticeMinutes,
      bufferMinutes
    ),
    [availability, originalBooking.durationMinutes, bookedIntervals, coachTimezone, userTimezone, minNoticeMinutes, bufferMinutes]
  );
  const groupedSlots = useMemo(() => groupSlotsByDate(slots), [slots]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedSlot) {
      setError("Please select a new time slot.");
      return;
    }

    setLoading(true);

    const slotData = {
      datetime: new Date(selectedSlot.startUtc).toISOString(),
      duration_minutes: selectedSlot.durationMins,
    };

    const result = await createRescheduleRequest({
      originalBookingId: originalBooking.id,
      coachId: originalBooking.coachId,
      studentName: originalBooking.studentName,
      studentEmail: originalBooking.studentEmail,
      studentTimezone: userTimezone,
      requestedTimes: [slotData],
    });

    if (!result.success) {
      setError(result.error || "Failed to submit reschedule request");
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
          <h3 className="text-lg font-semibold text-cb-text mb-2">Reschedule Request Sent!</h3>
          <p className="text-cb-text-secondary text-sm">
            The coach will review your request and get back to you at {originalBooking.studentEmail}.
          </p>
          <p className="text-cb-text-muted text-xs mt-4">
            Your current session remains confirmed until the coach approves the new time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      <h2 className="text-lg font-semibold text-cb-text">Select New Time</h2>

      <div>
        <p className="text-sm text-cb-text-secondary mb-1">
          Times shown in your timezone: {userTimezone}
        </p>

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
                <div className="text-sm font-semibold text-cb-text mb-2 pb-1 border-b border-cb-border-light">
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
            Selected: {selectedSlot.label} at {selectedSlot.displayTime} ({originalBooking.durationMinutes} min)
          </p>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-800 text-sm border border-red-200">{error}</div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading || !selectedSlot}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Submitting..." : "Request Reschedule"}
        </button>
        <p className="mt-3 text-sm text-cb-text-secondary text-center">
          Your current session will remain confirmed until the coach approves the new time.
        </p>
      </div>
    </form>
  );
}
