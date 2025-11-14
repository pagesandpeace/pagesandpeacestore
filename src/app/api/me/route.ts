export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  console.log("📥 [/api/me] HIT");

  try {
    const hdrs = await headers();

    const session = await auth.api.getSession({ headers: hdrs });
    console.log("🔑 Session:", session);

    if (!session?.user) {
      console.log("❌ No user in session — returning {id:null}");
      return NextResponse.json({ id: null }, { status: 200 });
    }

    const user = session.user;
    console.log("✅ Found session user:", user);

    // ⭐ FIX: INCLUDE ROLE
    const [row] = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        image: schema.users.image,
        loyaltyprogram: schema.users.loyaltyprogram,
        role: schema.users.role, // ← ⭐ ADD THIS FIELD
      })
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1);

    console.log("📀 DB row:", row);

    if (!row) {
      console.log("⚠️ User missing in DB — return logged-out state");
      return NextResponse.json({ id: null }, { status: 200 });
    }

    console.log("🏁 Returning user:", row);
    return NextResponse.json(row);
  } catch (err) {
    console.error("💥 [/api/me] ERROR:", err);
    return NextResponse.json({ id: null }, { status: 200 });
  }
}
