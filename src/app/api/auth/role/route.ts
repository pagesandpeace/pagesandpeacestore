import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ role: null });
    }

    const [user] = await db
      .select({ role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, session.user.id))
      .limit(1);

    return NextResponse.json({ role: user?.role ?? null });
  } catch (err) {
    console.error("Role API Error:", err);
    return NextResponse.json({ role: null });
  }
}
