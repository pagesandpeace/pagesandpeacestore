export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET() {
  try {
    const supabase = await supabaseAuthServer();

    /* -------------------------
       AUTH CHECK
    ------------------------- */
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* -------------------------
       ADMIN CHECK
    ------------------------- */
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabaseAdmin = supabaseService();

    /* -------------------------
       GET AUTH USERS (ALL)
    ------------------------- */
    const { data: authUsers } =
      await supabaseAdmin.auth.admin.listUsers();

    /* -------------------------
       GET APP USERS
    ------------------------- */
    const { data: appUsers } = await supabaseAdmin
      .from("users")
      .select("*");

    const appMap = Object.fromEntries(
      (appUsers || []).map((u) => [u.email, u])
    );

    /* -------------------------
       MERGE (FIXED)
    ------------------------- */
    const users = authUsers.users.map((auth) => {
      const app = appMap[auth.email ?? ""];

      // 🔥 THIS IS THE FIX
      const lastMagicLink =
        app?.last_magic_link_sent_at || auth.created_at;

      return {
        id: auth.id,
        email: auth.email,
        created_at: auth.created_at,

        has_logged_in: app?.has_logged_in ?? false,
        last_login_at: app?.last_login_at ?? null,

        // ✅ ALWAYS SHOW SOMETHING
        last_magic_link_sent_at: lastMagicLink,

        signup_status: app?.signup_status ?? "invited",

        is_shadow: !app,
      };
    });

    return NextResponse.json({ users });
  } catch (err) {
  console.error("❌ /api/admin/users error:", err);

  return NextResponse.json(
    { error: "Server error" },
    { status: 500 }
  );
}
}