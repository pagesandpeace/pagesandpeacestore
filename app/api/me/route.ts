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

  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();

  if (authErr) {
    console.error("❌ getUser error:", authErr);
  }

  // --------------------------------------------------
  // No logged-in session
  // --------------------------------------------------
  if (!auth?.user) {
    console.log("🔓 No auth → return null");
    return NextResponse.json({ id: null });
  }

  const authId = auth.user.id;
  const authEmail = auth.user.email ?? "";

  let profile: UserProfile | null = null;

  // --------------------------------------------------
  // Try find profile by email
  // --------------------------------------------------
  {
    const { data } = await supabase
      .from("users")
      .select("id, email, name, image, role, auth_provider")
      .eq("email", authEmail)
      .maybeSingle();

    if (data) profile = data as UserProfile;
  }

  // --------------------------------------------------
  // Fallback: try find profile by ID
  // --------------------------------------------------
  if (!profile) {
    const { data } = await supabase
      .from("users")
      .select("id, email, name, image, role, auth_provider")
      .eq("id", authId)
      .maybeSingle();

    if (data) profile = data as UserProfile;
  }

  // --------------------------------------------------
  // Still no profile
  // --------------------------------------------------
  if (!profile) {
    console.log("⚠ No user profile found in public.users");
    return NextResponse.json({ id: null });
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
}
