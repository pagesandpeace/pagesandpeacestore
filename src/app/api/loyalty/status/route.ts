import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth"; // Better Auth server instance
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Helper that reads a user's loyalty flag by id
 */
async function readLoyaltyByUserId(userId: string) {
  const rows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      loyaltyprogram: schema.users.loyaltyprogram,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  return rows[0] ?? null;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const trace = url.searchParams.get("trace") === "true"; // enable verbose logs with ?trace=true

  try {
    // 1) Try session first (recommended in production)
    const hdrs = await headers();
    let sessionUserId: string | null = null;

    try {
      const session = await auth.api.getSession({ headers: hdrs });
      sessionUserId = session?.user?.id ?? null;
      if (trace) console.log("[loyalty/status] session:", session);
    } catch (err) {
      if (trace) console.error("[loyalty/status] getSession error:", err);
    }

    // 2) Fallback: accept ?userId=... for manual testing
    const queryUserId = url.searchParams.get("userId");
    const userId = sessionUserId || queryUserId;

    if (!userId) {
      if (trace) console.warn("[loyalty/status] No userId from session or query");
      return NextResponse.json(
        { error: "Not authenticated", reason: "no-session", loyaltyprogram: false },
        { status: 401 }
      );
    }

    // 3) Read from DB
    const userRow = await readLoyaltyByUserId(userId);
    if (trace) console.log("[loyalty/status] userRow:", userRow);

    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 4) Return a verbose payload for easier debugging
    return NextResponse.json(
      {
        userId: userRow.id,
        email: userRow.email,
        loyaltyprogram: Boolean(userRow.loyaltyprogram),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[loyalty/status] Unhandled error:", err);
    return NextResponse.json({ error: "Failed to fetch loyalty status" }, { status: 500 });
  }
}
