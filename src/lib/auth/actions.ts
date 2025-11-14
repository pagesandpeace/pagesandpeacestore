// src/lib/auth/actions.ts
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

/* -------------------------------------------------------------------------- */
/*                             GUEST SESSION HELPERS                          */
/* -------------------------------------------------------------------------- */

export async function createGuestSession() {
  const cookieStore = await cookies();
  const existing = cookieStore.get("guest_session");
  if (existing?.value)
    return { ok: true, sessionToken: existing.value };

  const sessionToken = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + COOKIE_OPTIONS.maxAge * 1000);

  await db.insert(schema.guests).values({ sessionToken, expiresAt });

  // FIXED COOKIE SETTER
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

  const now = new Date();

  await db
    .delete(schema.guests)
    .where(and(eq(schema.guests.sessionToken, token), lt(schema.guests.expiresAt, now)));

  return { sessionToken: token };
}

/* -------------------------------------------------------------------------- */
/*                                SIGN UP                                     */
/* -------------------------------------------------------------------------- */

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
    email: formData.get("email") as string,
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
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));

  if (loyaltyProgramOptIn) {
    await db.insert(schema.loyaltyMembers).values({
      userId,
      status: "active",
      tier: "starter",
      marketingConsent,
      termsVersion: "v1.0",
      joinedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.loyaltyMembers.userId,
      set: {
        status: "active",
        marketingConsent,
        termsVersion: "v1.0",
        updatedAt: new Date(),
      },
    });
  }

  await migrateGuestToUser();

  return { ok: true, userId, redirectTo: "/verify-pending" };
}

/* -------------------------------------------------------------------------- */
/*                                SIGN IN                                     */
/* -------------------------------------------------------------------------- */

const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export async function signIn(formData: FormData) {
  const data = signInSchema.parse({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  try {
    const result = await auth.api.signInEmail({ body: data });
    await migrateGuestToUser();

    const callbackURL = formData.get("callbackURL") as string | null;

    return {
      ok: true,
      userId: result.user?.id,
      redirectTo: callbackURL || "/dashboard",
    };
  } catch (err) {
    console.error("❌ Sign-in failed:", err);
    return { ok: false };
  }
}

/* -------------------------------------------------------------------------- */
/*                             MIGRATE GUEST                                  */
/* -------------------------------------------------------------------------- */

async function migrateGuestToUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("guest_session")?.value;
  if (!token) return;

  await db.delete(schema.guests).where(eq(schema.guests.sessionToken, token));

  cookieStore.delete("guest_session");
}

/* -------------------------------------------------------------------------- */
/*                               GET CURRENT USER                             */
/* -------------------------------------------------------------------------- */

/** ✔ SERVER-SIDE VERSION */
export async function getCurrentUserServer() {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });

    return session?.user ?? null;
  } catch (err) {
    console.error("❌ [getCurrentUserServer] error:", err);
    return null;
  }
}

/** ✔ CLIENT-SIDE VERSION */
export async function getCurrentUserClient() {
  try {
    const res = await fetch("/api/me", {
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("❌ [getCurrentUserClient] error:", err);
    return null;
  }
}



/* -------------------------------------------------------------------------- */
/*                                   SIGN OUT                                 */
/* -------------------------------------------------------------------------- */

export async function signOut() {
  try {
    const hdrs = await headers();

    try {
      // Attempt clean logout — ignore errors
      await auth.api.signOut({ headers: hdrs });
    } catch (err) {
      console.warn("⚠️ BetterAuth signOut() errored (ignored):", err);
    }

    // FORCE REMOVE SESSION COOKIE (BetterAuth does NOT always do it)
    const cookieStore = await cookies();
    cookieStore.set({
      name: "auth_session",
      value: "",
      path: "/",
      maxAge: 0,
    });

  } catch (err) {
    console.error("❌ signOut() fatal error:", err);
  }

  // Always succeed from caller's perspective
  return { ok: true };
}





/* -------------------------------------------------------------------------- */
/*                              CHANGE PASSWORD                               */
/* -------------------------------------------------------------------------- */

export async function changePassword(currentPassword: string, newPassword: string) {
  try {
    const hdrs = await headers();

    // 1. Verify session
    const session = await auth.api.getSession({ headers: hdrs });
    if (!session?.user) {
      return { ok: false, message: "Not authenticated" };
    }

    // 2. Attempt password change
    const result = await auth.api.changePassword({
      body: { currentPassword, newPassword },
      headers: hdrs,
    });

    // BetterAuth throws on error — meaning if we reach here, it's successful
    if (!result) {
      return { ok: false, message: "Password change failed unexpectedly." };
    }

    return { ok: true };
  } catch (err: unknown) {
    console.error("❌ changePassword() error:", err);

    // Convert to readable message
    const msg =
      err instanceof Error
        ? err.message
        : "Something went wrong updating your password.";

    return { ok: false, message: msg };
  }
}
