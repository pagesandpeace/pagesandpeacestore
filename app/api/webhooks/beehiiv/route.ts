export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* ----------------------------------
   TYPES
---------------------------------- */
type BeehiivWebhook = {
  event_type: string; // ✅ FIXED (was "type")
  data?: {
    email?: string;
  };
};

/* ----------------------------------
   HANDLER
---------------------------------- */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BeehiivWebhook;

    console.log("📩 Beehiiv webhook received:", body);

    // ✅ FIXED: correct field
    const event = body?.event_type;
    const email = body?.data?.email?.toLowerCase();

    if (!email) {
      console.log("⚠️ No email in webhook");
      return NextResponse.json({ ok: true });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    /* -------------------------
       SUBSCRIBE
    ------------------------- */
    if (event === "subscription.created") {
      const { data, error } = await supabaseAdmin
        .from("users")
        .update({
          marketing_consent: true,
          beehiiv_subscribed: true,
          beehiiv_subscribed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("email", email)
        .select();

      if (error) {
        console.error("❌ DB update error (subscribe):", error);
      } else {
        console.log("✅ Subscribed:", email, data);
      }
    }

    /* -------------------------
       UNSUBSCRIBE (CRITICAL)
    ------------------------- */
    if (event === "subscription.deleted") {
      const { data, error } = await supabaseAdmin
        .from("users")
        .update({
          marketing_consent: false,
          beehiiv_subscribed: false,
          updated_at: new Date().toISOString(),
        })
        .eq("email", email)
        .select();

      if (error) {
        console.error("❌ DB update error (unsubscribe):", error);
      } else {
        console.log("❌ Unsubscribed:", email, data);
      }
    }

    /* -------------------------
       UNKNOWN EVENT (SAFE LOG)
    ------------------------- */
    if (
      event !== "subscription.created" &&
      event !== "subscription.deleted"
    ) {
      console.log("ℹ️ Unhandled Beehiiv event:", event);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}