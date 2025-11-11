import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    const user = session?.user;
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const [row] = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        image: schema.users.image,
        loyaltyprogram: schema.users.loyaltyprogram,
      })
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1);

    if (!row) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    console.error("[api/me] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
