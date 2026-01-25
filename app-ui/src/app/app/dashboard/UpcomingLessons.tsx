"use client";

import { formatDateTimeForCoach, getRelativeDateLabel } from "@/lib/timezone";

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
        <p className="text-sm text-cb-text-secondary text-center py-4">
          No upcoming lessons scheduled
        </p>
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
                    className="flex items-center justify-between p-3 bg-cb-bg rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-green-600 font-semibold text-xs">
                          {time}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-cb-text">
                          {lesson.student_name}
                        </p>
                        <p className="text-xs text-cb-text-muted">
                          {lesson.duration_minutes} min
                        </p>
                      </div>
                    </div>

                    {lesson.meeting_url && (
                      <a
                        href={lesson.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 rounded bg-coral text-white hover:bg-coral-dark transition-colors"
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
