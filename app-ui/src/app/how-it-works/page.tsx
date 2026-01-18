import Link from "next/link";
import { Metadata } from "next";
import FAQAccordion from "./FAQAccordion";
import PilotForm from "./PilotForm";

export const metadata: Metadata = {
  title: "How ChessBooker Works | Chess Coaching Booking Platform",
  description:
    "Learn how ChessBooker automates your chess coaching workflow — from lesson requests to Google Calendar events and Meet links.",
};

function ChessIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 22H5v-2h14v2M17.16 8.26A4.54 4.54 0 0 0 15 3.5V2h-2v1.5c0 .55-.45 1-1 1s-1-.45-1-1V2H9v1.5A4.54 4.54 0 0 0 6.84 8.26 5.93 5.93 0 0 0 6 11.5c0 2.21 1.12 4.15 2.81 5.29l-.81.81V19h8v-1.4l-.81-.81A6.46 6.46 0 0 0 18 11.5c0-1.17-.29-2.27-.84-3.24Z" />
    </svg>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-cb-border-light sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-coral rounded-lg flex items-center justify-center">
                  <ChessIcon className="w-4 h-4 fill-white" />
                </div>
                <span className="text-lg font-bold text-cb-text">ChessBooker</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/how-it-works"
                className="text-coral font-medium text-sm hidden sm:block"
              >
                How it works
              </Link>
              <Link href="/login" className="btn-secondary text-sm px-5 py-2">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-display text-4xl sm:text-5xl text-cb-text mb-6">
            How ChessBooker Works
          </h1>
          <p className="text-xl text-cb-text-secondary mb-10 max-w-2xl mx-auto">
            From lesson request to Google Meet + Calendar — automated.
          </p>
          <a href="#pilot-form" className="btn-primary">
            Join the pilot
          </a>
        </div>
      </section>

      {/* Lesson Lifecycle Section */}
      <section className="py-16 bg-cb-bg px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl text-cb-text text-center mb-4">
            The full lesson lifecycle
          </h2>
          <p className="text-cb-text-secondary text-center mb-12 max-w-2xl mx-auto">
            Every step from request to completion, handled automatically.
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Step A */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-coral-light rounded-full flex items-center justify-center text-coral font-bold">
                  A
                </div>
                <h3 className="font-semibold text-cb-text text-lg">
                  Student sends a request
                </h3>
              </div>
              <ul className="space-y-2 text-sm text-cb-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-coral mt-0.5">•</span>
                  Captures student name, email, timezone
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-coral mt-0.5">•</span>
                  Requested times and session duration
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-coral mt-0.5">•</span>
                  Stored as a booking request for your review
                </li>
              </ul>
            </div>

            {/* Step B */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-coral-light rounded-full flex items-center justify-center text-coral font-bold">
                  B
                </div>
                <h3 className="font-semibold text-cb-text text-lg">Coach accepts</h3>
              </div>
              <ul className="space-y-2 text-sm text-cb-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-coral mt-0.5">•</span>
                  Status becomes <code className="bg-cb-bg-alt px-1.5 py-0.5 rounded text-xs">accepted</code>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-coral mt-0.5">•</span>
                  <code className="bg-cb-bg-alt px-1.5 py-0.5 rounded text-xs">scheduled_start</code> and{" "}
                  <code className="bg-cb-bg-alt px-1.5 py-0.5 rounded text-xs">scheduled_end</code> saved
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-coral mt-0.5">•</span>
                  Google Calendar event created with Meet link
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-coral mt-0.5">•</span>
                  Confirmation emails sent to both parties
                </li>
              </ul>
            </div>

            {/* Step C */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-coral-light rounded-full flex items-center justify-center text-coral font-bold">
                  C
                </div>
                <h3 className="font-semibold text-cb-text text-lg">Reschedule</h3>
              </div>
              <ul className="space-y-2 text-sm text-cb-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-coral mt-0.5">•</span>
                  Coach selects a new date and time
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-coral mt-0.5">•</span>
                  <code className="bg-cb-bg-alt px-1.5 py-0.5 rounded text-xs">scheduled_start</code> /{" "}
                  <code className="bg-cb-bg-alt px-1.5 py-0.5 rounded text-xs">end</code> updated
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-coral mt-0.5">•</span>
                  Existing Google event patched (Meet link preserved)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-coral mt-0.5">•</span>
                  Reschedule emails sent automatically
                </li>
              </ul>
            </div>

            {/* Step D */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-coral-light rounded-full flex items-center justify-center text-coral font-bold">
                  D
                </div>
                <h3 className="font-semibold text-cb-text text-lg">Cancel</h3>
              </div>
              <ul className="space-y-2 text-sm text-cb-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-coral mt-0.5">•</span>
                  Status becomes <code className="bg-cb-bg-alt px-1.5 py-0.5 rounded text-xs">declined</code>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-coral mt-0.5">•</span>
                  Google Calendar event deleted (if exists)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-coral mt-0.5">•</span>
                  Cancellation emails sent to both parties
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-coral mt-0.5">•</span>
                  Booking updates never blocked by Google failures
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Coach Experience Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl text-cb-text text-center mb-4">
            Coach experience
          </h2>
          <p className="text-cb-text-secondary text-center mb-12 max-w-2xl mx-auto">
            A simple, focused dashboard built for coaches.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-5 text-center">
              <div className="w-12 h-12 bg-coral-light rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="font-semibold text-cb-text text-sm mb-1">Meet link visible</h4>
              <p className="text-xs text-cb-text-muted">Inside booking details</p>
            </div>

            <div className="card p-5 text-center">
              <div className="w-12 h-12 bg-coral-light rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="font-semibold text-cb-text text-sm mb-1">Copy / Open</h4>
              <p className="text-xs text-cb-text-muted">Quick Meet link actions</p>
            </div>

            <div className="card p-5 text-center">
              <div className="w-12 h-12 bg-coral-light rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="font-semibold text-cb-text text-sm mb-1">Open in Calendar</h4>
              <p className="text-xs text-cb-text-muted">Date-based view link</p>
            </div>

            <div className="card p-5 text-center">
              <div className="w-12 h-12 bg-coral-light rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="font-semibold text-cb-text text-sm mb-1">Graceful fallback</h4>
              <p className="text-xs text-cb-text-muted">If Meet link unavailable</p>
            </div>
          </div>
        </div>
      </section>

      {/* Google Integration Section */}
      <section className="py-16 bg-cb-bg px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl text-cb-text text-center mb-4">
            Google Calendar &amp; Meet integration
          </h2>
          <p className="text-cb-text-secondary text-center mb-10">
            Connect once, automate forever.
          </p>

          <div className="card p-6 sm:p-8">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-coral-light rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-coral font-semibold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-cb-text mb-1">
                    Connect your Google account once
                  </h4>
                  <p className="text-sm text-cb-text-secondary">
                    One-click OAuth flow from your Settings page. Only calendar access is requested — not your email or other data.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-coral-light rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-coral font-semibold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-cb-text mb-1">
                    Tokens stored securely
                  </h4>
                  <p className="text-sm text-cb-text-secondary">
                    Refresh tokens are encrypted and used server-side only. Your credentials never touch the browser.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-coral-light rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-coral font-semibold text-sm">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-cb-text mb-1">
                    Events created automatically
                  </h4>
                  <p className="text-sm text-cb-text-secondary">
                    Accept a booking → calendar event with Meet link appears instantly. Reschedule or cancel → event is updated or deleted.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reliability Section */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl text-cb-text text-center mb-4">
            Reliability promise
          </h2>
          <p className="text-cb-text-secondary text-center mb-10">
            Your bookings always go through.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-5">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="font-semibold text-cb-text text-sm mb-2">
                Google failures never block bookings
              </h4>
              <p className="text-xs text-cb-text-muted">
                If Google API is down, your booking still saves. Calendar sync is attempted but not required.
              </p>
            </div>

            <div className="card p-5">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="font-semibold text-cb-text text-sm mb-2">
                Emails always send
              </h4>
              <p className="text-xs text-cb-text-muted">
                Confirmation and notification emails are sent even if Google Calendar sync fails.
              </p>
            </div>

            <div className="card p-5">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="font-semibold text-cb-text text-sm mb-2">
                Errors are logged
              </h4>
              <p className="text-xs text-cb-text-muted">
                Any Google sync issues are logged server-side. Your coach flow continues uninterrupted.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="py-16 bg-cb-bg px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl text-cb-text text-center mb-4">
            What&apos;s next
          </h2>
          <p className="text-cb-text-secondary text-center mb-10">
            Features we&apos;re building next.
          </p>

          <div className="card p-6 sm:p-8">
            <ul className="space-y-4">
              <li className="flex items-center gap-4">
                <div className="w-10 h-10 bg-coral-light rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-cb-text">Payments (Stripe)</h4>
                  <p className="text-sm text-cb-text-secondary">
                    Pay-before-accept model — students pay upfront, you confirm.
                  </p>
                </div>
              </li>

              <li className="flex items-center gap-4">
                <div className="w-10 h-10 bg-coral-light rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-cb-text">Reminders</h4>
                  <p className="text-sm text-cb-text-secondary">
                    Automated 24h and 1h email reminders before sessions.
                  </p>
                </div>
              </li>

              <li className="flex items-center gap-4">
                <div className="w-10 h-10 bg-cb-bg-alt rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-cb-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-cb-text-secondary">
                    Packages &amp; subscriptions
                  </h4>
                  <p className="text-sm text-cb-text-muted">
                    Sell bundles of lessons or recurring coaching plans. (Later)
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl text-cb-text text-center mb-4">
            Frequently asked questions
          </h2>
          <p className="text-cb-text-secondary text-center mb-10">
            Common questions from coaches.
          </p>

          <FAQAccordion />
        </div>
      </section>

      {/* Pilot Form Section */}
      <section id="pilot-form" className="py-16 bg-cb-bg px-4 scroll-mt-20">
        <div className="max-w-lg mx-auto">
          <h2 className="font-display text-3xl text-cb-text text-center mb-4">
            Join the pilot
          </h2>
          <p className="text-cb-text-secondary text-center mb-10">
            We&apos;re looking for chess coaches to try ChessBooker and share feedback.
          </p>

          <PilotForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-cb-border-light">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-coral rounded-md flex items-center justify-center">
              <ChessIcon className="w-3 h-3 fill-white" />
            </div>
            <span className="text-sm font-semibold text-cb-text">ChessBooker</span>
          </div>
          <p className="text-sm text-cb-text-muted">
            Built for chess coaches. Currently in pilot.
          </p>
        </div>
      </footer>
    </div>
  );
}
