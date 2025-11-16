// src/app/api/me/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/* ---------------------------------------------------------
   TYPES (ensures no "any" + stable return shape)
--------------------------------------------------------- */
interface MeResponse {
  id: string | null;
  email?: string;
  name?: string | null;
  image?: string | null;
  loyaltyprogram?: boolean;
  role?: string | null;
  updatedAt?: string | null;
}

/* ---------------------------------------------------------
   ROUTE HANDLER
--------------------------------------------------------- */
export async function GET() {
  console.log("📥 [/api/me] HIT");

  try {
    const hdrs = await headers();

    /* -----------------------------------------------------
       ALWAYS GET LIVE SESSION — never cached
    ----------------------------------------------------- */
    const session = await auth.api.getSession({ headers: hdrs });
    console.log("🔑 Session:", session);

    if (!session?.user) {
      console.log("❌ No session user — return id:null");
      const result: MeResponse = { id: null };
      return NextResponse.json(result, { status: 200 });
    }

    const user = session.user;

    /* -----------------------------------------------------
       FRESH DATABASE READ (ABSOLUTE NO CACHE)
    ----------------------------------------------------- */
    const [row] = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        image: schema.users.image,
        loyaltyprogram: schema.users.loyaltyprogram,
        role: schema.users.role,
        updatedAt: schema.users.updatedAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1);

    if (!row) {
      console.log("⚠️ No DB entry found — returning null");
      const result: MeResponse = { id: null };
      return NextResponse.json(result, { status: 200 });
    }

    console.log("🏁 Returning fresh user:", row);

    /* -----------------------------------------------------
       ABSOLUTE NO-CACHE HEADERS (stops flicker)
    ----------------------------------------------------- */
    return NextResponse.json(row, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("💥 [/api/me] ERROR:", err);
    const result: MeResponse = { id: null };
    return NextResponse.json(result, { status: 200 });
  }
}
