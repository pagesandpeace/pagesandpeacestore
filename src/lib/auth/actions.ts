"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { auth } from ".";
import { db } from "../db";
import * as schema from "../db/schema";
import { guests } from "../db/schema";
import { and, eq, lt, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const COOKIE_OPTIONS = {
  httpOnly: true as const,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/" as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

// ✅ Validation Schemas
const emailSchema = z.string().email();
const passwordSchema = z.string().min(8).max(128);
const nameSchema = z.string().min(1).max(100);

/* -------------------------------------------------------------------------- */
/*                             GUEST SESSION HELPERS                          */
/* -------------------------------------------------------------------------- */

export async function createGuestSession() {
  const cookieStore = await cookies();
  const existing = cookieStore.get("guest_session");
  if (existing?.value) return { ok: true, sessionToken: existing.value };

  const sessionToken = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + COOKIE_OPTIONS.maxAge * 1000);

  await db.insert(guests).values({ sessionToken, expiresAt });
  cookieStore.set("guest_session", sessionToken, COOKIE_OPTIONS);
  return { ok: true, sessionToken };
}

export async function guestSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("guest_session")?.value;
  if (!token) return { sessionToken: null };

  const now = new Date();
  await db
    .delete(guests)
    .where(and(eq(guests.sessionToken, token), lt(guests.expiresAt, now)));

  return { sessionToken: token };
}

/* -------------------------------------------------------------------------- */
/*                                SIGN UP                                     */
/* -------------------------------------------------------------------------- */

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

  // ✅ Loyalty + consent flags
  const loyaltyProgramOptIn = formData.get("loyaltyprogram") === "true";
  const marketingConsent = formData.get("marketingConsent") === "true";
  const acceptedTerms = formData.get("acceptedTerms") === "true";
  const loyaltyPoints = 0;

  // 🚨 Require terms if joining loyalty (for GDPR)
  if (loyaltyProgramOptIn && !acceptedTerms) {
    return { ok: false, message: "You must accept the Terms & Privacy Policy." };
  }

  // ✅ Create user via Better Auth
  const result = await auth.api.signUpEmail({
    body: {
      ...data,
      callbackURL: "/verify-success",
    },
  });

  const userId = result.user?.id;
  if (!userId) {
    return { ok: false, message: "User ID missing after signup." };
  }

  // ✅ Base user update (handles loyalty boolean + points)
  await db
    .update(schema.users)
    .set({
      loyaltyprogram: loyaltyProgramOptIn,
      loyaltypoints: loyaltyPoints,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));

  // ✅ If joining loyalty, create record in loyalty_members table
  if (loyaltyProgramOptIn) {
    try {
      await db
        .insert(schema.loyaltyMembers)
        .values({
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
      console.log(`🌿 Created loyalty membership for ${data.email}`);
    } catch (err) {
      console.error("❌ Loyalty member insert error:", err);
    }
  }

  // 🧩 Ensure verification token exists
  try {
    const [existingToken] = await db
      .select()
      .from(schema.verifications)
      .where(eq(schema.verifications.identifier, data.email))
      .limit(1);

    if (!existingToken) {
      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await db.insert(schema.verifications).values({
        id: randomUUID(),
        identifier: data.email,
        value: token,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("🧩 Created fallback verification token for", data.email);
    } else {
      console.log("✅ Verification token already exists for", data.email);
    }
  } catch (err) {
    console.error("❌ Failed to ensure verification token:", err);
  }

  // ✅ Clean up guest session
  await migrateGuestToUser();

  return {
    ok: true,
    userId,
    redirectTo: "/verify-pending",
  };
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

    return { ok: true, userId: result.user?.id, redirectTo: "/dashboard" };
  } catch (err) {
    console.error("❌ Sign-in failed:", err);
    return { ok: false };
  }
}

/* -------------------------------------------------------------------------- */
/*                             SESSION / AUTH HELPERS                         */
/* -------------------------------------------------------------------------- */

export async function getCurrentUser() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user ?? null;
  } catch {
    return null;
  }
}

export async function signOut() {
  const forwardedHeaders = new Headers(await headers());
  await auth.api.signOut({ headers: forwardedHeaders });
  return { ok: true };
}

export async function mergeGuestCartWithUserCart() {
  await migrateGuestToUser();
  return { ok: true };
}

async function migrateGuestToUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("guest_session")?.value;
  if (!token) return;

  await db.delete(guests).where(eq(guests.sessionToken, token));
  cookieStore.delete("guest_session");
}

/* -------------------------------------------------------------------------- */
/*                             LOYALTY HELPERS                                */
/* -------------------------------------------------------------------------- */

export async function updateLoyaltyPoints(userId: string, pointsToAdd: number) {
  try {
    await db
      .update(schema.users)
      .set({
        loyaltypoints: sql`${schema.users.loyaltypoints} + ${pointsToAdd}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId));
    return { ok: true };
  } catch (err) {
    console.error("❌ Loyalty point update error:", err);
    return { ok: false };
  }
}

/* -------------------------------------------------------------------------- */
/*                             CHANGE PASSWORD                                */
/* -------------------------------------------------------------------------- */

export async function changePassword(currentPassword: string, newPassword: string) {
  try {
    const forwardedHeaders = new Headers(await headers());
    const result = await auth.api.changePassword({
      body: { currentPassword, newPassword },
      headers: forwardedHeaders,
    });

    console.log("🔍 Password change response:", result);

    if (!result || Object.keys(result).length === 0) {
      return { ok: true, message: "Password changed successfully (empty response)." };
    }

    if ("user" in result || ("status" in result && (result as { status?: number }).status === 200)) {
      return { ok: true, message: "Password updated successfully." };
    }

    return { ok: false, message: "Unexpected response from API." };
  } catch (err: unknown) {
    console.error("❌ Password change error:", err);
    let message = "Password change failed.";
    if (err instanceof Error) message = err.message;
    return { ok: false, message };
  }
}
