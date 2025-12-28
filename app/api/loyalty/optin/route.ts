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

export async function POST(req: Request) {
  console.log("🟢 [LOYALTY OPT-IN] request received");

  try {
    /* -------------------------
       AUTH
    ------------------------- */
    const supabase = await supabaseServer();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }

    const authUserId = auth.user.id;
    console.log("👤 Auth user:", authUserId);

    /* -------------------------
       BODY
    ------------------------- */
    const { termsVersion, marketingConsent } = await req.json();

    if (!termsVersion) {
      return NextResponse.json(
        { error: "TERMS_VERSION_REQUIRED" },
        { status: 400 }
      );
    }

    /* -------------------------
       FETCH INTERNAL USER
    ------------------------- */
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_user_id", authUserId)
      .single();

    if (userError || !user) {
      console.error("❌ Internal user missing", userError);
      return NextResponse.json(
        { error: "USER_PROFILE_MISSING" },
        { status: 400 }
      );
    }

    console.log("🧩 Internal user ID:", user.id);

    /* -------------------------
       INSERT LOYALTY ROW
    ------------------------- */
    const { error: insertError } = await supabaseAdmin
      .from("loyalty_members")
      .insert({
        user_id: authUserId,
        user_id_uuid: user.id,
        status: "active",
        tier: "starter",
        marketing_consent: Boolean(marketingConsent),
        terms_version: termsVersion,
      });

    if (insertError && insertError.code !== "23505") {
      console.error("❌ Loyalty insert failed:", insertError);
      return NextResponse.json(
        { error: "FAILED_TO_JOIN" },
        { status: 500 }
      );
    }

    console.log("✅ Loyalty opt-in successful");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("🔥 LOYALTY OPT-IN CRASH:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
