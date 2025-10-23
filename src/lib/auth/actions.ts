"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { auth } from ".";
import { db } from "../db";
import { guests } from "../db/schema/index";
import { and, eq, lt } from "drizzle-orm";
import { randomUUID } from "crypto";

const COOKIE_OPTIONS = {
  httpOnly: true as const,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/" as const,
  maxAge: 60 * 60 * 24 * 7,
};

const emailSchema = z.string().email();
const passwordSchema = z.string().min(8).max(128);
const nameSchema = z.string().min(1).max(100);

// ------------------ Guest sessions ------------------
export async function createGuestSession() {
  const cookieStore = await cookies();
  const existing = (await cookieStore).get("guest_session");
  if (existing?.value) return { ok: true, sessionToken: existing.value };

  const sessionToken = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + COOKIE_OPTIONS.maxAge * 1000);

  await db.insert(guests).values({ sessionToken, expiresAt });
  (await cookieStore).set("guest_session", sessionToken, COOKIE_OPTIONS);
  return { ok: true, sessionToken };
}

export async function guestSession() {
  const cookieStore = await cookies();
  const token = (await cookieStore).get("guest_session")?.value;
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
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };
  const data = signUpSchema.parse(raw);

  const result = await auth.api.signUpEmail({ body: data });

  // Clean up any temporary guest session
  await migrateGuestToUser();

  // ✅ Return a signal so the client can redirect to the verification page
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
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };
  const data = signInSchema.parse(raw);

  const result = await auth.api.signInEmail({ body: data });
  await migrateGuestToUser();
  return { ok: true, userId: result.user?.id };
}

export async function getCurrentUser() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user ?? null;
  } catch {
    return null;
  }
}

export async function signOut() {
  // Forward cookies so better-auth clears the session token
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
  const token = (await cookieStore).get("guest_session")?.value;
  if (!token) return;
  await db.delete(guests).where(eq(guests.sessionToken, token));
  (await cookieStore).delete("guest_session");
}
