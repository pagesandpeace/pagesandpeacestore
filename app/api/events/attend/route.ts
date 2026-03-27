// app/api/events/attend/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { event_id } = await req.json();

  /* ------------------ AUTH ------------------ */
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("👤 attend user:", user?.id);
  console.log("📌 attend event:", event_id);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  /* ------------------ SERVICE ROLE ------------------ */
  const admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  /* ------------------ INSERT ATTENDANCE ------------------ */
  const { error } = await admin
    .from("event_attendance")
    .insert({
      event_id,
      user_id: user.id,
    });

  if (error) {
    console.error("❌ ATTEND INSERT ERROR:", error);

    // handle duplicate gracefully
    if (error.code === "23505") {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error }, { status: 500 });
  }

  /* ------------------ OPTIONAL CLEANUP ------------------ */
  await admin
    .from("event_interest")
    .delete()
    .eq("event_id", event_id)
    .eq("user_id", user.id);

  /* ------------------ OPTIONAL: SEND EMAIL ------------------ */
  // 👉 plug resend here later

  console.log("✅ user attending event");

  return NextResponse.json({ ok: true });
}