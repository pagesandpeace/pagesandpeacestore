// src/app/api/newsletter/test/route.ts
import { NextResponse } from "next/server";
import { resend, FROM } from "@/lib/email/client";
import newsletterTemplate from "@/lib/email/templates/newsletterTemplate";
import { applyTracking } from "@/lib/email/track/applyTracking";

export async function POST(req: Request) {
  try {
    console.log("🚀 TEST ROUTE HIT");

    const { subject, body, to } = await req.json();

    if (!subject || !body || !to) {
      return NextResponse.json(
        { ok: false, error: "Subject, body and 'to' address required" },
        { status: 400 }
      );
    }

    // Fake blast ID for testing
    const blastId = "test-" + Date.now();
    const recipient = to;

    // Apply click tracking
    const trackedHtml = applyTracking(body, blastId, recipient);

    // Apply full template + open pixel
    const finalHtml = newsletterTemplate(trackedHtml, blastId, recipient);

    console.log("📬 Sending TEST email via Resend…");

    const response = await resend.emails.send({
      from: FROM,
      to: recipient,
      subject,
      html: finalHtml,
      tags: [{ name: "blastId", value: blastId }],
    });

    console.log("✅ RESEND RESPONSE:", response);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ TEST EMAIL ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error while sending test email" },
      { status: 500 }
    );
  }
}
