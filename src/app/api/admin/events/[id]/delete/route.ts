import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserServer } from "@/lib/auth/actions";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserServer();

    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.delete(events).where(eq(events.id, params.id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Delete event error:", err);
    return NextResponse.json(
      { error: "Server error deleting event" },
      { status: 500 }
    );
  }
}
