export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: Request) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📥 [ADMIN] SEND MAGIC LINK");

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
       📥 INPUT
    ------------------------- */
    const body = await req.json();
    const email = body?.email?.toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email required" },
        { status: 400 }
      );
    }

    console.log("📧 Sending magic link to:", email);

    /* -------------------------
       🚀 SEND MAGIC LINK
    ------------------------- */
    const supabaseAdmin = supabaseService();

    const { error } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?callbackURL=/dashboard`,
      },
    });

    if (error) {
      console.error("💥 Magic link failed:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log("✅ Magic link sent");

    /* -------------------------
       🧠 TRACK IN USERS TABLE
    ------------------------- */
    const { error: updateErr } = await supabaseAdmin
      .from("users")
      .update({
        last_magic_link_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("email", email);

    if (updateErr) {
      console.warn("⚠️ Tracking failed (non-blocking):", updateErr);
    } else {
      console.log("📊 Magic link tracked");
    }

    return NextResponse.json({ success: true });
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