import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { event_id } = await req.json();

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "";

  const firstName =
    fullName.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "Guest";

  const email = user.email ?? null;

  const admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  /* ---------------- INSERT ATTENDANCE ---------------- */
  const { error } = await admin
    .from("event_attendance")
    .insert({
      event_id,
      user_id: user.id,
      auth_user_id: user.id, // 🔥 NEW
      first_name: firstName, // 🔥 NEW
      email: email, // 🔥 NEW
    });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true });
    }

    console.error("❌ ATTEND ERROR:", error);
    return NextResponse.json({ error }, { status: 500 });
  }

  /* ---------------- CLEAN INTEREST ---------------- */
  await admin
    .from("event_interest")
    .delete()
    .eq("event_id", event_id)
    .eq("user_id", user.id);

  console.log("✅ attending saved with email:", email);

  return NextResponse.json({ ok: true });
}