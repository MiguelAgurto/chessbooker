"use client";

import { getRelativeDateLabel } from "@/lib/timezone";

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
  lastLessonDate?: string;
}

export default function UpcomingLessons({
  lessons,
  timezone,
}: UpcomingLessonsProps) {
  if (lessons.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-cb-text mb-4">
          Upcoming Lessons
        </h2>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-cb-bg rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">📅</span>
          </div>
          <p className="text-sm font-medium text-cb-text-secondary">
            No upcoming lessons
          </p>
          <p className="text-xs text-cb-text-muted mt-1">
            When you confirm a lesson, it will appear here.
          </p>
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

      <div className="space-y-5 overflow-y-auto flex-1 pr-1">
        {Object.entries(groupedLessons).map(([dateLabel, dateLessons]) => (
          <div key={dateLabel}>
            <h3 className="text-xs font-semibold text-cb-text-secondary uppercase tracking-wider mb-3">
              {dateLabel}
            </h3>
            <div className="space-y-3">
              {dateLessons.map((lesson) => {
                const startTime = new Date(lesson.scheduled_start).toLocaleString(
                  "en-US",
                  {
                    timeZone: timezone,
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  }
                );
                const endTime = new Date(lesson.scheduled_end).toLocaleString(
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
                    className="p-4 bg-cb-bg rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-cb-text">
                          {lesson.student_name}
                        </p>
                        <p className="text-xs text-cb-text-muted mt-0.5">
                          {lesson.student_email}
                        </p>
                        <p className="text-sm text-cb-text-secondary mt-2">
                          {startTime} – {endTime}
                          <span className="text-cb-text-muted ml-2">
                            ({lesson.duration_minutes} min)
                          </span>
                        </p>
                      </div>
                      {lesson.meeting_url && (
                        <a
                          href={lesson.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm px-4 py-2 rounded-lg bg-coral text-white hover:bg-coral-dark transition-colors font-medium flex-shrink-0"
                        >
                          Join lesson
                        </a>
                      )}
                    </div>
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
