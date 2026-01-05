import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/* ---------------------------------------------
   GET: list ACTIVE ticket types for event (PUBLIC)
   - Used by customer booking UI
--------------------------------------------- */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    const supabase = await supabaseServer();

    const { data, error } = await supabase
      .from("event_ticket_types")
      .select(`
        id,
        name,
        price_pence,
        is_default,
        is_active
      `)
      .eq("event_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("❌ Failed to load event tickets", err);
    return NextResponse.json(
      { error: "Failed to load tickets" },
      { status: 500 }
    );
  }
}
