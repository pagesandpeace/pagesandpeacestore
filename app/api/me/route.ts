export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📥 [/api/me] HIT");

  try {
    const supabase = await supabaseServer();

    const { data: auth, error: authErr } = await supabase.auth.getUser();

    console.log("👤 getUser():", {
      id: auth?.user?.id,
      email: auth?.user?.email,
      error: authErr,
    });

    if (!auth?.user) {
      console.log("🔓 No authenticated user");
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const authUserId = auth.user.id;

    const { data: profile, error: profileErr } = await supabase
      .from("users")
      .select("id, email, name, image, role, auth_provider")
      .eq("auth_user_id", authUserId)
      .single();

    console.log("📦 users lookup:", {
      profile,
      error: profileErr,
    });

    if (!profile) {
      console.log("⚠ No users row for auth_user_id:", authUserId);
      return NextResponse.json(
        {
          user: {
            id: authUserId,
            email: auth.user.email,
            name: "",
            image: null,
            role: "customer",
          },
        },
        { status: 200 }
      );
    }

    console.log("✅ /api/me SUCCESS");
    return NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        image: profile.image,
        role: profile.role,
        auth_provider: profile.auth_provider,
      },
    });
  } catch (err) {
    console.error("🔥 /api/me HARD CRASH:", err);
    return NextResponse.json({ user: null }, { status: 500 });
  } finally {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }
}
