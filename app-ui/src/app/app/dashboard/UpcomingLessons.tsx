"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getRelativeDateLabel } from "@/lib/timezone";

const NUDGE_DISMISS_KEY = "chessbooker_retention_nudge_dismissed_at";
const NUDGE_DISMISS_DAYS = 14;
const INACTIVITY_THRESHOLD_DAYS = 14;

interface UpcomingLesson {
  id: string;
  student_name: string;
  student_email: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  meeting_url: string | null;
}

interface UpcomingLessonsProps {
  lessons: UpcomingLesson[];
  timezone: string;
  coachSlug?: string;
  lastLessonDate?: string; // Most recent lesson date (for retention nudge)
}

export default function UpcomingLessons({
  lessons,
  timezone,
  coachSlug,
  lastLessonDate,
}: UpcomingLessonsProps) {
  const [nudgeDismissed, setNudgeDismissed] = useState(true); // Start true to prevent flash

  // Check localStorage for dismiss state on mount
  useEffect(() => {
    const dismissedAt = localStorage.getItem(NUDGE_DISMISS_KEY);
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismiss = Math.floor(
        (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      setNudgeDismissed(daysSinceDismiss < NUDGE_DISMISS_DAYS);
    } else {
      setNudgeDismissed(false);
    }
  }, []);

  const handleDismissNudge = () => {
    localStorage.setItem(NUDGE_DISMISS_KEY, new Date().toISOString());
    setNudgeDismissed(true);
  };

  // Calculate if we should show the retention nudge
  const shouldShowNudge = (() => {
    if (lessons.length > 0) return false; // Has upcoming lessons
    if (nudgeDismissed) return false; // Already dismissed recently
    if (!lastLessonDate) return true; // No lessons ever - show nudge

    const daysSinceLastLesson = Math.floor(
      (Date.now() - new Date(lastLessonDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceLastLesson >= INACTIVITY_THRESHOLD_DAYS;
  })();

  if (lessons.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-cb-text mb-4">
          Upcoming Lessons
        </h2>

        {/* Retention Nudge */}
        {shouldShowNudge && (
          <div className="mb-4 p-4 bg-amber-50/50 border border-amber-100 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">💡</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-cb-text">
                  You don&apos;t have any upcoming lessons
                </p>
                <p className="text-xs text-cb-text-secondary mt-1">
                  Most coaches get new bookings after sharing their booking link with students.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <a
                    href="#booking-link"
                    className="text-xs px-3 py-1.5 rounded-lg bg-coral text-white hover:bg-coral-dark transition-colors font-medium"
                  >
                    Share booking link
                  </a>
                  {coachSlug && (
                    <Link
                      href={`/c/${coachSlug}`}
                      target="_blank"
                      className="text-xs text-cb-text-secondary hover:text-coral transition-colors"
                    >
                      View booking page →
                    </Link>
                  )}
                </div>
              </div>
              <button
                onClick={handleDismissNudge}
                className="text-xs text-cb-text-muted hover:text-cb-text-secondary transition-colors flex-shrink-0"
              >
                Got it
              </button>
            </div>
          </div>
        )}

        <div className="text-center py-8">
          <div className="w-12 h-12 bg-cb-bg rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">📅</span>
          </div>
          <p className="text-sm font-medium text-cb-text-secondary">
            No upcoming lessons
          </p>
          <p className="text-xs text-cb-text-muted mt-1 mb-4">
            When students book a lesson, it will appear here.
          </p>
          {!shouldShowNudge && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <a
                href="#booking-link"
                className="text-sm px-4 py-2 rounded-lg bg-coral text-white hover:bg-coral-dark transition-colors font-medium"
              >
                Share booking link
              </a>
              {coachSlug && (
                <Link
                  href={`/c/${coachSlug}`}
                  target="_blank"
                  className="text-xs text-cb-text-secondary hover:text-coral transition-colors"
                >
                  View booking page →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Group lessons by date
  const groupedLessons = lessons.reduce(
    (groups, lesson) => {
      const dateLabel = getRelativeDateLabel(lesson.scheduled_start, timezone);
      if (!groups[dateLabel]) {
        groups[dateLabel] = [];
      }
      groups[dateLabel].push(lesson);
      return groups;
    },
    {} as Record<string, UpcomingLesson[]>
  );

  return (
    <div className="card p-6 flex flex-col" style={{ maxHeight: "400px" }}>
      <h2 className="text-lg font-semibold text-cb-text mb-4 flex-shrink-0">
        Upcoming Lessons
      </h2>

      <div className="space-y-6 overflow-y-auto flex-1 pr-1">
        {Object.entries(groupedLessons).map(([dateLabel, dateLessons]) => (
          <div key={dateLabel}>
            <h3 className="text-xs font-semibold text-cb-text-secondary uppercase tracking-wider mb-3">
              {dateLabel}
            </h3>
            <div className="space-y-3">
              {dateLessons.map((lesson) => {
                const time = new Date(lesson.scheduled_start).toLocaleString(
                  "en-US",
                  {
                    timeZone: timezone,
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  }
                );

                return (
                  <div
                    key={lesson.id}
                    className="p-3 bg-cb-bg rounded-lg flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 font-semibold text-xs">
                        {time}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-cb-text">
                        {lesson.student_name}
                      </p>
                      <p className="text-xs text-cb-text-muted">
                        {lesson.duration_minutes} min
                      </p>
                    </div>
                    {lesson.meeting_url && (
                      <a
                        href={lesson.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg bg-coral text-white hover:bg-coral-dark transition-colors font-medium flex-shrink-0"
                      >
                        Join
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
