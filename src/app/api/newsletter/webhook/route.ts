import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailEvents } from "@/lib/db/schema";
import { Webhook } from "svix";

export const runtime = "nodejs";

export async function POST(req: Request) {
  console.log("📬 Incoming Resend webhook");

  // --- Extract svix headers ---
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("❌ Missing svix-* headers");
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // --- Raw body as text (required for verification) ---
  const rawBody = await req.text();

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("❌ Missing RESEND_WEBHOOK_SECRET");
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // --- Verify webhook signature ---
  const wh = new Webhook(secret);
  let event: Record<string, unknown>;

  try {
    event = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as Record<string, unknown>;
  } catch (err) {
    console.error("❌ Invalid webhook signature", err);
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  console.log("✅ Verified event:", event);

  // --- Safe extraction with no TS errors ---
  const type = (event.type as string) ?? "";
  const data = (event.data as Record<string, unknown>) ?? {};

  const allowed = [
    "email.delivered",
    "email.opened",
    "email.link.clicked",
    "email.bounced",
    "email.complained",
    "email.unsubscribed",
  ];

  if (!allowed.includes(type)) {
    console.log("⚠ Ignored event type:", type);
    return NextResponse.json({ ok: true });
  }

  // --- Extract blastId safely ---
  const tags = (data.tags as Record<string, string> | undefined) ?? {};
  const metadata = (data.metadata as Record<string, unknown> | undefined) ?? {};

  const blastId =
    tags.blastId ||
    (metadata.tags as Record<string, string> | undefined)?.blastId ||
    null;

  // --- Extract recipient safely ---
  const to = data.to;
  const recipient = Array.isArray(to)
    ? to[0]
    : typeof to === "string"
      ? to
      : (data.email as string | null) ?? null;

  console.log("📌 Extracted:", { blastId, recipient });

  if (!blastId || !recipient) {
    console.error("❌ Missing blastId or recipient");
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // --- Log event ---
  await db.insert(emailEvents).values({
    blastId,
    subscriber: recipient,
    eventType: type.replace("email.", ""), // delivered, opened, link.clicked
    metadata: data as Record<string, unknown>, // <-- FIXED
  });

  console.log("✅ Logged event:", type);

  return NextResponse.json({ ok: true });
}
