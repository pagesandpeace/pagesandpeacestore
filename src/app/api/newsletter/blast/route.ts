import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/db/schema";
import { resend, FROM } from "@/lib/email/client";
import newsletterTemplate from "@/lib/email/templates/newsletterTemplate";

export async function POST(req: Request) {
  try {
    const { subject, body, category = "general", customRecipients = [] } =
      await req.json();

    if (!subject || !body) {
      return NextResponse.json(
        { ok: false, error: "Subject and body required" },
        { status: 400 }
      );
    }

    let recipients: string[] = [];

    /* ---------------------------------------------------
       1. Use custom recipients ONLY if provided
    --------------------------------------------------- */
    if (Array.isArray(customRecipients) && customRecipients.length > 0) {
      recipients = customRecipients
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes("@"));
    } else {
      /* ---------------------------------------------------
         2. Otherwise send to full subscriber list
      --------------------------------------------------- */
      const records = await db.select().from(newsletterSubscribers);
      recipients = records.map((r) => r.email);
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No valid recipients available" },
        { status: 400 }
      );
    }

    /* ---------------------------------------------------
       3. Send emails – simple non-tracked version
    --------------------------------------------------- */
    for (const recipient of recipients) {
      await resend.emails.send({
        from: FROM,
        to: recipient,
        subject,
        html: newsletterTemplate(body),
      });
    }

    return NextResponse.json({
      ok: true,
      sentTo: recipients.length,
    });
  } catch (err) {
    console.error("BLAST ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 }
    );
  }
}
