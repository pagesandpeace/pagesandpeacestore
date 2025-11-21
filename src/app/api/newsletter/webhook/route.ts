import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailEvents } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("📬 Webhook event:", body);

    const type = body.type;
    const data = body.data;

    const allowed = [
      "email.delivered",
      "email.opened",
      "email.link.clicked",
      "email.bounced",
      "email.complained",
      "email.unsubscribed"
    ];

    if (!allowed.includes(type)) {
      console.log("⚠️ Ignored event type:", type);
      return NextResponse.json({ ok: true });
    }

    // Extract blastId correctly
    const blastId =
      data?.tags?.blastId ??
      data?.metadata?.tags?.blastId ??
      null;

    // Extract recipient correctly (Resend uses arrays)
    const recipient = Array.isArray(data?.to)
      ? data.to[0]
      : data?.to || data?.email || null;

    if (!blastId || !recipient) {
      console.log("❌ Missing blastId/recipient", { blastId, recipient });
      return NextResponse.json({ ok: false, error: "Missing blastId or recipient" });
    }

    // Insert event
    await db.insert(emailEvents).values({
      blastId,
      subscriber: recipient,
      eventType: type.replace("email.", ""), // e.g. delivered, opened, link.clicked
      metadata: data
    });

    console.log("✅ Webhook event logged:", type);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("🔥 Webhook error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}