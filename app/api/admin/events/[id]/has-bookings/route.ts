import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseService } from "@/lib/supabase/service";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json(
        { error: "Missing event id" },
        { status: 400 }
      );
    }

    /* --------------------------------------------------
       1. Require admin
    -------------------------------------------------- */
    const { error: adminError } = await requireAdmin();

    if (adminError) return adminError;

    /*
      Use service role after admin check so RLS cannot hide bookings.
      This prevents the delete UI from incorrectly thinking an event
      has no bookings.
    */
    const supabase = supabaseService();

    /* --------------------------------------------------
       2. Check whether event has bookings
    -------------------------------------------------- */
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