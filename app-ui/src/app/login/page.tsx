"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/app");
      }
    });
  }, [router]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const sendMagicLink = useCallback(async (emailToSend: string) => {
    setLoading(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: emailToSend,
      options: {
        emailRedirectTo: "https://app.chessbooker.com/app",
      },
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setSentEmail(null);
    } else {
      setMessage({ type: "success", text: "Check your inbox" });
      setSentEmail(emailToSend);
      setEmail("");
      setCooldown(60); // 60 second cooldown before resend
    }

    setLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMagicLink(email);
  };

  const handleResend = async () => {
    if (sentEmail && cooldown === 0) {
      await sendMagicLink(sentEmail);
    }
  };

  return (
    <div className="min-h-screen bg-cb-bg flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 bg-coral rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
              <path d="M19 22H5v-2h14v2M17.16 8.26A4.54 4.54 0 0 0 15 3.5V2h-2v1.5c0 .55-.45 1-1 1s-1-.45-1-1V2H9v1.5A4.54 4.54 0 0 0 6.84 8.26 5.93 5.93 0 0 0 6 11.5c0 2.21 1.12 4.15 2.81 5.29l-.81.81V19h8v-1.4l-.81-.81A6.46 6.46 0 0 0 18 11.5c0-1.17-.29-2.27-.84-3.24Z"/>
            </svg>
          </div>
          <span className="text-xl font-bold text-cb-text">ChessBooker</span>
        </div>
        <h1 className="font-display text-3xl text-cb-text">Welcome back</h1>
        <p className="mt-2 text-cb-text-secondary">Sign in to manage your lessons and requests.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card p-8 sm:p-10">
          {/* Success state with email sent */}
          {message?.type === "success" && sentEmail ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-cb-text mb-2">Check your inbox</h2>
              <p className="text-cb-text-secondary text-sm mb-1">
                We sent a sign-in link to
              </p>
              <p className="text-cb-text font-medium mb-6">{sentEmail}</p>

              <button
                onClick={handleResend}
                disabled={loading || cooldown > 0}
                className="text-sm text-coral hover:text-coral-dark transition-colors disabled:text-cb-text-secondary disabled:cursor-not-allowed"
              >
                {loading ? (
                  "Sending..."
                ) : cooldown > 0 ? (
                  `Resend in ${cooldown}s`
                ) : (
                  "Resend link"
                )}
              </button>

              <div className="mt-6 pt-6 border-t border-cb-border">
                <button
                  onClick={() => {
                    setMessage(null);
                    setSentEmail(null);
                  }}
                  className="text-sm text-cb-text-secondary hover:text-cb-text transition-colors"
                >
                  Use a different email
                </button>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label htmlFor="email" className="label">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="coach@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email me a sign-in link
                    </>
                  )}
                </button>
              </form>

              <p className="mt-4 text-center text-xs text-cb-text-secondary">
                No password required. We&apos;ll email you a secure link.
              </p>

              {/* Error message */}
              {message?.type === "error" && (
                <div className="mt-5 p-4 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200 flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{message.text}</span>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-cb-border text-center">
                <a
                  href="https://www.chessbooker.com/how-it-works.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-cb-text-secondary hover:text-coral transition-colors"
                >
                  Learn how ChessBooker works
                </a>
              </div>
            </>
          )}
        </div>

        {/* Having trouble footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-cb-text-secondary">
            Having trouble?{" "}
            <a
              href="mailto:chessbooker.dev@gmail.com"
              className="text-coral hover:text-coral-dark transition-colors"
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
