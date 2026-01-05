import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  console.log("📝 [EVENT UPDATE] route hit");

  try {
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

    if ("price_pence" in updates) {
      console.warn(
        "⚠️ [EVENT UPDATE] price_pence ignored (tickets own pricing)"
      );
      delete updates.price_pence;
    }

    const clean = Object.fromEntries(
      Object.entries(updates).filter(
        ([_, v]) => v !== undefined && v !== null
      )
    );

    console.log("📝 [EVENT UPDATE] cleaned payload:", clean);

    const supabase = await supabaseServer();

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
