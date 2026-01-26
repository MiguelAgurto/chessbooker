"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTimeForCoach, getRelativeTimeAgo } from "@/lib/timezone";
import {
  updateCoachNotes,
  markLessonCompleted,
  sendLessonRecap,
} from "./actions";

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

// Coach Notes Modal
function CoachNotesModal({
  lesson,
  onClose,
}: {
  lesson: PastLesson;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(lesson.coach_notes || "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSaved(false);

    const result = await updateCoachNotes(lesson.id, notes);

    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError(result.error || "Failed to save notes");
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-cb-text mb-2">
          Coach Notes
        </h3>
        <p className="text-sm text-cb-text-secondary mb-4">
          Private notes for session with <strong>{lesson.student_name}</strong>
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add your notes here... (only visible to you)"
          className="w-full h-32 px-3 py-2 border border-cb-border rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none text-sm"
        />

        <div className="flex items-center justify-between mt-4">
          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
          {!saved && <span />}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-cb-text-secondary border border-cb-border rounded-lg hover:bg-cb-bg transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-coral rounded-lg hover:bg-coral-dark transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Send Recap Modal
function RecapModal({
  lesson,
  timezone,
  onClose,
  onSuccess,
}: {
  lesson: PastLesson;
  timezone: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [recap, setRecap] = useState(lesson.student_recap || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadySent = !!lesson.recap_sent_at;

  const handleSend = async () => {
    if (!recap.trim()) {
      setError("Please enter a recap message");
      return;
    }

    if (alreadySent) {
      const confirmed = confirm(
        "A recap was already sent for this lesson. Send again?"
      );
      if (!confirmed) return;
    }

    setLoading(true);
    setError(null);

    const result = await sendLessonRecap(lesson.id, recap);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || "Failed to send recap");
    }

    setLoading(false);
  };

  const lessonDate = formatDateTimeForCoach(lesson.scheduled_start, timezone);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-cb-text mb-2">
          Send Lesson Recap
        </h3>
        <p className="text-sm text-cb-text-secondary mb-1">
          Session with <strong>{lesson.student_name}</strong>
        </p>
        <p className="text-xs text-cb-text-muted mb-4">
          {lessonDate}
        </p>

        {alreadySent && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Recap sent on{" "}
              {new Date(lesson.recap_sent_at!).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <textarea
          value={recap}
          onChange={(e) => setRecap(e.target.value)}
          placeholder="Write your lesson recap for the student..."
          className="w-full h-40 px-3 py-2 border border-cb-border rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none text-sm"
        />

        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-cb-text-secondary border border-cb-border rounded-lg hover:bg-cb-bg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !recap.trim()}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-coral rounded-lg hover:bg-coral-dark transition-colors disabled:opacity-50"
          >
            {loading ? "Sending..." : alreadySent ? "Resend recap" : "Send recap"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Student History Modal
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
  // Filter lessons for this student and sort by date (most recent first)
  const studentLessons = lessons
    .filter((l) => l.student_email === studentEmail)
    .sort((a, b) => new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime());

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
              Student History
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

        {/* Lesson list */}
        <div className="flex-1 overflow-y-auto p-4">
          {studentLessons.length === 0 ? (
            <p className="text-sm text-cb-text-muted text-center py-4">
              No lessons found for this student.
            </p>
          ) : (
            <div className="space-y-3">
              {studentLessons.map((lesson) => {
                const dateTime = formatDateTimeForCoach(lesson.scheduled_start, timezone);
                const isCompleted = lesson.status === "completed";

                return (
                  <div key={lesson.id} className="p-3 bg-cb-bg rounded-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-cb-text">
                          {dateTime}
                        </p>
                        <p className="text-xs text-cb-text-muted">
                          {lesson.duration_minutes} min
                        </p>
                        <div className="flex items-center flex-wrap gap-2 mt-1.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            isCompleted
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {isCompleted ? "Completed" : "Confirmed"}
                          </span>
                          {lesson.recap_sent_at && (
                            <span className="text-xs text-green-600">Recap sent</span>
                          )}
                        </div>
                        {lesson.coach_notes && (
                          <p className="text-xs text-cb-text-muted mt-2 italic border-l-2 border-cb-border pl-2">
                            {lesson.coach_notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cb-border-light flex-shrink-0">
          <p className="text-xs text-cb-text-muted text-center">
            {studentLessons.length} lesson{studentLessons.length !== 1 ? "s" : ""} total
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
  const [notesModal, setNotesModal] = useState<PastLesson | null>(null);
  const [recapModal, setRecapModal] = useState<PastLesson | null>(null);
  const [historyModal, setHistoryModal] = useState<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
            <svg className="w-6 h-6 text-cb-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-cb-text-secondary">
            No past lessons yet
          </p>
          <p className="text-xs text-cb-text-muted mt-1">
            Completed sessions will appear here
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

      <div className="space-y-3 overflow-y-auto flex-1 pr-1">
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
              className="py-3"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isCompleted ? "bg-green-50" : "bg-amber-50"
                }`}>
                  {isCompleted ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    {lesson.recap_sent_at && (
                      <span className="text-xs text-green-600">📩 Recap sent</span>
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
                <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                  {/* Complete button - only for confirmed lessons */}
                  {!isCompleted && (
                    <button
                      onClick={() => handleMarkCompleted(lesson)}
                      disabled={loading === lesson.id}
                      className="text-xs px-2 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                      title="Mark as completed"
                    >
                      ✓ Complete
                    </button>
                  )}
                  {/* History button */}
                  <button
                    onClick={() => setHistoryModal({ name: lesson.student_name, email: lesson.student_email })}
                    className="text-xs px-2 py-1 rounded-md bg-white border border-cb-border text-cb-text-secondary hover:bg-cb-bg transition-colors"
                    title="View student history"
                  >
                    📚 History
                  </button>
                  {/* Notes button */}
                  <button
                    onClick={() => setNotesModal(lesson)}
                    className={`text-xs px-2 py-1 rounded-md transition-colors ${
                      lesson.coach_notes
                        ? "bg-coral-light text-coral hover:bg-coral/20"
                        : "bg-white border border-cb-border text-cb-text-secondary hover:bg-cb-bg"
                    }`}
                    title="Coach notes"
                  >
                    📝 Notes
                  </button>
                  {/* Recap button */}
                  <button
                    onClick={() => setRecapModal(lesson)}
                    className={`text-xs px-2 py-1 rounded-md transition-colors ${
                      lesson.recap_sent_at
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-coral text-white hover:bg-coral-dark"
                    }`}
                    title="Send recap"
                  >
                    ✉️ Recap
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Coach Notes Modal */}
      {notesModal && (
        <CoachNotesModal
          lesson={notesModal}
          onClose={() => setNotesModal(null)}
        />
      )}

      {/* Recap Modal */}
      {recapModal && (
        <RecapModal
          lesson={recapModal}
          timezone={timezone}
          onClose={() => setRecapModal(null)}
          onSuccess={() => router.refresh()}
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
    </div>
  );
}
