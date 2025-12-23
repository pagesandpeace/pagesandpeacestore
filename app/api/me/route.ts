export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📥 [/api/me] HIT");

  try {
    const supabase = await supabaseServer();

    /* -------------------------
       AUTH
    ------------------------- */
    const { data: auth, error: authErr } = await supabase.auth.getUser();

    console.log("👤 getUser():", {
      id: auth?.user?.id,
      email: auth?.user?.email,
      error: authErr,
    });

    if (!auth?.user) {
      console.log("🔓 No authenticated user");
      return NextResponse.json(null, { status: 401 });
    }

    const authUserId = auth.user.id;

    /* -------------------------
       USERS TABLE (SINGLE SOURCE)
    ------------------------- */
    const { data: profile, error: profileErr } = await supabase
      .from("users")
      .select("id, email, name, image, role")
      .eq("auth_user_id", authUserId)
      .single();

    console.log("📦 users lookup:", {
      profile,
      error: profileErr,
    });

    if (profileErr) {
      console.error("❌ users lookup failed:", profileErr);
      return NextResponse.json(null, { status: 500 });
    }

    console.log("✅ /api/me SUCCESS");

    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      name: profile.name ?? "",
      image: profile.image ?? null,
      role: profile.role ?? "customer",
    });
  } catch (err) {
    console.error("🔥 /api/me HARD CRASH:", err);
    return NextResponse.json(null, { status: 500 });
  } finally {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }
}
