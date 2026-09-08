export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-admin-user";
import { supabaseService } from "@/lib/supabase/service";

export async function GET() {
  try {
    const admin = await requireAdminUser();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const service = supabaseService();
    const { data: authUsers, error: authError } = await service.auth.admin.listUsers();
    if (authError) throw authError;

    const { data: appUsers, error: customerError } = await service.schema("app_core")
      .from("customers")
      .select("auth_user_id,email,first_login_at,last_login_at,last_magic_link_sent_at,signup_status,has_logged_in,created_at");
    if (customerError) throw customerError;

    const appMap = Object.fromEntries((appUsers || []).map((u) => [u.auth_user_id, u]));
    const users = authUsers.users.map((auth) => {
      const app = appMap[auth.id];
      return {
        id: auth.id,
        email: auth.email,
        created_at: auth.created_at,
        has_logged_in: app?.has_logged_in ?? false,
        last_login_at: app?.last_login_at ?? null,
        last_magic_link_sent_at: app?.last_magic_link_sent_at || auth.created_at,
        signup_status: app?.signup_status ?? "invited",
        is_shadow: !app,
      };
    });

    return NextResponse.json({ users });
  } catch (err) {
    console.error("/api/admin/users error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
