"use client";

import { formatDateTimeForCoach, getRelativeDateLabel } from "@/lib/timezone";

interface UpcomingLesson {
  id: string;
  student_name: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
}

interface CoachHeaderProps {
  coachName: string;
  timezone: string;
  nextLesson: UpcomingLesson | null;
}

export default function CoachHeader({
  coachName,
  timezone,
  nextLesson,
}: CoachHeaderProps) {
  return (
    <div className="card p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-cb-text">
            Welcome, {coachName}
          </h1>
          <p className="text-sm text-cb-text-secondary mt-1">
            Timezone: {timezone}
          </p>
        </div>

        {nextLesson ? (
          <div className="bg-coral-light rounded-lg p-4 sm:text-right">
            <p className="text-xs font-semibold text-coral uppercase tracking-wider mb-1">
              Next Lesson
            </p>
            <p className="text-sm font-medium text-cb-text">
              {nextLesson.student_name}
            </p>
            <p className="text-sm text-cb-text-secondary">
              {getRelativeDateLabel(nextLesson.scheduled_start, timezone)} at{" "}
              {formatDateTimeForCoach(nextLesson.scheduled_start, timezone).split(", ").pop()}
            </p>
            <p className="text-xs text-cb-text-muted mt-0.5">
              {nextLesson.duration_minutes} minutes
            </p>
          </div>
        ) : (
          <div className="bg-cb-bg rounded-lg p-4 sm:text-right">
            <p className="text-xs font-semibold text-cb-text-muted uppercase tracking-wider mb-1">
              Next Lesson
            </p>
            <p className="text-sm text-cb-text-secondary">
              No upcoming lessons
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
