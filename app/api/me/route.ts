export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📥 [/api/me] HIT");

  try {
    /* ----------------------------------------
       RAW COOKIE + HEADER VISIBILITY (Next 15)
    ---------------------------------------- */
    const cookieStore = await cookies();
    const headerStore = await headers();

    const allCookies = cookieStore.getAll();
    console.log(
      "🍪 Cookies received:",
      allCookies.map((c) => ({
        name: c.name,
        hasValue: Boolean(c.value),
      }))
    );

    console.log("🌐 Host:", headerStore.get("host"));
    console.log("🌐 Origin:", headerStore.get("origin"));
    console.log("🌐 Referer:", headerStore.get("referer"));

    /* ----------------------------------------
       SUPABASE AUTH CHECK
    ---------------------------------------- */
    const supabase = await supabaseServer();

    const { data: sessionData, error: sessionErr } =
      await supabase.auth.getSession();

    console.log("🧾 getSession():", {
      hasSession: Boolean(sessionData?.session),
      error: sessionErr,
    });

    const { data: authData, error: authErr } =
      await supabase.auth.getUser();

    console.log("👤 getUser():", {
      user: authData?.user
        ? {
            id: authData.user.id,
            email: authData.user.email,
            provider: authData.user.app_metadata?.provider,
          }
        : null,
      error: authErr,
    });

    if (!authData?.user) {
      console.log("🔓 No authenticated user");
      return NextResponse.json(null, { status: 401 });
    }

    /* ----------------------------------------
       USERS TABLE LOOKUP (UUID-SAFE)
    ---------------------------------------- */
    const authUserId = authData.user.id;

    const { data: profile, error: profileErr } = await supabase
      .from("users")
      .select("id, email, role, auth_user_id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    console.log("📦 users lookup:", {
      profile,
      error: profileErr,
    });

    if (!profile) {
      console.log("⚠ Auth user exists, but no public.users row");
      return NextResponse.json(null, { status: 404 });
    }

    console.log("✅ /api/me SUCCESS");

    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      role: profile.role,
    });
  } catch (err) {
    console.error("🔥 /api/me HARD CRASH:", err);
    return NextResponse.json(null, { status: 500 });
  } finally {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }
}
