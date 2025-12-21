export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  console.log("📥 [/api/loyalty/me] HIT");

  const supabase = await supabaseServer();

  /* -------------------------
     AUTH (cookie-based)
  ------------------------- */
  const { data: auth, error } = await supabase.auth.getUser();

  if (error) {
    console.error("❌ auth error:", error);
  }

  if (!auth?.user) {
    console.log("🔓 No auth → member false");
    return NextResponse.json({ member: false });
  }

  const userId = auth.user.id;
  console.log("👤 User:", userId);

  /* -------------------------
     FETCH MEMBERSHIP
  ------------------------- */
  const { data: member, error: memberError } = await supabase
    .from("loyalty_members")
    .select("status, tier, joined_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError) {
    console.error("❌ loyalty lookup failed:", memberError);
  }

  if (!member) {
    console.log("ℹ️ No loyalty row");
    return NextResponse.json({ member: false });
  }

  console.log("✅ Loyalty member found:", member);

  return NextResponse.json({
    member: true,
    status: member.status,
    tier: member.tier,
    joinedAt: member.joined_at,
  });
}
