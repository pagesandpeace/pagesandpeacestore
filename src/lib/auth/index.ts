import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { v4 as uuidv4 } from "uuid";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

/* ---------------------------------------------------------------------
   FIX 1 — ALWAYS USE YOUR REAL DOMAIN
   This prevents BetterAuth from auto-generating guest@pagesandpeace.com
--------------------------------------------------------------------- */
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.NODE_ENV === "production"
    ? "https://pagesandpeace.co.uk"
    : "http://localhost:3000");

/* ---------------------------------------------------------------------
   FIX 2 — Completely disable BetterAuth from auto-creating ANY user
--------------------------------------------------------------------- */

export const auth = betterAuth({
  baseURL: BASE_URL,

  /* ---------- Database (Drizzle + BetterAuth) ---------- */
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),

  /* ---------- Email & Password Auth ---------- */
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  /* ---------- Email Verification ---------- */
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: false,
    requireVerificationBeforeSignIn: true,

    async sendVerificationEmail({ user, url }) {
      const verifyUrl = url.startsWith("http")
        ? url
        : `${BASE_URL}${url}`;

      try {
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
                Thanks for joining our community of readers and coffee lovers.
                Please confirm your email address to start your journey with us.
              </p>

              <p style="text-align:center; margin-top:32px;">
                <a href="${verifyUrl}"
                  style="background:#5DA865; color:#FAF6F1; text-decoration:none;
                  padding:14px 28px; border-radius:8px; font-weight:600;">
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
      } catch (err) {
        console.error("❌ Failed to send verification email:", err);
      }
    },

    async afterEmailVerification(user) {
      console.log(`✅ ${user.email} verified successfully!`);
    },
  },

  /* ---------- Cookies ---------- */
  cookies: {
  sessionToken: {
    name: "auth_session",
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",     // ← FIXED HERE
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  },
},


  /* ---------- Advanced ---------- */
  advanced: {
    /* FIX 2 — NO AUTO-GUEST, NO AUTO-CREATE */
    session: {
      createUserIfNotExists: false,   // 🔥 stops BetterAuth making guest users
    },

    database: {
      generateId: () => uuidv4(),
    },
  },

  /* ---------- Plugins ---------- */
  plugins: [nextCookies()],
});
