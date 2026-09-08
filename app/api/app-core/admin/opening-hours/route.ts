import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/require-admin-user";
import { supabaseService } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseService()
    .from("opening_hours")
    .select("day_of_week, day_name, open_time, close_time, is_closed")
    .order("day_of_week");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ hours: data ?? [] });
}

export async function PATCH(req: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const hours = Array.isArray(body?.hours) ? body.hours : [];
  if (!hours.length) return NextResponse.json({ error: "No hours supplied" }, { status: 400 });

  const rows = hours.map((row: any) => ({
    day_of_week: Number(row.day_of_week),
    day_name: String(row.day_name || "").trim(),
    open_time: row.is_closed ? null : String(row.open_time || ""),
    close_time: row.is_closed ? null : String(row.close_time || ""),
    is_closed: Boolean(row.is_closed),
    updated_at: new Date().toISOString(),
  }));

  if (rows.some((row: any) => row.day_of_week < 1 || row.day_of_week > 7 || !row.day_name)) {
    return NextResponse.json({ error: "Invalid opening hours" }, { status: 400 });
  }

  const { error } = await supabaseService().from("opening_hours").upsert(rows, { onConflict: "day_of_week" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
