import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserServer } from "@/lib/auth/actions";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserServer();

    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, title, description, date, capacity, pricePence } = await req.json();

    if (!id || !title || !date || !capacity || !pricePence) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await db
  .update(events)
  .set({
    title,
    description,
    date: new Date(date),
    capacity: Number(capacity),
    pricePence: Number(pricePence),
    updatedAt: new Date(),
  })
  .where(eq(events.id, id));


    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Event update error:", err);
    return NextResponse.json({ error: "Server error updating event" }, { status: 500 });
  }
}
