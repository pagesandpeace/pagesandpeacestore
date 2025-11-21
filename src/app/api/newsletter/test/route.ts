import { NextResponse } from "next/server";
import { resend, FROM } from "@/lib/email/client";
import newsletterTemplate from "@/lib/email/templates/newsletterTemplate";

export async function POST(req: Request) {
  try {
    const { subject, body, to } = await req.json();

    if (!subject || !body || !to) {
      return NextResponse.json(
        { ok: false, error: "Subject, body, and 'to' email are required" },
        { status: 400 }
      );
    }

    await resend.emails.send({
      from: FROM,
      to,
      subject,
      html: newsletterTemplate(body),
    });

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("TEST EMAIL ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 }
    );
  }
}
