export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function PATCH(req: Request) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📥 [API] PATCH /api/user/profile");

  try {
    const supabase = await supabaseServer();

    /* ----------------------------------------
       AUTH
    ---------------------------------------- */
    const { data: auth, error: authErr } = await supabase.auth.getUser();

    console.log("👤 Auth:", {
      id: auth?.user?.id,
      email: auth?.user?.email,
      error: authErr,
    });

    if (authErr || !auth?.user) {
      console.warn("🚫 Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ----------------------------------------
       INPUT
    ---------------------------------------- */
    const body = await req.json();
    const name = body?.name?.toString().trim();

    console.log("✏️ Incoming name:", name);

    if (!name || name.length < 2) {
      console.warn("⚠ Invalid name");
      return NextResponse.json(
        { error: "Invalid name" },
        { status: 400 }
      );
    }

    /* ----------------------------------------
       UPDATE (CRITICAL)
    ---------------------------------------- */
    const { data, error } = await supabase
      .from("users")
      .update({
        name,
        updated_at: new Date().toISOString(),
      })
      .eq("auth_user_id", auth.user.id)
      .select("id, name");

    console.log("🧪 NAME UPDATE RESULT:", { data, error });

    if (error || !data || data.length === 0) {
      console.error("💥 Name update FAILED");
      return NextResponse.json(
        { error: "Name not persisted" },
        { status: 500 }
      );
    }

    console.log("✅ Name persisted for:", auth.user.email);

    return NextResponse.json({
      success: true,
      name: data[0].name,
    });
  } catch (err) {
    console.error("🔥 Name update crashed:", err);
    return NextResponse.json(
      { error: "Name update failed" },
      { status: 500 }
    );
  } finally {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }
}
