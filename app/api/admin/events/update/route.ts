import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("🚀 [UPDATE] RAW PAYLOAD RECEIVED:", body);

    const { id, ...updates } = body;

    if (!id) {
      console.error("❌ [UPDATE] Missing ID in request payload");
      return NextResponse.json(
        { error: "Missing event ID" },
        { status: 400 }
      );
    }

    // Remove undefined or null values
    const clean = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined && v !== null)
    );

    console.log("🧹 [UPDATE] CLEANED PAYLOAD (sent to Supabase):", clean);

    const supabase = await supabaseServer();

    console.log(`📡 [UPDATE] Executing update for event ID: ${id}`);

    const { data, error } = await supabase
      .from("events")
      .update(clean)
      .eq("id", id)
      .select()
      .maybeSingle();

    console.log("📥 [UPDATE] SUPABASE RESPONSE DATA:", data);
    console.log("⚠️ [UPDATE] SUPABASE RESPONSE ERROR:", error);

    if (error) {
      console.error("❌ [UPDATE] Supabase returned an ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      console.error("⚠️ [UPDATE] No rows were updated. Possible reason:");
      console.error("  - ID does not match any row, OR");
      console.error("  - A NOT NULL column failed validation, OR");
      console.error("  - RLS is blocking the update");
      console.error("  Clean payload was:", clean);
      return NextResponse.json(
        { error: "No event updated. Invalid ID or constraint violation." },
        { status: 400 }
      );
    }

    console.log("✅ [UPDATE] SUCCESS — Event updated:", data);

    return NextResponse.json({ success: true, event: data });
  } catch (err) {
    console.error("💥 [UPDATE] UPDATE ROUTE FAILED:", err);
    return NextResponse.json(
      { error: "Server error updating event." },
      { status: 500 }
    );
  }
}
