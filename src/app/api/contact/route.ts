import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { ok: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    /* -----------------------------------------
     * 1. SEND EMAIL TO YOU (admin inbox)
     * ---------------------------------------- */
    await resend.emails.send({
      from: "Pages & Peace <admin@pagesandpeace.co.uk>",
      to: ["admin@pagesandpeace.co.uk"],
      subject: `📬 New Contact Form Message from ${name}`,
      replyTo: email,
      text: `
📬 New Contact Message

Name: ${name}
Email: ${email}

Message:
${message}
      `,
    });

    /* -----------------------------------------
     * 2. AUTO-REPLY TO CUSTOMER
     * ---------------------------------------- */
    await resend.emails.send({
      from: "Pages & Peace <admin@pagesandpeace.co.uk>",
      to: [email],
      subject: "Thanks for getting in touch — Pages & Peace",
      text: `
Hi ${name},

Thanks so much for reaching out to us — we've received your message and will get back to you shortly.

If your message is urgent, you can also contact us directly:
📞 07486 313 261
📧 admin@pagesandpeace.co.uk

Our shop details:
Pages & Peace
8 Eba Building
Kings Avenue
Doncaster
DN11 0PF

Opening times:
Tue–Sat: 9am–9pm
Sun: 9am–4pm
Mon: Closed

Speak soon,
The Pages & Peace Team 🤍📚☕
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Contact form error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
