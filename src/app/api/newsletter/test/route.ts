import { NextResponse } from "next/server";
import { resend, FROM } from "@/lib/email/client";
import newsletterTemplate from "@/lib/email/templates/newsletterTemplate";

export async function POST(req: Request) {
  try {
    console.log("🚀 TEST ROUTE HIT");

    const { subject, body, category = "general", to } = await req.json();

    console.log("📨 Parsed body:", { subject, bodyLength: body?.length, to });

    if (!subject || !body || !to) {
      return NextResponse.json(
        { ok: false, error: "Subject, body and 'to' address required" },
        { status: 400 }
      );
    }

    const blastId = "test-" + Date.now();
    const recipient = to;

    const finalHtml = newsletterTemplate(body, blastId, recipient);

    console.log("📬 Sending email via Resend...");

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
