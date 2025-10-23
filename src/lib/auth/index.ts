import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { v4 as uuidv4 } from "uuid";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://pagesandpeace.co.uk"
    : "http://localhost:3000";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? BASE_URL, // ✅ new

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: false,
    // autoSignInAfterVerification: true, // optional
    async sendVerificationEmail({ user, url /*, token*/ }) {
      const verifyUrl = url.startsWith("http")
        ? url
        : new URL(url, BASE_URL).toString(); // ✅ fixed
      await resend.emails.send({
        from: "Pages & Peace <hello@pagesandpeace.co.uk>",
        to: user.email,
        subject: "Confirm your email address ☕",
        html: `...<a href="${verifyUrl}">Verify My Email</a>...`,
      });
    },
    async afterEmailVerification(user) {
      console.log(`✅ ${user.email} verified successfully!`);
    },
  },

  cookies: {
    sessionToken: {
      name: "auth_session",
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      },
    },
  },

  advanced: {
    database: {
      generateId: () => uuidv4(),
    },
  },

  plugins: [nextCookies()],
});
