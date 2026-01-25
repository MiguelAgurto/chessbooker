"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDateTimeForCoach, getRelativeDateLabel } from "@/lib/timezone";
import {
  updateCoachNotes,
  markLessonCompleted,
  sendLessonRecap,
} from "./actions";

interface UpcomingLesson {
  id: string;
  student_name: string;
  student_email: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  meeting_url: string | null;
  coach_notes: string | null;
  student_recap: string | null;
  recap_sent_at: string | null;
}

interface UpcomingLessonsProps {
  lessons: UpcomingLesson[];
  timezone: string;
}

// Actions dropdown menu
function ActionsMenu({
  lesson,
  timezone,
  onOpenNotes,
  onOpenRecap,
  onMarkCompleted,
}: {
  lesson: UpcomingLesson;
  timezone: string;
  onOpenNotes: () => void;
  onOpenRecap: () => void;
  onMarkCompleted: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isPast = new Date(lesson.scheduled_start) < new Date();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg hover:bg-white transition-colors text-cb-text-muted hover:text-cb-text"
        title="Actions"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-cb-border-light z-10">
          <div className="py-1">
            {isPast && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onMarkCompleted();
                }}
                className="w-full text-left px-4 py-2 text-sm text-cb-text hover:bg-cb-bg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Mark completed
              </button>
            )}
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenNotes();
              }}
              className="w-full text-left px-4 py-2 text-sm text-cb-text hover:bg-cb-bg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-cb-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Coach notes
              {lesson.coach_notes && (
                <span className="ml-auto w-2 h-2 bg-coral rounded-full" />
              )}
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenRecap();
              }}
              className="w-full text-left px-4 py-2 text-sm text-cb-text hover:bg-cb-bg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-cb-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send recap
              {lesson.recap_sent_at && (
                <span className="ml-auto text-xs text-green-600">Sent</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Coach Notes Modal
function CoachNotesModal({
  lesson,
  onClose,
}: {
  lesson: UpcomingLesson;
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
  lesson: UpcomingLesson;
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

export default function UpcomingLessons({
  lessons,
  timezone,
}: UpcomingLessonsProps) {
  const router = useRouter();
  const [notesModal, setNotesModal] = useState<UpcomingLesson | null>(null);
  const [recapModal, setRecapModal] = useState<UpcomingLesson | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMarkCompleted = async (lesson: UpcomingLesson) => {
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
          Upcoming Lessons
        </h2>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-cb-bg rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-cb-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-cb-text-secondary">
            No upcoming lessons
          </p>
          <p className="text-xs text-cb-text-muted mt-1">
            Confirmed sessions will appear here
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

                    <div className="flex items-center gap-2">
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
                      <ActionsMenu
                        lesson={lesson}
                        timezone={timezone}
                        onOpenNotes={() => setNotesModal(lesson)}
                        onOpenRecap={() => setRecapModal(lesson)}
                        onMarkCompleted={() => handleMarkCompleted(lesson)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
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
    </div>
  );
}
