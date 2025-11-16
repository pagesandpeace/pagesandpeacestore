import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";
import { eq } from "drizzle-orm"; // ✅ FIXED: import eq with no errors

/* ---------------------------------------------
   BASE URL
--------------------------------------------- */
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.NODE_ENV === "production"
    ? "https://pagesandpeace.co.uk"
    : "http://localhost:3000");

console.log("🚀 BetterAuth BASE_URL resolved:", BASE_URL);

const resend = new Resend(process.env.RESEND_API_KEY!);

/* ---------------------------------------------
   TYPES FOR SESSION CALLBACK
--------------------------------------------- */
interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: string | null;
  loyaltyprogram?: boolean;
}

interface SessionObject {
  user: SessionUser;
}

/* ---------------------------------------------
   BETTERAUTH CONFIG
--------------------------------------------- */
export const auth = betterAuth({
  baseURL: BASE_URL,

  /* DATABASE CONFIG */
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),

  /* USER MODEL + ROLE FIELD */
  user: {
    additionalFields: {
      role: { type: "string", required: false },
    },
    attributes: {
      additionalFields: {
        role: {
          type: "string",
          sql: (usersTable: typeof schema.users) => usersTable.role,
        },
      },
    },
  },

  /* EMAIL + PASSWORD AUTH */
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    providerId: "email",
    accountIdStrategy: "email",
  },

  /* SOCIAL PROVIDERS */
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      prompt: "select_account",
      accessType: "offline",
      redirectTo: "/dashboard",
    },
  },

  /* EMAIL VERIFICATION */
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: false,

    async sendVerificationEmail({ user, url }) {
      const verifyUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;

      try {
        await resend.emails.send({
          from: "Pages & Peace <hello@pagesandpeace.co.uk>",
          to: user.email,
          subject: "Confirm your email address ☕",
          html: `
            <div style="background:#FAF6F1; padding:32px; font-family:Montserrat, Arial; color:#111;">
              <h2 style="text-align:center;">Welcome to Pages & Peace 📚☕</h2>
              <p style="text-align:center;">Please confirm your email address to continue.</p>
              <p style="text-align:center; margin-top:32px;">
                <a href="${verifyUrl}"
                  style="background:#5DA865; color:#FAF6F1; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:600;">
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

  /* COOKIES */
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

  /* ADVANCED */
  advanced: {
    session: {
      createUserIfNotExists: false,
    },
    database: {
      generateId: () => uuidv4(),
    },
  },

  /* ---------------------------------------------
     ⭐ FIXED SESSION CALLBACK (NO ANY, NO ERRORS)
  --------------------------------------------- */
  callbacks: {
    async session({
      session,
      user,
    }: {
      session: SessionObject;
      user: SessionUser;
    }) {
      try {
        const [row] = await db
          .select({
            loyaltyprogram: schema.users.loyaltyprogram,
          })
          .from(schema.users)
          .where(eq(schema.users.id, user.id))
          .limit(1);

        session.user.loyaltyprogram = row?.loyaltyprogram ?? false;
      } catch (err) {
        console.error("⚠️ Failed to load loyaltyprogram into session:", err);
        session.user.loyaltyprogram = false;
      }

      return session;
    },
  },

  plugins: [nextCookies()],
});
