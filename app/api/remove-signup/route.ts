export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: Request) {
  const supabaseAdmin = supabaseService();

  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ ok: false });
    }

    console.log("🗑 Removing:", email);

    /* -------------------------
       GET AUTH USER
    ------------------------- */
    const { data: users } =
      await supabaseAdmin.auth.admin.listUsers();

    const user = users.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      return NextResponse.json({ ok: true });
    }

    /* -------------------------
       DELETE AUTH USER
    ------------------------- */
    await supabaseAdmin.auth.admin.deleteUser(user.id);

    /* -------------------------
       DELETE FROM USERS TABLE
    ------------------------- */
    await supabaseAdmin
      .from("users")
      .delete()
      .eq("auth_user_id", user.id);

    console.log("✅ Deleted:", email);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Delete error:", err);
    return NextResponse.json({ ok: false });
  }
}