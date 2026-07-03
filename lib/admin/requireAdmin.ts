import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr) {
    console.error("❌ [requireAdmin] getUser error:", authErr);
  }

  if (!user) {
    return {
      supabase,
      user: null,
      profile: null,
      error: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error: profileErr } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (profileErr || !profile) {
    console.error("❌ [requireAdmin] profile error:", profileErr);

    return {
      supabase,
      user,
      profile: null,
      error: NextResponse.json(
        { error: "User profile not found" },
        { status: 403 }
      ),
    };
  }

  if (profile.role !== "admin") {
    return {
      supabase,
      user,
      profile,
      error: NextResponse.json(
        { error: "Not authorised" },
        { status: 403 }
      ),
    };
  }

  return {
    supabase,
    user,
    profile,
    error: null,
  };
}