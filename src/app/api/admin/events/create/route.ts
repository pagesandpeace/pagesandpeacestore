import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserServer } from "@/lib/auth/actions";

/**
 * POST /api/admin/events/create
 * Creates a new event (admin/staff only)
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔍 Fetch user's role from database (BetterAuth does NOT include role)
    const [dbUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser || (dbUser.role !== "admin" && dbUser.role !== "staff")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse payload
    const { title, description, date, capacity, pricePence } = await req.json();

    if (!title || !date || !capacity || !pricePence) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create event
    const id = crypto.randomUUID();

    await db.insert(events).values({
      id,
      title,
      description: description || "",
      date: new Date(date),
      capacity: Number(capacity),
      pricePence: Number(pricePence),
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("❌ Event Creation Error:", err);
    return NextResponse.json(
      { error: "Server error creating event" },
      { status: 500 }
    );
  }
}
