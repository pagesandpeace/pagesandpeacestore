import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { eventId } = await req.json();

  const supabase = await supabaseServer();

  /* ---------------- AUTH ---------------- */
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authUserId = user.id;

  /* ---------------- ADMIN CLIENT ---------------- */
  const admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  console.log("🧠 CANCEL ATTENDANCE", {
    eventId,
    authUserId,
  });

  /* ---------------- DELETE ATTENDANCE ---------------- */
  const { data: deleted, error } = await admin
    .from("event_attendance") // ✅ CORRECT TABLE
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", authUserId)
    .select();

  console.log("🧪 DELETE RESULT:", deleted, error);

  return NextResponse.json({
    success: true,
    deletedCount: deleted?.length || 0,
  });
}