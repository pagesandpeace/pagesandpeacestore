// app/api/events/[id]/attendance-status/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await context.params;

  /* ------------------ AUTH ------------------ */
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("👤 attendance-status user:", user?.id);
  console.log("📌 attendance-status event:", eventId);

  if (!user) {
    return NextResponse.json({ attending: false });
  }

  /* ------------------ SERVICE ROLE ------------------ */
  const admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await admin
    .from("event_attendance")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("❌ attendance-status error:", error);
  }

  console.log("📊 attendance-status result:", data);

  return NextResponse.json({
    attending: !!data,
  });
}