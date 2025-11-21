import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newsletterSubscribers, emailBlasts } from "@/lib/db/schema";
import { resend, FROM } from "@/lib/email/client";
import newsletterTemplate from "@/lib/email/templates/newsletterTemplate";

export async function POST(req: Request) {
  try {
    const { subject, body, category = "general", customRecipients } =
      await req.json();

    if (!subject || !body) {
      return NextResponse.json(
        { ok: false, error: "Subject and body required" },
        { status: 400 }
      );
    }

    // Get subscribers from DB
    let recipients: string[] = [];

    if (Array.isArray(customRecipients) && customRecipients.length > 0) {
      // Use custom list only
      recipients = customRecipients;
    } else {
      // Load subscribers from DB
      const records = await db.select().from(newsletterSubscribers);
      recipients = records.map((r) => r.email);
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No recipients found" },
        { status: 400 }
      );
    }

    // Save to email_blasts table
    const [blast] = await db
      .insert(emailBlasts)
      .values({
        subject,
        body,
        category,
        recipientCount: recipients.length,
      })
      .returning({ id: emailBlasts.id });

    // Send emails
    for (const email of recipients) {
      await resend.emails.send({
        from: FROM,
        to: email,
        subject,
        html: newsletterTemplate(body),
      });
    }

    return NextResponse.json({
      ok: true,
      sentTo: recipients.length,
      blastId: blast.id,
    });
  } catch (err) {
    console.error("BLAST ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 }
    );
  }
}
