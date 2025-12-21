export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

/* -----------------------------------------------------
   SERVICE ROLE CLIENT (bypasses RLS)
----------------------------------------------------- */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/* =====================================================
   POST /api/loyalty/optin
===================================================== */
export async function POST(req: Request) {
  console.log("🟢 [LOYALTY OPT-IN] request received");

  try {
    /* -------------------------
       AUTH (cookie-based)
    ------------------------- */
    const supabase = await supabaseServer();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) {
      console.warn("❌ Not authenticated");
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }

    const userId = auth.user.id;
    console.log("👤 Authenticated user:", userId);

    /* -------------------------
       BODY
    ------------------------- */
    const body = await req.json();
    console.log("📦 Body:", body);

    const { termsVersion, marketingConsent } = body ?? {};

    if (!termsVersion) {
      return NextResponse.json(
        { error: "TERMS_VERSION_REQUIRED" },
        { status: 400 }
      );
    }

    /* -------------------------
       INSERT (SERVICE ROLE)
    ------------------------- */
    const { data, error } = await supabaseAdmin
      .from("loyalty_members")
      .insert({
        user_id: userId,
        terms_version: termsVersion,
        marketing_consent: Boolean(marketingConsent),
        status: "active",
        tier: "starter",
      })
      .select()
      .maybeSingle();

    console.log("🧾 Insert result:", { data, error });

    // Ignore duplicate key (already joined)
    if (error && error.code !== "23505") {
      console.error("❌ Loyalty insert failed:", error);
      return NextResponse.json(
        { error: "FAILED_TO_JOIN" },
        { status: 500 }
      );
    }

    console.log("✅ Loyalty opt-in successful");

    return NextResponse.json({
      success: true,
      message: "You’re in! Chapters Club features are coming soon.",
    });
  } catch (err) {
    console.error("🔥 LOYALTY OPT-IN CRASH:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
