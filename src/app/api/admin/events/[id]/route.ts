import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserServer } from "@/lib/auth/actions";

/* --------------------------------------------------------
   GET SINGLE EVENT
-------------------------------------------------------- */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserServer();

    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eventId = params.id;

    const result = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    const event = result[0];

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (err) {
    console.error("❌ GET event error:", err);
    return NextResponse.json(
      { error: "Server error fetching event" },
      { status: 500 }
    );
  }
}

/* --------------------------------------------------------
   DELETE EVENT  
   (cascade removes bookings automatically)
-------------------------------------------------------- */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserServer();

    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;

    await db.delete(events).where(eq(events.id, id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ DELETE event error:", err);
    return NextResponse.json(
      { error: "Server error deleting event" },
      { status: 500 }
    );
  }
}
