import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Verify coach is authenticated
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete the Google connection
    const { error: deleteError } = await supabase
      .from("google_connections")
      .delete()
      .eq("coach_id", user.id);

    if (deleteError) {
      console.error("[Google OAuth] Failed to disconnect:", deleteError);
      return NextResponse.json(
        { error: "Failed to disconnect" },
        { status: 500 }
      );
    }

    console.log(`[Google OAuth] Disconnected Google account for coach ${user.id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Google OAuth] Disconnect error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
