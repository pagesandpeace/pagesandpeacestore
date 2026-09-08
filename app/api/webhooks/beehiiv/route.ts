export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { appCoreDb } from "@/lib/app-core/service";
import { supabaseService } from "@/lib/supabase/service";

type BeehiivWebhook = { event_type?: string; data?: { email?: string } };

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifySvix(body: string, id: string | null, timestamp: string | null, signature: string | null) {
  const secret = process.env.BEEHIIV_WEBHOOK_SIGNING_SECRET;
  if (!secret || !id || !timestamp || !signature) return false;
  const time = Number(timestamp);
  if (!Number.isFinite(time) || Math.abs(Date.now() / 1000 - time) > 5 * 60) return false;
  try {
    const encodedSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const key = Buffer.from(encodedSecret, "base64");
    const expected = crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
    return signature.split(" ").some((item) => {
      const [, candidate] = item.split(",", 2);
      return candidate ? safeEqual(expected, candidate) : false;
    });
  } catch { return false; }
}

export async function POST(request: Request) {
  const body = await request.text();
  const id = request.headers.get("svix-id");
  if (!verifySvix(body, id, request.headers.get("svix-timestamp"), request.headers.get("svix-signature"))) {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 401 });
  }

  let payload: BeehiivWebhook;
  try { payload = JSON.parse(body) as BeehiivWebhook; } catch { return NextResponse.json({ error: "Invalid payload" }, { status: 400 }); }
  const event = payload.event_type;
  const email = payload.data?.email?.trim().toLowerCase();
  if (!id || !email || !["subscription.created", "subscription.deleted"].includes(event ?? "")) return NextResponse.json({ received: true });

  const receipt = await appCoreDb().from("webhook_receipts").insert({ id, source: "beehiiv" });
  if (receipt.error?.code === "23505") return NextResponse.json({ received: true });
  if (receipt.error) return NextResponse.json({ error: "Unable to record webhook" }, { status: 500 });

  const now = new Date().toISOString();
  const update = event === "subscription.created"
    ? { marketing_consent: true, marketing_consent_at: now, beehiiv_subscribed: true, beehiiv_subscribed_at: now, updated_at: now }
    : { marketing_consent: false, beehiiv_subscribed: false, updated_at: now };
  const { error } = await supabaseService().from("users").update(update).eq("email", email);
  if (error) {
    // Permit Beehiiv's retry to process the event if the profile update failed.
    await appCoreDb().from("webhook_receipts").delete().eq("id", id);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
