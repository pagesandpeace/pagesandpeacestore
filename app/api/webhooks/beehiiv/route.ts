export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type BeehiivWebhook = {
  type: string;
  data?: {
    email?: string;
  };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BeehiivWebhook;

    console.log("📩 Beehiiv webhook received:", body);

    const event = body?.type;
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
      await supabaseAdmin
        .from("users")
        .update({
          marketing_consent: true,
          beehiiv_subscribed: true,
          beehiiv_subscribed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("email", email);

      console.log("✅ Subscribed:", email);
    }

    /* -------------------------
       UNSUBSCRIBE (CRITICAL)
    ------------------------- */
    if (event === "subscription.deleted") {
      await supabaseAdmin
        .from("users")
        .update({
          marketing_consent: false,
          beehiiv_subscribed: false,
          updated_at: new Date().toISOString(),
        })
        .eq("email", email);

      console.log("❌ Unsubscribed:", email);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}