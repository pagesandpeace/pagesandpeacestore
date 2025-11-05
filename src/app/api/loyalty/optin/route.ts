import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import {
  loyaltyMembers,
  loyaltyLedger,
  idempotencyKeys,
} from "@/lib/db/schema/loyalty"; // <-- new file you added
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    // 1️⃣ Authenticate the user
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user;
    if (!user)
      return new Response(JSON.stringify({ error: "Not signed in" }), {
        status: 401,
      });

    // 2️⃣ Verify email before allowing opt-in
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

    // 3️⃣ Parse body for consent info
    const { termsVersion, marketingConsent } = (await req.json().catch(() => ({}))) || {};
    const idemKey = req.headers.get("Idempotency-Key") ?? null;

    // 4️⃣ Handle idempotency (safe retries)
    if (idemKey) {
      const [hit] = await db
        .select()
        .from(idempotencyKeys)
        .where(eq(idempotencyKeys.key, idemKey))
        .limit(1);
      if (hit) return new Response(JSON.stringify(hit.response), { status: 200 });
    }

    // 5️⃣ Upsert loyalty_members record
    await db
      .insert(loyaltyMembers)
      .values({
        userId: user.id,
        status: "active",
        tier: "starter",
        marketingConsent: !!marketingConsent,
        termsVersion: termsVersion ?? "v1.0",
        joinedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: loyaltyMembers.userId,
        set: {
          status: "active",
          marketingConsent: !!marketingConsent,
          termsVersion: termsVersion ?? "v1.0",
          updatedAt: new Date(),
        },
      });

    // 6️⃣ Give a join bonus
    const joinBonus = 50;
    await db.insert(loyaltyLedger).values({
      id: randomUUID(),
      userId: user.id,
      type: "join_bonus",
      points: joinBonus,
      source: "web",
      metadata: { reason: "welcome" },
      createdAt: new Date(),
    });

    // 7️⃣ Update legacy field for backward compatibility
    await db
      .update(schema.users)
      .set({ loyaltyprogram: true, updatedAt: new Date() })
      .where(eq(schema.users.id, user.id));

    const response = {
      ok: true,
      message: "You’ve joined the loyalty program!",
      member: {
        userId: user.id,
        tier: "starter",
        joinBonus,
        marketingConsent: !!marketingConsent,
      },
    };

    // 8️⃣ Save idempotency record
    if (idemKey) {
      await db
        .insert(idempotencyKeys)
        .values({
          key: idemKey,
          scope: "loyalty.optin",
          response,
          createdAt: new Date(),
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
