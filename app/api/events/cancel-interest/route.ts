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

  /* ---------------- GET PROFILE ID ---------------- */
  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();

  const profileId = profile?.id;

  console.log("🧠 CANCEL INTEREST", {
    eventId,
    authUserId,
    profileId,
  });

  /* ---------------- DELETE (AUTH ID FIRST) ---------------- */
  let { data: deleted, error } = await admin
    .from("event_interest")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", authUserId)
    .select();

  /* ---------------- FALLBACK (PROFILE ID) ---------------- */
  if ((!deleted || deleted.length === 0) && profileId) {
    const res = await admin
      .from("event_interest")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", profileId)
      .select();

    deleted = res.data;
    error = res.error;
  }

  console.log("🧪 DELETE RESULT:", deleted, error);

  return NextResponse.json({
    success: true,
    deletedCount: deleted?.length || 0,
  });
}