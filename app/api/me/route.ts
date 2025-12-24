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
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    console.log("👤 getUser():", {
      id: user?.id,
      email: user?.email,
      error: authErr,
    });

    if (!user) {
      console.log("🔓 No authenticated user");
      return NextResponse.json(null, { status: 401 });
    }

    /* -------------------------
       USERS TABLE (AUTHORITATIVE)
    ------------------------- */
    const { data: profile, error: profileErr } = await supabase
      .from("users")
      .select("id, email, name, image, role")
      .eq("auth_user_id", user.id)
      .single(); // ✅ profile MUST exist

    console.log("📦 users lookup:", {
      profile,
      error: profileErr,
    });

    if (profileErr || !profile) {
      // This should never happen now
      console.error("❌ Authenticated user without profile", {
        userId: user.id,
        profileErr,
      });

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
