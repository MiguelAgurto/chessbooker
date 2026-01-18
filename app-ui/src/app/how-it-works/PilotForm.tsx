"use client";

import { useState } from "react";
import { submitPilotRequest } from "./actions";

export default function PilotForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    platform: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await submitPilotRequest(formData);

    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error || "Something went wrong");
    }

    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="card p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-cb-text mb-2">Request Received</h3>
        <p className="text-cb-text-secondary">
          Thanks for your interest in ChessBooker! We&apos;ll be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-5">
      <div>
        <label htmlFor="pilot-name" className="label">
          Name <span className="text-coral">*</span>
        </label>
        <input
          id="pilot-name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="input-field"
          placeholder="Your name"
          required
        />
      </div>

      <div>
        <label htmlFor="pilot-email" className="label">
          Email <span className="text-coral">*</span>
        </label>
        <input
          id="pilot-email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="input-field"
          placeholder="you@example.com"
          required
        />
      </div>

      <div>
        <label htmlFor="pilot-platform" className="label">
          Where do you coach? <span className="text-coral">*</span>
        </label>
        <select
          id="pilot-platform"
          value={formData.platform}
          onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
          className="input-field"
          required
        >
          <option value="">Select platform</option>
          <option value="lichess">Lichess</option>
          <option value="chess.com">Chess.com</option>
          <option value="both">Both Lichess and Chess.com</option>
          <option value="other">Other / In-person</option>
        </select>
      </div>

      <div>
        <label htmlFor="pilot-message" className="label">
          Message <span className="text-cb-text-muted">(optional)</span>
        </label>
        <textarea
          id="pilot-message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="input-field min-h-[100px] resize-y"
          placeholder="Tell us about your coaching practice, any specific needs, or questions..."
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full"
      >
        {isSubmitting ? "Submitting..." : "Join the Pilot"}
      </button>
    </form>
  );
}
