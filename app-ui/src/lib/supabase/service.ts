"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with service role privileges.
 * Use this for server-side operations that need to bypass RLS
 * or call privileged RPCs (like enqueue_coach_notification).
 *
 * IMPORTANT: Never expose this client to the browser.
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service role configuration");
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
