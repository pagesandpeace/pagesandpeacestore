import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";

/* ---------------------------------------------
   BASE URL (local or production)
--------------------------------------------- */
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.NODE_ENV === "production"
    ? "https://pagesandpeace.co.uk"
    : "http://localhost:3000");

console.log("🚀 BetterAuth BASE_URL resolved:", BASE_URL);

const resend = new Resend(process.env.RESEND_API_KEY!);

/* ---------------------------------------------
   BETTERAUTH CONFIG
--------------------------------------------- */
export const auth = betterAuth({
  baseURL: BASE_URL,


  /* ---------------------------------------------
     DATABASE (DRIZZLE)
  --------------------------------------------- */
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),

  /* ---------------------------------------------
     EXTEND USER MODEL (ROLE)
  --------------------------------------------- */
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
      },
    },
  },

  /* ---------------------------------------------
     EMAIL + PASSWORD AUTH
  --------------------------------------------- */
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  /* ---------------------------------------------
     GOOGLE OAuth
  --------------------------------------------- */
  socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    prompt: "select_account",
    accessType: "offline",
    redirectTo: "/dashboard",   // ⭐ <— HERE
  },
},


  /* ---------------------------------------------
     EMAIL VERIFICATION
  --------------------------------------------- */
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: false,

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
            <div style="background:#FAF6F1; padding:32px; font-family:Montserrat, Arial; color:#111;">
              <h2 style="text-align:center; margin-bottom:16px;">Welcome to Pages & Peace 📚☕</h2>

              <p style="text-align:center;">Please confirm your email address to continue.</p>

              <p style="text-align:center; margin-top:32px;">
                <a href="${verifyUrl}"
                  style="background:#5DA865; color:#FAF6F1; padding:14px 28px;
                  border-radius:8px; text-decoration:none; font-weight:600;">
                  Verify My Email
                </a>
              </p>

              <p style="text-align:center; margin-top:40px; font-size:12px; color:#555;">
                If you didn’t create this account, ignore this email.
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

  /* ---------------------------------------------
     SESSION COOKIE
  --------------------------------------------- */
  cookies: {
    sessionToken: {
      name: "auth_session",
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      },
    },
  },

  /* ---------------------------------------------
     ADVANCED (ID generation)
  --------------------------------------------- */
  advanced: {
    session: {
      createUserIfNotExists: false,
    },
    database: {
      generateId: () => uuidv4(),
    },
  },

  plugins: [nextCookies()],
});
