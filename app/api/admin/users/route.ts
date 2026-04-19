export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📥 [ADMIN] GET /api/admin/users");

  try {
    const supabase = await supabaseAuthServer();

    /* -------------------------
       🔐 AUTH CHECK
    ------------------------- */
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      console.warn("🚫 Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* -------------------------
       👤 ADMIN CHECK
    ------------------------- */
    const { data: profile, error: profileErr } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();

    if (profileErr || profile?.role !== "admin") {
      console.warn("🚫 Not admin");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("🟥 Admin verified:", user.email);

    /* -------------------------
       🔥 FETCH AUTH USERS
    ------------------------- */
    const supabaseAdmin = supabaseService();

    const { data: authUsers, error } =
      await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error("💥 Failed to fetch auth users:", error);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    /* -------------------------
       🧠 FETCH APP USERS TABLE
    ------------------------- */
    const { data: profiles } = await supabaseAdmin
      .from("users")
      .select("email, last_magic_link_sent_at");

    const profileMap = Object.fromEntries(
      (profiles || []).map((p) => [p.email, p])
    );

    /* -------------------------
       🧠 MERGE DATA
    ------------------------- */
    const users = authUsers.users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      last_magic_link_sent_at:
        profileMap[u.email || ""]?.last_magic_link_sent_at || null,
    }));

    console.log("📊 Users fetched:", users.length);

    return NextResponse.json({ users });
  } catch (err) {
    console.error("🔥 HARD CRASH:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  } finally {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }
}