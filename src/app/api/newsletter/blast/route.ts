import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newsletterSubscribers, emailBlasts } from "@/lib/db/schema";
import { resend, FROM } from "@/lib/email/client";
import newsletterTemplate from "@/lib/email/templates/newsletterTemplate";
import { applyTracking } from "@/lib/email/track/applyTracking";

export async function POST(req: Request) {
  try {
    const { subject, body, category = "general" } = await req.json();

    if (!subject || !body) {
      return NextResponse.json(
        { ok: false, error: "Subject and body required" },
        { status: 400 }
      );
    }

    // 1. Load subscriber emails
    const records = await db.select().from(newsletterSubscribers);
    const emails = records.map((r) => r.email);

    if (emails.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No subscribers available" },
        { status: 400 }
      );
    }

    // 2. Create blast record FIRST (needed for tracking)
    const [blast] = await db
      .insert(emailBlasts)
      .values({
        subject,
        body,
        category,
        recipientCount: emails.length,
      })
      .returning({ id: emailBlasts.id });

    const blastId = blast.id;

    // 3. Send per-recipient emails so tracking works correctly
    for (const recipient of emails) {
      // add click-tracking redirects
      const trackedHtml = applyTracking(body, blastId, recipient);

      // wrap in branded template (includes open tracking pixel)
      const finalHtml = newsletterTemplate(trackedHtml, blastId, recipient);

      await resend.emails.send({
        from: FROM,
        to: recipient,
        subject,
        html: finalHtml,
        tags: [
          { name: "blastId", value: blastId },
          { name: "category", value: category },
          { name: "recipient", value: recipient },
        ],
      });
    }

    return NextResponse.json({
      ok: true,
      sentTo: emails.length,
      blastId,
    });

  } catch (err) {
    console.error("BLAST ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 }
    );
  }
}
