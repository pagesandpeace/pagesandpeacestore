import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await context.params;
    const supabase = await supabaseServer();

    if (!eventId) {
      return NextResponse.json(
        { error: "Missing event id" },
        { status: 400 }
      );
    }

    const { count, error } = await supabase
      .from("event_bookings")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId);

    if (error) {
      console.error("❌ [HAS BOOKINGS] query failed:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      hasBookings: (count ?? 0) > 0,
    });
  } catch (err) {
    console.error("💥 [HAS BOOKINGS] crashed:", err);
    return NextResponse.json(
      { error: "Failed to check bookings" },
      { status: 500 }
    );
  }
}
