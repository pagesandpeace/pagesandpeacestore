"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { auth } from ".";
import { db } from "../db";
import { guests } from "../db/schema";
import { and, eq, lt } from "drizzle-orm";
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

// ------------------ Guest sessions ------------------
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

// ------------------ Sign up / Sign in ------------------
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

  const result = await auth.api.signUpEmail({
    body: {
      ...data,
      callbackURL: "/verify-success", // ✅ redirect after verification
    },
  });

  await migrateGuestToUser();

  return {
    ok: true,
    userId: result.user?.id,
    redirectTo: "/verify-pending",
  };
}

const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export async function signIn(formData: FormData) {
  const data = signInSchema.parse({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  const result = await auth.api.signInEmail({ body: data });
  await migrateGuestToUser();

  // ✅ Redirect users to /dashboard now
  return { ok: true, userId: result.user?.id, redirectTo: "/dashboard" };
}

// ------------------ Session / Auth helpers ------------------
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

// ------------------ Change Password ------------------
export async function changePassword(currentPassword: string, newPassword: string) {
  try {
    const forwardedHeaders = new Headers(await headers());
    const result = await auth.api.changePassword({
      body: { currentPassword, newPassword },
      headers: forwardedHeaders,
    });

    console.log("🔍 Password change response:", result);

    // Sometimes Better Auth returns empty response on success
    if (!result || Object.keys(result).length === 0) {
      return { ok: true, message: "Password changed successfully (empty response)." };
    }

    // ✅ Type-safe check (no `.status` unless result has it)
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
