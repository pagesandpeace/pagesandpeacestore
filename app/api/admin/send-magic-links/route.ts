export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import crypto from "crypto";

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

    console.log("📧 Target email:", email);

    /* -------------------------
       🔑 ADMIN CLIENT
    ------------------------- */
    const supabaseAdmin = supabaseService();
    const now = new Date().toISOString();

    /* -------------------------
       🧠 LOOKUP USER (BY EMAIL)
    ------------------------- */
    const { data: existingUser, error: lookupErr } =
      await supabaseAdmin
        .from("users")
        .select(`
          id,
          last_magic_link_sent_at,
          magic_link_send_count,
          first_magic_link_sent_at
        `)
        .ilike("email", email)
        .maybeSingle();

    if (lookupErr) {
      console.error("❌ Lookup failed:", lookupErr);
    }

    if (!existingUser) {
      console.log("⚠️ No profile yet — will create shadow user");
    }

    /* -------------------------
       ⛔ RATE LIMIT
    ------------------------- */
    if (existingUser?.last_magic_link_sent_at) {
      const diff =
        Date.now() -
        new Date(existingUser.last_magic_link_sent_at).getTime();

      const cooldown = 5 * 60 * 1000;

      if (diff < cooldown) {
        const remaining = Math.ceil((cooldown - diff) / 1000);

        console.warn("⛔ Too soon to resend");

        return NextResponse.json(
          {
            error: "Link already sent recently",
            retry_in_seconds: remaining,
          },
          { status: 429 }
        );
      }
    }

    /* -------------------------
       🚀 SEND MAGIC LINK
    ------------------------- */
    console.log("📨 Sending magic link...");

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
       📊 TRACK SEND (CREATE OR UPDATE)
    ------------------------- */
    if (!existingUser) {
      // 🔥 CREATE SHADOW USER
      const { error: insertErr } = await supabaseAdmin
        .from("users")
        .insert({
          id: crypto.randomUUID(),
          email,
          name: email.split("@")[0],

          signup_status: "invited",

          first_magic_link_sent_at: now,
          last_magic_link_sent_at: now,
          magic_link_send_count: 1,

          created_at: now,
        });

      if (insertErr) {
        console.warn("⚠️ Shadow user create failed:", insertErr);
      } else {
        console.log("🆕 Shadow user created");
      }
    } else {
      // 🔥 UPDATE EXISTING
      const { error: updateErr } = await supabaseAdmin
        .from("users")
        .update({
          last_magic_link_sent_at: now,
          magic_link_send_count:
            (existingUser.magic_link_send_count || 0) + 1,

          // only set first if missing
          first_magic_link_sent_at:
            existingUser.first_magic_link_sent_at || now,

          updated_at: now,
        })
        .eq("id", existingUser.id);

      if (updateErr) {
        console.warn("⚠️ Tracking failed:", updateErr);
      } else {
        console.log("📊 Magic link tracked");
      }
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