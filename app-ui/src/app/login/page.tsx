"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/app");
      }
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "https://app.chessbooker.com/app",
      },
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Check your email for the magic link!" });
      setEmail("");
    }

    setLoading(false);
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
        <h1 className="font-display text-3xl text-cb-text">Coach Portal</h1>
        <p className="mt-2 text-cb-text-secondary">Sign in to manage your lessons</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card p-8 sm:p-10">
          <form onSubmit={handleLogin} className="space-y-6">
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
              className="btn-primary w-full"
            >
              {loading ? "Sending..." : "Send magic link"}
            </button>
          </form>

          {message && (
            <div
              className={`mt-6 p-4 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
