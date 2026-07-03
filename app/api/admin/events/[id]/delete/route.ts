import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseService } from "@/lib/supabase/service";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing event id" },
        { status: 400 }
      );
    }

    /* --------------------------------------------------
       1. Require admin first
    -------------------------------------------------- */
    const { error: adminError } = await requireAdmin();

    if (adminError) return adminError;

    /*
      Use service role AFTER admin check.
      This avoids RLS silently preventing the delete.
    */
    const supabase = supabaseService();

    /* --------------------------------------------------
       2. Do not hard-delete events with bookings
    -------------------------------------------------- */
    const { count, error: bookingError } = await supabase
      .from("event_bookings")
      .select("*", { count: "exact", head: true })
      .eq("event_id", id);

    if (bookingError) {
      console.error("❌ [DELETE EVENT] booking check error:", bookingError);

      return NextResponse.json(
        { error: bookingError.message },
        { status: 500 }
      );
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            "This event has bookings and cannot be deleted. Unpublish it instead.",
        },
        { status: 400 }
      );
    }

    /* --------------------------------------------------
       3. Load event and linked product ids
    -------------------------------------------------- */
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, product_id")
      .eq("id", id)
      .single();

    if (eventError || !event) {
      console.error("❌ [DELETE EVENT] event not found:", eventError);

      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const { data: tickets, error: ticketsError } = await supabase
      .from("event_ticket_types")
      .select("id, product_id")
      .eq("event_id", id);

    if (ticketsError) {
      console.error("❌ [DELETE EVENT] ticket lookup error:", ticketsError);

      return NextResponse.json(
        { error: ticketsError.message },
        { status: 500 }
      );
    }

    const productIds = Array.from(
      new Set(
        [
          event.product_id,
          ...(tickets || []).map((ticket) => ticket.product_id),
        ].filter(Boolean)
      )
    );

    /* --------------------------------------------------
       4. Delete ticket types
    -------------------------------------------------- */
    const { error: deleteTicketsError } = await supabase
      .from("event_ticket_types")
      .delete()
      .eq("event_id", id);

    if (deleteTicketsError) {
      console.error("❌ [DELETE EVENT] ticket delete error:", deleteTicketsError);

      return NextResponse.json(
        { error: deleteTicketsError.message },
        { status: 500 }
      );
    }

    /* --------------------------------------------------
       5. Delete event and verify row was deleted
    -------------------------------------------------- */
    const { data: deletedEvent, error: deleteEventError } = await supabase
      .from("events")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (deleteEventError) {
      console.error("❌ [DELETE EVENT] event delete error:", deleteEventError);

      return NextResponse.json(
        { error: deleteEventError.message },
        { status: 500 }
      );
    }

    if (!deletedEvent) {
      console.error("❌ [DELETE EVENT] no event row deleted:", id);

      return NextResponse.json(
        { error: "No event row was deleted." },
        { status: 400 }
      );
    }

    /* --------------------------------------------------
       6. Delete linked products
    -------------------------------------------------- */
    if (productIds.length > 0) {
      const { error: deleteProductsError } = await supabase
        .from("products")
        .delete()
        .in("id", productIds);

      if (deleteProductsError) {
        console.warn(
          "⚠️ [DELETE EVENT] Event deleted, but products could not be deleted:",
          deleteProductsError
        );

        return NextResponse.json({
          success: true,
          deletedEventId: deletedEvent.id,
          warning:
            "Event deleted, but some linked products could not be deleted.",
        });
      }
    }

    console.log("✅ [DELETE EVENT] deleted:", deletedEvent.id);

    return NextResponse.json({
      success: true,
      deletedEventId: deletedEvent.id,
    });
  } catch (err) {
    console.error("💥 [DELETE EVENT] crashed:", err);

    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}