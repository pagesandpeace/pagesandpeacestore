import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailEvents } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Resend events: delivered, opened, clicked, bounced
    const type = body.type;
    const data = body.data;

    // Ignore unsupported events
    if (!["email.delivered", "email.opened", "email.clicked", "email.bounced"].includes(type)) {
      return NextResponse.json({ ok: true });
    }

    const blastId = data.tags?.blastId || null;
    const recipient = data.to || data.email || null;

    if (!blastId || !recipient) {
      return NextResponse.json({ ok: false, error: "Missing blastId or recipient" }, { status: 400 });
    }

    // Store event
    await db.insert(emailEvents).values({
      blastId,
      subscriber: recipient,
      eventType: type.replace("email.", ""), // "opened" instead of "email.opened"
      metadata: data,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
