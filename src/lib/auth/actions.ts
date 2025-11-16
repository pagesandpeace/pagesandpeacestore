"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { auth } from ".";
import { db } from "../db";
import * as schema from "../db/schema";
import { and, eq, lt } from "drizzle-orm";
import { randomUUID } from "crypto";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

/* ========================================================================== */
/*                             GUEST SESSION HELPERS                          */
/* ========================================================================== */

export async function createGuestSession() {
  const cookieStore = await cookies();
  const existing = cookieStore.get("guest_session");

  if (existing?.value)
    return { ok: true, sessionToken: existing.value };

  const sessionToken = randomUUID();
  const expiresAt = new Date(Date.now() + COOKIE_OPTIONS.maxAge * 1000).toISOString();

  await db.insert(schema.guests).values({
    sessionToken,
    expiresAt,
  });

  cookieStore.set({
    name: "guest_session",
    value: sessionToken,
    ...COOKIE_OPTIONS,
  });

  return { ok: true, sessionToken };
}

export async function guestSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("guest_session")?.value;
  if (!token) return { sessionToken: null };

  const nowIso = new Date().toISOString();

  await db
    .delete(schema.guests)
    .where(
      and(
        eq(schema.guests.sessionToken, token),
        lt(schema.guests.expiresAt, nowIso)
      )
    );

  return { sessionToken: token };
}

/* ========================================================================== */
/*                                  SIGN UP                                    */
/* ========================================================================== */

const emailSchema = z.string().email();
const passwordSchema = z.string().min(8).max(128);
const nameSchema = z.string().min(1).max(100);

const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

export async function signUp(formData: FormData) {
  const data = signUpSchema.parse({
    name: formData.get("name") as string,
    email: (formData.get("email") as string).toLowerCase(),
    password: formData.get("password") as string,
  });

  const loyaltyProgramOptIn = formData.get("loyaltyprogram") === "true";
  const marketingConsent = formData.get("marketingConsent") === "true";

  const result = await auth.api.signUpEmail({
    body: { ...data, callbackURL: "/verify-success" },
  });

  const userId = result.user?.id;
  if (!userId) return { ok: false, message: "User ID missing after signup." };

  await db
    .update(schema.users)
    .set({
      loyaltyprogram: loyaltyProgramOptIn,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.users.id, userId));

  if (loyaltyProgramOptIn) {
    await db
      .insert(schema.loyaltyMembers)
      .values({
        userId,
        status: "active",
        tier: "starter",
        marketingConsent,
        termsVersion: "v1.0",
        joinedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: schema.loyaltyMembers.userId,
        set: {
          status: "active",
          marketingConsent,
          termsVersion: "v1.0",
          updatedAt: new Date().toISOString(),
        },
      });
  }

  await migrateGuestToUser();

  return { ok: true, userId, redirectTo: "/verify-pending" };
}

/* ========================================================================== */
/*                                SIGN-IN SCHEMA                              */
/* ========================================================================== */

const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/* ========================================================================== */
/*                                  SIGN IN                                   */
/* ========================================================================== */

export async function signIn(formData: FormData) {
  console.log("\n\n========== 🚀 SIGN-IN START ==========");

  const data = {
    email: (formData.get("email") as string)?.toLowerCase(),
    password: formData.get("password") as string,
  };

  console.log("📥 Incoming formData:", data);

  // --------------------------------------------
  // 1) VALIDATION - PASSWORD TOO SHORT / INVALID
  // --------------------------------------------
  try {
    signInSchema.parse(data);
  } catch (err) {
    console.error("❌ Zod validation failed:", err);
    return {
      ok: false,
      type: "validation",
      message: "Password must be at least 8 characters.",
    };
  }

  const callbackURL = formData.get("callbackURL") as string | null;
  console.log("🔗 callbackURL:", callbackURL);

  // --------------------------------------------
  // 2) LOOK UP USER + ACCOUNT
  // --------------------------------------------
  console.log("🔍 Checking users table for:", data.email);

  const [existingUser] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
    })
    .from(schema.users)
    .where(eq(schema.users.email, data.email))
    .limit(1);

  console.log("📀 User lookup:", existingUser);

  if (existingUser) {
    const [accountRow] = await db
      .select({
        providerId: schema.accounts.providerId,
        password: schema.accounts.password,
      })
      .from(schema.accounts)
      .where(eq(schema.accounts.userId, existingUser.id))
      .limit(1);

    console.log("📀 Account row:", accountRow);

    if (accountRow && !accountRow.password) {
      return {
        ok: false,
        type: "google-only",
        message: "This email is linked to a Google account.",
      };
    }
  }

  // --------------------------------------------
  // 3) ATTEMPT PASSWORD LOGIN
  // --------------------------------------------
  console.log("🔐 Calling BetterAuth signInEmail()…");
  let result;

  try {
    result = await auth.api.signInEmail({ body: data });
    console.log("🔓 BetterAuth SUCCESS:", result);
  } catch (err: unknown) {
    console.error("❌ BetterAuth FAILED:", err);

    return {
      ok: false,
      type: "invalid-credentials",
      message: "Incorrect email or password.",
    };
  }

  // --------------------------------------------
  // 4) MIGRATE GUEST SESSION
  // --------------------------------------------
  await migrateGuestToUser();

  // --------------------------------------------
  // 5) ROLE & REDIRECT
  // --------------------------------------------
  const [dbUser] = await db
    .select({
      id: schema.users.id,
      role: schema.users.role,
    })
    .from(schema.users)
    .where(eq(schema.users.id, result.user!.id))
    .limit(1);

  const role = dbUser?.role ?? "customer";

  let redirectTo =
    role === "admin" || role === "staff" ? "/admin" : "/dashboard";

  if (callbackURL) redirectTo = callbackURL;

  return {
    ok: true,
    userId: result.user!.id,
    redirectTo,
  };
}


/* ========================================================================== */
/*                             MIGRATE GUEST → USER                           */
/* ========================================================================== */

async function migrateGuestToUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("guest_session")?.value;
  if (!token) return;

  await db.delete(schema.guests).where(eq(schema.guests.sessionToken, token));
  cookieStore.delete("guest_session");
}

/* ========================================================================== */
/*                              GET CURRENT USER                              */
/* ========================================================================== */

export async function getCurrentUserServer() {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });

    if (!session?.user?.id) return null;

    const [fullUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, session.user.id))
      .limit(1);

    return fullUser || null;
  } catch (err) {
    console.error("❌ getCurrentUserServer error:", err);
    return null;
  }
}

export async function getCurrentUserClient() {
  try {
    const res = await fetch("/api/me", {
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("❌ getCurrentUserClient error:", err);
    return null;
  }
}

/* ========================================================================== */
/*                                   SIGN OUT                                 */
/* ========================================================================== */

export async function signOut() {
  try {
    const hdrs = await headers();

    try {
      await auth.api.signOut({ headers: hdrs });
    } catch (err) {
      console.warn("⚠️ BetterAuth signOut() errored (ignored):", err);
    }

    const cookieStore = await cookies();
    cookieStore.set({
      name: "auth_session",
      value: "",
      path: "/",
      expires: new Date(0),
      maxAge: 0,
    });
  } catch (err) {
    console.error("❌ signOut() fatal error:", err);
  }

  return { ok: true };
}

/* ========================================================================== */
/*                              CHANGE PASSWORD                               */
/* ========================================================================== */

export async function changePassword(currentPassword: string, newPassword: string) {
  try {
    const hdrs = await headers();

    const session = await auth.api.getSession({ headers: hdrs });
    if (!session?.user) {
      return { ok: false, message: "Not authenticated" };
    }

    const result = await auth.api.changePassword({
      body: { currentPassword, newPassword },
      headers: hdrs,
    });

    if (!result) {
      return { ok: false, message: "Password change failed unexpectedly." };
    }

    return { ok: true };
  } catch (err: unknown) {
    console.error("❌ changePassword error:", err);

    const msg =
      err instanceof Error
        ? err.message
        : "Something went wrong updating your password.";

    return { ok: false, message: msg };
  }
}
