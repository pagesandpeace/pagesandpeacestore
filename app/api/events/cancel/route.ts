import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    const body = await req.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    // ADMIN ONLY: in production check admin role here
    // (You can add later using RLS or metadata)

    // FETCH BOOKING
    const { data: booking } = await supabase
      .from("event_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // CANCEL THE BOOKING
    await supabase
      .from("event_bookings")
      .update({
        cancelled: true,
        cancellation_requested: false,
      })
      .eq("id", bookingId);

    return NextResponse.json({ status: "cancelled" });
  } catch (err) {
    console.error("❌ Admin cancellation error:", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
