import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { v4 as uuidv4 } from "uuid";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";

// ✅ Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY!);

// ✅ Detect correct base URL depending on environment
const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://pagesandpeace.co.uk"
    : "http://localhost:3000";

export const auth = betterAuth({
  /* ---------- Database Configuration ---------- */
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),

  /* ---------- Email + Password Auth ---------- */
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  /* ---------- Email Verification ---------- */
  emailVerification: {
    enabled: true,
    sendOnSignUp: true,
    sendOnSignIn: false,
    requireVerificationBeforeSignIn: true,

    async sendVerificationEmail({ user, url }) {
      const verifyUrl = `${BASE_URL}${url}`;
      try {
        await resend.emails.send({
          from: "Pages & Peace <hello@pagesandpeace.co.uk>",
          to: user.email,
          subject: "Confirm your email address ☕",
          html: `
            <div style="background:#FAF6F1; padding:32px; font-family:Montserrat, Arial, sans-serif; color:#111;">
              <h2 style="text-align:center;">Welcome to Pages & Peace 📚☕</h2>
              <p style="text-align:center;">Please confirm your email to start your journey with us.</p>
              <p style="text-align:center; margin-top:24px;">
                <a href="${verifyUrl}"
                  style="background:#5DA865; color:#FAF6F1; text-decoration:none; padding:12px 24px; border-radius:6px; display:inline-block;">
                  Verify My Email
                </a>
              </p>
              <p style="text-align:center; font-size:12px; color:#555; margin-top:32px;">
                If you didn’t create this account, please ignore this message.
              </p>
            </div>
          `,
        });
      } catch (err) {
        console.error("❌ Failed to send verification email:", err);
      }
    },

    async afterEmailVerification(user) {
      console.log(`✅ ${user.email} verified successfully!`);
    },
  },

  /* ---------- Cookie Config ---------- */
  cookies: {
    sessionToken: {
      name: "auth_session",
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      },
    },
  },

  /* ---------- Advanced Options ---------- */
  advanced: {
    database: {
      generateId: () => uuidv4(),
    },
  },

  /* ---------- Plugins ---------- */
  plugins: [nextCookies()],
});
