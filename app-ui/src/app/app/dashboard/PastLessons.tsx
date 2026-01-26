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
}

// Actions Modal - renders as overlay, not clipped by scroll container
function ActionsModal({
  lesson,
  timezone,
  onClose,
  onOpenNotes,
  onOpenRecap,
  onMarkCompleted,
  isMarkingComplete,
}: {
  lesson: PastLesson;
  timezone: string;
  onClose: () => void;
  onOpenNotes: () => void;
  onOpenRecap: () => void;
  onMarkCompleted: () => void;
  isMarkingComplete: boolean;
}) {
  const time = new Date(lesson.scheduled_start).toLocaleString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const isConfirmed = lesson.status === "confirmed";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div
        className="bg-white w-full sm:w-auto sm:min-w-[320px] sm:max-w-md sm:mx-4 sm:rounded-lg rounded-t-xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cb-border-light">
          <div>
            <h3 className="text-base font-semibold text-cb-text">
              Lesson Actions
            </h3>
            <p className="text-xs text-cb-text-muted mt-0.5">
              {lesson.student_name} · {time}
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

        {/* Action buttons */}
        <div className="p-2">
          {/* Mark completed - only for confirmed (not yet completed) lessons */}
          {isConfirmed && (
            <button
              onClick={() => {
                onClose();
                onMarkCompleted();
              }}
              disabled={isMarkingComplete}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-cb-bg transition-colors flex items-center gap-3 disabled:opacity-50"
            >
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-cb-text">Mark completed</p>
                <p className="text-xs text-cb-text-muted">Mark this lesson as done</p>
              </div>
            </button>
          )}

          {/* Coach notes */}
          <button
            onClick={() => {
              onClose();
              onOpenNotes();
            }}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-cb-bg transition-colors flex items-center gap-3"
          >
            <div className="w-8 h-8 bg-cb-bg rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-cb-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-cb-text">Coach notes</p>
              <p className="text-xs text-cb-text-muted">Private notes for this session</p>
            </div>
            {lesson.coach_notes && (
              <span className="w-2 h-2 bg-coral rounded-full" />
            )}
          </button>

          {/* Send recap */}
          <button
            onClick={() => {
              onClose();
              onOpenRecap();
            }}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-cb-bg transition-colors flex items-center gap-3"
          >
            <div className="w-8 h-8 bg-cb-bg rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-cb-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-cb-text">Send recap</p>
              <p className="text-xs text-cb-text-muted">Email lesson summary to student</p>
            </div>
            {lesson.recap_sent_at && (
              <span className="text-xs text-green-600 font-medium px-2 py-0.5 bg-green-50 rounded">Sent</span>
            )}
          </button>
        </div>

        {/* Cancel button for mobile */}
        <div className="p-2 pt-0 sm:hidden">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 text-sm font-medium text-cb-text-secondary border border-cb-border rounded-lg hover:bg-cb-bg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
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

export default function PastLessons({
  lessons,
  timezone,
  studentLastLesson = {},
}: PastLessonsProps) {
  const router = useRouter();
  const [actionsModal, setActionsModal] = useState<PastLesson | null>(null);
  const [notesModal, setNotesModal] = useState<PastLesson | null>(null);
  const [recapModal, setRecapModal] = useState<PastLesson | null>(null);
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

          return (
            <div
              key={lesson.id}
              className="p-3 bg-cb-bg rounded-lg"
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
                      {isCompleted ? "Completed" : "Needs review"}
                    </span>
                    {lesson.recap_sent_at && (
                      <span className="text-xs text-green-600">Recap sent</span>
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
                <button
                  onClick={() => setActionsModal(lesson)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-cb-border text-cb-text-secondary hover:border-coral hover:text-coral transition-colors flex items-center gap-1 flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                  Actions
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions Modal */}
      {actionsModal && (
        <ActionsModal
          lesson={actionsModal}
          timezone={timezone}
          onClose={() => setActionsModal(null)}
          onOpenNotes={() => setNotesModal(actionsModal)}
          onOpenRecap={() => setRecapModal(actionsModal)}
          onMarkCompleted={() => handleMarkCompleted(actionsModal)}
          isMarkingComplete={loading === actionsModal.id}
        />
      )}

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
    </div>
  );
}
