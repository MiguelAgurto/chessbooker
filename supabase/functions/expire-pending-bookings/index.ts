// Supabase Edge Function: expire-pending-bookings
// Scheduled to run every 10-15 minutes via Supabase cron
// Calls the expire_pending_booking_requests() RPC to expire stale pending bookings

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for RPC access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Call the expire_pending_booking_requests() RPC
    const { data, error } = await supabase.rpc("expire_pending_booking_requests");

    if (error) {
      console.error("Error expiring pending bookings:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // data contains the count of expired requests
    const expiredCount = data || 0;
    console.log(`Expired ${expiredCount} pending booking requests`);

    return new Response(
      JSON.stringify({
        success: true,
        expired_count: expiredCount,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
