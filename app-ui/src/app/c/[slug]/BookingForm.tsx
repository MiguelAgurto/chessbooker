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
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Request Submitted!</h3>
        <p className="text-gray-600">
          The coach will review your request and get back to you at {studentEmail}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Your Name
        </label>
        <input
          type="text"
          id="name"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Your Email
        </label>
        <input
          type="email"
          id="email"
          value={studentEmail}
          onChange={(e) => setStudentEmail(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Session Duration
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleDurationChange(60)}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md border transition-colors ${
              duration === 60
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-indigo-500"
            }`}
          >
            60 minutes
          </button>
          <button
            type="button"
            onClick={() => handleDurationChange(90)}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md border transition-colors ${
              duration === 90
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-indigo-500"
            }`}
          >
            90 minutes
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select a Time Slot
          <span className="text-gray-500 font-normal ml-1">({coachTimezone})</span>
        </label>

        {slots.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500 text-sm">
            No available time slots in the next 7 days. Please check back later.
          </div>
        ) : (
          <div className="space-y-4 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
            {Array.from(groupedSlots.entries()).map(([key, daySlots]) => (
              <div key={key}>
                <div className="text-sm font-medium text-gray-700 mb-2">
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
                        className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-indigo-500"
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
          <p className="mt-2 text-sm text-indigo-600">
            Selected: {selectedSlot.label} at {selectedSlot.displayTime} ({duration} min)
          </p>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 text-red-800 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading || slots.length === 0}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Submitting..." : "Submit Request"}
      </button>
    </form>
  );
}
