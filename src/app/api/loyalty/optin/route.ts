import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import {
  loyaltyMembers,
  loyaltyLedger,
  idempotencyKeys,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user;

    if (!user)
      return new Response(JSON.stringify({ error: "Not signed in" }), {
        status: 401,
      });

    // Get user and check email verification
    const [dbUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1);

    if (!dbUser?.emailVerified) {
      return new Response(
        JSON.stringify({
          error: "Please verify your email before joining the loyalty program.",
        }),
        { status: 403 }
      );
    }

    const { termsVersion, marketingConsent } =
      (await req.json().catch(() => ({}))) || {};

    const idemKey = req.headers.get("Idempotency-Key");

    // Idempotency check
    if (idemKey) {
      const [hit] = await db
        .select()
        .from(idempotencyKeys)
        .where(eq(idempotencyKeys.key, idemKey))
        .limit(1);

      if (hit)
        return new Response(JSON.stringify(hit.response), { status: 200 });
    }

    const now = new Date().toISOString();

    // UPSERT loyalty_members
    await db
      .insert(loyaltyMembers)
      .values({
        userId: user.id,
        status: "active",
        tier: "starter",
        marketingConsent: !!marketingConsent,
        termsVersion: termsVersion ?? "v1.0",
        joinedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: loyaltyMembers.userId,
        set: {
          status: "active",
          marketingConsent: !!marketingConsent,
          termsVersion: termsVersion ?? "v1.0",
          updatedAt: now,
        },
      });

    // Add join bonus (loyalty_ledger)
    await db.insert(loyaltyLedger).values({
      id: randomUUID(),
      userId: user.id,
      type: "join_bonus",
      points: 50,
      source: "web",
      metadata: { reason: "welcome" },
      createdAt: now,
    });

    // Update legacy field
    await db
      .update(schema.users)
      .set({ loyaltyprogram: true, updatedAt: now })
      .where(eq(schema.users.id, user.id));

    const response = {
      ok: true,
      message: "You’ve joined the loyalty program!",
      member: {
        userId: user.id,
        tier: "starter",
        joinBonus: 50,
        marketingConsent: !!marketingConsent,
      },
    };

    if (idemKey) {
      await db
        .insert(idempotencyKeys)
        .values({
          key: idemKey,
          scope: "loyalty.optin",
          response,
          createdAt: now,
        })
        .onConflictDoNothing();
    }

    return new Response(JSON.stringify(response), { status: 201 });
  } catch (err) {
    console.error("❌ Loyalty opt-in error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to join loyalty program." }),
      { status: 500 }
    );
  }
}
