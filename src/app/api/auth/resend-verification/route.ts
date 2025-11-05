import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, or, and, isNull, desc } from "drizzle-orm";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://pagesandpeace.co.uk"
    : "http://localhost:3000";

export async function POST(req: Request) {
  console.log("📨 [ResendVerification] Request received");

  try {
    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
      });
    }

    // ✅ Find unverified user
    const [user] = await db
      .select()
      .from(schema.users)
      .where(
        and(
          or(
            eq(schema.users.email, email),
            eq(schema.users.email, email.toLowerCase().trim())
          ),
          or(
            eq(schema.users.emailVerified, false),
            isNull(schema.users.emailVerified)
          )
        )
      );

    console.log("🧩 DB user lookup:", user);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "No unverified user found with this email." }),
        { status: 404 }
      );
    }

    // ✅ Correct: verifications table (plural)
    const [verification] = await db
      .select()
      .from(schema.verifications)
      .where(eq(schema.verifications.identifier, user.email))
      .orderBy(desc(schema.verifications.createdAt))
      .limit(1);

    console.log("🧩 DB verification lookup:", verification);

    if (!verification) {
      return new Response(
        JSON.stringify({
          error:
            "No pending verification token found. Please sign up again if needed.",
        }),
        { status: 404 }
      );
    }

    // ✅ safer URL encode
    const verifyUrl = `${BASE_URL}/api/auth/manual-verify?token=${encodeURIComponent(
  verification.value
)}`;


    console.log("🔗 Resending verification link:", verifyUrl);

    await resend.emails.send({
      from: "Pages & Peace <hello@pagesandpeace.co.uk>",
      to: user.email,
      subject: "Confirm your email address ☕",
      html: `
        <div style="background:#FAF6F1; padding:32px; font-family:Montserrat, Arial, sans-serif; color:#111;">
          <div style="text-align:center; margin-bottom:24px;">
            <img src="https://pagesandpeace.co.uk/logo.png" alt="Pages & Peace" style="width:80px; height:auto; margin-bottom:16px;" />
            <h2 style="margin:0;">Welcome to Pages & Peace 📚☕</h2>
          </div>
          <p style="text-align:center; font-size:16px; line-height:1.5;">
            Please confirm your email address to start your journey with us.
          </p>
          <p style="text-align:center; margin-top:32px;">
            <a href="${verifyUrl}"
              style="background:#5DA865; color:#FAF6F1; text-decoration:none;
              padding:14px 28px; border-radius:8px; font-weight:600;
              display:inline-block; transition:background 0.2s;">
              Verify My Email
            </a>
          </p>
          <div style="text-align:center; margin-top:40px; font-size:12px; color:#555;">
            <p>If you didn’t create this account, you can safely ignore this email.</p>
            <p>© ${new Date().getFullYear()} Pages & Peace. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    console.log("✅ Verification email resent successfully");

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Verification email resent successfully.",
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("🔥 [ResendVerification] Internal Error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error while resending verification email.",
        details: String(err),
      }),
      { status: 500 }
    );
  }
}
