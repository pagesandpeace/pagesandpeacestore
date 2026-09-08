import { NextResponse } from "next/server";

import { supabaseService } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET() {
  const { data, error } = await supabaseService()
    .from("opening_hours")
    .select("day_of_week, day_name, open_time, close_time, is_closed")
    .order("day_of_week");

  if (error) return NextResponse.json({ error: "Unable to load opening hours" }, { status: 500 });
  return NextResponse.json({ hours: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
