"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDateTimeForCoach, getRelativeTimeAgo } from "@/lib/timezone";
import {
  updateCoachNotes,
  markLessonCompleted,
  sendLessonRecap,
} from "./actions";

// Toast notification component
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          type === "success"
            ? "bg-green-600 text-white"
            : "bg-red-600 text-white"
        }`}
      >
        {type === "success" ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 text-white/80 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface PastLesson {
  id: string;
  student_name: string;
  student_email: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  status: string;
  coach_notes: string | null;
  student_recap: string | null;
  recap_sent_at: string | null;
}

interface PastLessonsProps {
  lessons: PastLesson[];
  timezone: string;
  studentLastLesson?: Record<string, string>; // student_email -> last completed lesson date
  allLessons?: PastLesson[]; // All lessons for student history view
}

/**
 * Generate a student-friendly recap from coach notes
 * Transforms private notes into a warm, encouraging summary
 */
function generateRecapFromNotes(notes: string): string {
  if (!notes.trim()) return "";

  // Clean up the notes and make them student-friendly
  let recap = notes.trim();

  // Replace negative framing with constructive framing
  const replacements: [RegExp, string][] = [
    [/\bneed to work on\b/gi, "focus area:"],
    [/\bstruggling with\b/gi, "practicing"],
    [/\bweak at\b/gi, "developing"],
  ];

  for (const [pattern, replacement] of replacements) {
    recap = recap.replace(pattern, replacement);
  }

  // Split into sentences/points and clean up
  const lines = recap
    .split(/[.\n]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return "";

  // Build a friendly recap structure
  const recapParts: string[] = [];

  // Add what was covered
  if (lines.length > 0) {
    recapParts.push("What we covered:");
    lines.slice(0, 3).forEach((line) => {
      recapParts.push(`• ${line.charAt(0).toUpperCase() + line.slice(1)}`);
    });
  }

  // Add practice suggestions if there are more points
  if (lines.length > 3) {
    recapParts.push("");
    recapParts.push("To practice before next time:");
    lines.slice(3, 5).forEach((line) => {
      recapParts.push(`• ${line.charAt(0).toUpperCase() + line.slice(1)}`);
    });
  }

  // Add encouraging closing
  recapParts.push("");
  recapParts.push("Keep up the great work!");

  return recapParts.join("\n");
}

// Combined Lesson Notes & Recap Modal
function LessonNotesRecapModal({
  lesson,
  timezone,
  onClose,
  onSuccess,
  onError,
}: {
  lesson: PastLesson;
  timezone: string;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const [notes, setNotes] = useState(lesson.coach_notes || "");
  const [recap, setRecap] = useState(lesson.student_recap || "");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [recapSending, setRecapSending] = useState(false);
  const [recapSent, setRecapSent] = useState(!!lesson.recap_sent_at);
  const [error, setError] = useState<string | null>(null);

  const lessonDate = formatDateTimeForCoach(lesson.scheduled_start, timezone);

  // Auto-save notes when they change (debounced)
  const handleNotesChange = (value: string) => {
    setNotes(value);
    setNotesSaved(false);
  };

  const handleSaveNotes = async () => {
    if (notesSaving) return;

    setNotesSaving(true);
    setError(null);

    const result = await updateCoachNotes(lesson.id, notes);

    if (result.success) {
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } else {
      setError(result.error || "Failed to save notes");
    }

    setNotesSaving(false);
  };

  const handleGenerateRecap = () => {
    if (!notes.trim()) {
      setError("Add some coach notes first to generate a recap");
      return;
    }
    setError(null);
    const generated = generateRecapFromNotes(notes);
    setRecap(generated);
  };

  const handleSendRecap = async () => {
    if (!recap.trim()) {
      setError("Please enter a recap message");
      return;
    }

    setRecapSending(true);
    setError(null);

    const result = await sendLessonRecap(lesson.id, recap);

    if (result.success) {
      setRecapSent(true);
      onSuccess();
    } else {
      const errorMessage = result.error || "Failed to send recap";
      setError(errorMessage);
      onError(errorMessage);
    }

    setRecapSending(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg mx-4 shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-cb-border-light flex-shrink-0">
          <h3 className="text-lg font-semibold text-cb-text">
            Lesson notes & recap
          </h3>
          <p className="text-sm text-cb-text-secondary mt-1">
            {lesson.student_name} · {lessonDate}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-2 text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          )}

          {/* Coach Notes Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-cb-text">
                Coach notes <span className="text-cb-text-muted font-normal">(private)</span>
              </label>
              <div className="flex items-center gap-2">
                {notesSaved && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved
                  </span>
                )}
                <button
                  onClick={handleSaveNotes}
                  disabled={notesSaving}
                  className="text-xs px-2 py-1 text-coral hover:text-coral-dark transition-colors disabled:opacity-50"
                >
                  {notesSaving ? "Saving..." : "Save notes"}
                </button>
              </div>
            </div>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Covered opening principles, practiced knight forks, needs work on endgame technique..."
              className="w-full h-28 px-3 py-2 border border-cb-border rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none text-sm"
            />
            <p className="text-xs text-cb-text-muted mt-1">
              Only you can see these notes. Use them to track progress and prepare for future lessons.
            </p>
          </div>

          {/* Divider with Generate button */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-cb-border-light" />
            <button
              onClick={handleGenerateRecap}
              disabled={!notes.trim()}
              className="text-xs px-3 py-1.5 rounded-full border border-cb-border text-cb-text-secondary hover:bg-cb-bg hover:text-cb-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              Generate student recap
            </button>
            <div className="flex-1 border-t border-cb-border-light" />
          </div>

          {/* Student Recap Section */}
          <div>
            <label className="text-sm font-medium text-cb-text mb-2 block">
              Student recap
            </label>
            <textarea
              value={recap}
              onChange={(e) => setRecap(e.target.value)}
              placeholder="Write a friendly summary of the lesson for your student..."
              className="w-full h-36 px-3 py-2 border border-cb-border rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none text-sm"
            />
            <p className="text-xs text-cb-text-muted mt-1">
              This will be emailed to {lesson.student_email}
            </p>
          </div>

          {/* Recap sent confirmation */}
          {recapSent && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Recap sent to student
              </p>
              {lesson.recap_sent_at && (
                <p className="text-xs text-green-600 mt-1 ml-6">
                  {new Date(lesson.recap_sent_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-cb-border-light flex-shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-cb-text-secondary border border-cb-border rounded-lg hover:bg-cb-bg transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSendRecap}
              disabled={recapSending || !recap.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-coral rounded-lg hover:bg-coral-dark transition-colors disabled:opacity-50"
            >
              {recapSending ? "Sending..." : recapSent ? "Resend recap" : "Send recap to student"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Timeline item types - only coach actions (notes, recap sends)
type TimelineItem = {
  type: "notes" | "recap";
  timestamp: Date;
  lesson: PastLesson;
};

// Build timeline items for a lesson (coach actions only), ordered oldest → newest
function buildLessonTimeline(lesson: PastLesson): TimelineItem[] {
  const items: TimelineItem[] = [];

  // Coach notes (if any) - use lesson end time as proxy since we don't track edit time
  if (lesson.coach_notes) {
    items.push({
      type: "notes",
      timestamp: new Date(lesson.scheduled_end),
      lesson,
    });
  }

  // Recap sent (if any)
  if (lesson.recap_sent_at) {
    items.push({
      type: "recap",
      timestamp: new Date(lesson.recap_sent_at),
      lesson,
    });
  }

  // Sort oldest → newest
  return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

// Timeline item component - for coach actions only (notes, recap)
function TimelineItemView({
  item,
  timezone,
  isLast,
}: {
  item: TimelineItem;
  timezone: string;
  isLast: boolean;
}) {
  const formatTimestamp = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      timeZone: timezone,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex gap-3">
      {/* Timeline dot and line */}
      <div className="flex flex-col items-center">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${
          item.type === "notes" ? "bg-coral" : "bg-blue-500"
        }`} />
        {!isLast && (
          <div className="w-px flex-1 bg-cb-border-light min-h-[16px]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        {item.type === "notes" && (
          <>
            <p className="text-sm font-medium text-cb-text">Coach notes</p>
            <p className="text-xs text-cb-text-secondary mt-1 leading-relaxed">
              {item.lesson.coach_notes}
            </p>
          </>
        )}

        {item.type === "recap" && (
          <>
            <p className="text-sm font-medium text-cb-text">Recap sent</p>
            <p className="text-xs text-cb-text-muted mt-0.5">
              {formatTimestamp(item.timestamp)} · Sent to {item.lesson.student_email}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// Student History Modal with Timeline
function StudentHistoryModal({
  studentName,
  studentEmail,
  lessons,
  timezone,
  onClose,
}: {
  studentName: string;
  studentEmail: string;
  lessons: PastLesson[];
  timezone: string;
  onClose: () => void;
}) {
  // Filter lessons for this student and sort by date (oldest first for timeline)
  const studentLessons = lessons
    .filter((l) => l.student_email === studentEmail)
    .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());

  // Build all timeline items across all lessons
  const allTimelineItems: { lesson: PastLesson; items: TimelineItem[] }[] = studentLessons.map(
    (lesson) => ({
      lesson,
      items: buildLessonTimeline(lesson),
    })
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-lg mx-4 shadow-xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cb-border-light flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-cb-text">
              Session Timeline
            </h3>
            <p className="text-sm text-cb-text-secondary mt-0.5">
              {studentName}
            </p>
            <p className="text-xs text-cb-text-muted">
              {studentEmail}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-cb-bg transition-colors text-cb-text-muted"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-4">
          {studentLessons.length === 0 ? (
            <p className="text-sm text-cb-text-muted text-center py-4">
              No sessions found for this student.
            </p>
          ) : (
            <div className="space-y-5">
              {allTimelineItems.map(({ lesson, items }) => {
                const lessonDate = new Date(lesson.scheduled_start).toLocaleDateString("en-US", {
                  timeZone: timezone,
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: studentLessons.length > 1 &&
                    new Date(studentLessons[0].scheduled_start).getFullYear() !==
                    new Date(studentLessons[studentLessons.length - 1].scheduled_start).getFullYear()
                    ? "numeric"
                    : undefined,
                });

                const lessonTime = new Date(lesson.scheduled_start).toLocaleString("en-US", {
                  timeZone: timezone,
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                });

                const isCompleted = lesson.status === "completed";

                return (
                  <div key={lesson.id} className="bg-cb-bg/50 rounded-lg p-3">
                    {/* Session header with context */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="text-sm font-medium text-cb-text">
                          {lessonDate}
                        </p>
                        <p className="text-xs text-cb-text-muted mt-0.5">
                          {lessonTime} · {lesson.duration_minutes} min
                        </p>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                        isCompleted
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {isCompleted ? "Completed" : "Confirmed"}
                      </span>
                    </div>

                    {/* Coach actions timeline */}
                    {items.length > 0 ? (
                      <div className="ml-1 border-l-2 border-cb-border-light pl-3">
                        {items.map((item, itemIndex) => (
                          <TimelineItemView
                            key={`${item.type}-${item.timestamp.getTime()}`}
                            item={item}
                            timezone={timezone}
                            isLast={itemIndex === items.length - 1}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-cb-text-muted italic ml-1">
                        No notes yet
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cb-border-light flex-shrink-0">
          <p className="text-xs text-cb-text-muted text-center">
            {studentLessons.length} session{studentLessons.length !== 1 ? "s" : ""} · Oldest → Newest
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PastLessons({
  lessons,
  timezone,
  studentLastLesson = {},
  allLessons = [],
}: PastLessonsProps) {
  const router = useRouter();
  const [lessonModal, setLessonModal] = useState<PastLesson | null>(null);
  const [historyModal, setHistoryModal] = useState<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  const handleMarkCompleted = async (lesson: PastLesson) => {
    const confirmed = confirm("Mark this lesson as completed?");
    if (!confirmed) return;

    setLoading(lesson.id);
    setError(null);

    const result = await markLessonCompleted(lesson.id);

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || "Failed to mark lesson as completed");
    }

    setLoading(null);
  };

  if (lessons.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-cb-text mb-4">
          Past Lessons
        </h2>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-cb-bg rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">📋</span>
          </div>
          <p className="text-sm font-medium text-cb-text-secondary">
            No past lessons yet
          </p>
          <p className="text-xs text-cb-text-muted mt-1">
            Completed lessons will appear here for notes, history, and recaps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 flex flex-col" style={{ maxHeight: "400px" }}>
      <h2 className="text-lg font-semibold text-cb-text mb-4 flex-shrink-0">
        Past Lessons
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex-shrink-0">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      <div className="space-y-2 overflow-y-auto flex-1 pr-1">
        {lessons.map((lesson) => {
          const dateTime = formatDateTimeForCoach(lesson.scheduled_start, timezone);
          const isCompleted = lesson.status === "completed";
          const lastLessonDate = studentLastLesson[lesson.student_email];
          // Only show "Last lesson" if it's different from the current lesson
          const isCurrentLessonTheLastOne = lastLessonDate === lesson.scheduled_start;
          const lastLessonText = lastLessonDate && !isCurrentLessonTheLastOne
            ? `Last lesson: ${getRelativeTimeAgo(lastLessonDate, timezone)}`
            : null;

          // Calculate retention signal based on days since last completed lesson
          let retentionSignal: { label: string; level: "warning" | "danger" } | null = null;
          if (lastLessonDate) {
            const daysSinceLastLesson = Math.floor(
              (Date.now() - new Date(lastLessonDate).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceLastLesson >= 30) {
              retentionSignal = { label: "⏳ No lesson in 30+ days", level: "danger" };
            } else if (daysSinceLastLesson >= 14) {
              retentionSignal = { label: "⏳ No lesson in 14+ days", level: "warning" };
            }
          }

          return (
            <div
              key={lesson.id}
              className="py-2"
            >
              <div className="flex items-start gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isCompleted ? "bg-green-50" : "bg-amber-50"
                }`}>
                  {isCompleted ? (
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cb-text">
                    {lesson.student_name}
                  </p>
                  <p className="text-xs text-cb-text-muted">
                    {dateTime} · {lesson.duration_minutes} min
                  </p>
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      isCompleted
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {isCompleted ? "✅ Completed" : "Needs review"}
                    </span>
                    {retentionSignal && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        retentionSignal.level === "danger"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {retentionSignal.label}
                      </span>
                    )}
                    {lesson.coach_notes && (
                      <span className="w-1.5 h-1.5 bg-coral rounded-full" title="Has notes" />
                    )}
                  </div>
                  {lastLessonText && (
                    <p className="text-xs text-cb-text-muted mt-1">
                      {lastLessonText}
                    </p>
                  )}
                </div>
                {/* Action buttons */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="flex flex-wrap items-center gap-1">
                    {/* Complete button - only for confirmed lessons */}
                    {!isCompleted && (
                      <button
                        onClick={() => handleMarkCompleted(lesson)}
                        disabled={loading === lesson.id}
                        className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                        title="Mark as completed"
                      >
                        ✓ Complete
                      </button>
                    )}
                    {/* History button */}
                    <button
                      onClick={() => setHistoryModal({ name: lesson.student_name, email: lesson.student_email })}
                      className="text-xs px-1.5 py-0.5 rounded bg-white border border-cb-border text-cb-text-secondary hover:bg-cb-bg transition-colors"
                      title="View student history"
                    >
                      📚 History
                    </button>
                    {/* Notes & Recap button */}
                    <button
                      onClick={() => setLessonModal(lesson)}
                      className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                        lesson.coach_notes || lesson.recap_sent_at
                          ? "bg-coral-light text-coral hover:bg-coral/20"
                          : "bg-coral text-white hover:bg-coral-dark"
                      }`}
                      title="Lesson notes & recap"
                    >
                      📝 Notes & recap
                    </button>
                  </div>
                  {/* Last sent indicator */}
                  {lesson.recap_sent_at && (
                    <span className="text-[10px] text-cb-text-muted">
                      Last sent {new Date(lesson.recap_sent_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lesson Notes & Recap Modal */}
      {lessonModal && (
        <LessonNotesRecapModal
          lesson={lessonModal}
          timezone={timezone}
          onClose={() => setLessonModal(null)}
          onSuccess={() => {
            showToast("Recap sent to student", "success");
            router.refresh();
          }}
          onError={(message: string) => showToast(message, "error")}
        />
      )}

      {/* Student History Modal */}
      {historyModal && (
        <StudentHistoryModal
          studentName={historyModal.name}
          studentEmail={historyModal.email}
          lessons={allLessons}
          timezone={timezone}
          onClose={() => setHistoryModal(null)}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
