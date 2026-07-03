import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: Request) {
  console.log("📝 [EVENT UPDATE] route hit");

  try {
    /* --------------------------------------------------
       1. Require admin
    -------------------------------------------------- */
    const { error: adminError } = await requireAdmin();

    if (adminError) return adminError;

    /*
      Use service role AFTER confirming admin.
      This allows admin updates to unpublished/draft events.
    */
    const supabase = supabaseService();

    /* --------------------------------------------------
       2. Parse payload
    -------------------------------------------------- */
    const body = await req.json();
    console.log("📝 [EVENT UPDATE] raw payload:", body);

    const { id, ...updates } = body;

    if (!id) {
      console.error("❌ [EVENT UPDATE] missing event id");

      return NextResponse.json(
        { error: "Missing event ID" },
        { status: 400 }
      );
    }

    /*
      Price is handled by ticket types, not directly on event update.
    */
    if ("price_pence" in updates) {
      console.warn(
        "⚠️ [EVENT UPDATE] price_pence ignored (tickets own pricing)"
      );
      delete updates.price_pence;
    }

    const clean = Object.fromEntries(
      Object.entries(updates).filter(
        (entry) => entry[1] !== undefined && entry[1] !== null
      )
    );

    console.log("📝 [EVENT UPDATE] cleaned payload:", clean);

    /* --------------------------------------------------
       3. Update event
    -------------------------------------------------- */
    const { data, error } = await supabase
      .from("events")
      .update(clean)
      .eq("id", id)
      .select()
      .maybeSingle();

    console.log("📝 [EVENT UPDATE] result:", data, error);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "No rows updated" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, event: data });
  } catch (err) {
    console.error("💥 [EVENT UPDATE] crashed:", err);

    return NextResponse.json(
      { error: "Server error updating event" },
      { status: 500 }
    );
  }
}