import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eventBookings, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserServer } from "@/lib/auth/actions";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's role from DB
    const [dbUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser || (dbUser.role !== "admin" && dbUser.role !== "staff")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: "Missing bookingId" },
        { status: 400 }
      );
    }

    // Update booking
    await db
      .update(eventBookings)
      .set({ cancelled: true })
      .where(eq(eventBookings.id, bookingId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Cancel booking API error:", err);
    return NextResponse.json(
      { error: "Server error canceling booking" },
      { status: 500 }
    );
  }
}
