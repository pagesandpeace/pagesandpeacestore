// app/api/me/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string | null;
  auth_provider: string | null;
};

export async function GET() {
  console.log("📥 [/api/me] HIT");

  try {
    const supabase = await supabaseServer();

    const { data: auth, error: authErr } = await supabase.auth.getUser();

    if (authErr) {
      console.error("❌ getUser error:", authErr);
      // ⬇️ IMPORTANT: never throw, return JSON
      return NextResponse.json(null, { status: 401 });
    }

    // --------------------------------------------------
    // No logged-in session
    // --------------------------------------------------
    if (!auth?.user) {
      console.log("🔓 No auth → return 401");
      return NextResponse.json(null, { status: 401 });
    }

    const authId = auth.user.id;
    const authEmail = auth.user.email ?? "";

    let profile: UserProfile | null = null;

    // --------------------------------------------------
    // Try find profile by auth_user_id (PRIMARY, safest)
    // --------------------------------------------------
    {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, name, image, role, auth_provider")
        .eq("auth_user_id", authId)
        .maybeSingle();

      if (error) {
        console.error("❌ profile lookup (auth_user_id) failed:", error);
      }

      if (data) profile = data as UserProfile;
    }

    // --------------------------------------------------
    // Fallback: try by email (legacy safety net)
    // --------------------------------------------------
    if (!profile && authEmail) {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, name, image, role, auth_provider")
        .eq("email", authEmail)
        .maybeSingle();

      if (error) {
        console.error("❌ profile lookup (email) failed:", error);
      }

      if (data) profile = data as UserProfile;
    }

    // --------------------------------------------------
    // Still no profile
    // --------------------------------------------------
    if (!profile) {
      console.warn("⚠ No user profile found in public.users");
      // ⬇️ IMPORTANT: still return JSON, never empty body
      return NextResponse.json(null, { status: 404 });
    }

    // --------------------------------------------------
    // Identity-only payload (NO loyalty fields)
    // --------------------------------------------------
    const payload = {
      id: profile.id,
      email: profile.email,
      name: profile.name ?? "",
      image: profile.image ?? null,
      role: profile.role ?? "customer",
      auth_provider: profile.auth_provider ?? "credentials",
    };

    console.log("✅ Returning:", payload);

    return NextResponse.json(payload);
  } catch (err) {
    // ⬇️ THIS is what was killing production before
    console.error("🔥 /api/me crashed:", err);
    return NextResponse.json(null, { status: 500 });
  }
}
