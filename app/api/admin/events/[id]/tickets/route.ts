import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseService } from "@/lib/supabase/service";
import slugify from "slugify";

/* ---------------------------------------------
   GET: list ticket types for event
--------------------------------------------- */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  console.log("🎟️ [ADMIN TICKETS][GET] route hit");

  try {
    const { id } = await ctx.params;
    console.log("🎟️ [ADMIN TICKETS][GET] event_id:", id);

    if (!id) {
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
      Use service role after admin check so admin ticket editor
      can read tickets for unpublished/duplicated draft events.
    */
    const supabase = supabaseService();

    /* --------------------------------------------------
       2. Load ticket types
    -------------------------------------------------- */
    const { data, error } = await supabase
      .from("event_ticket_types")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: true });

    console.log("🎟️ [ADMIN TICKETS][GET] result:", {
      count: data?.length,
      data,
      error,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("💥 [ADMIN TICKETS][GET] crashed:", err);

    return NextResponse.json(
      { error: "Failed to load tickets" },
      { status: 500 }
    );
  }
}

/* ---------------------------------------------
   POST: create NON-DEFAULT ticket type
--------------------------------------------- */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  console.log("🎫 [ADMIN TICKETS][POST] route hit");

  try {
    const { id } = await ctx.params;
    console.log("🎫 [ADMIN TICKETS][POST] event_id:", id);

    if (!id) {
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
      Use service role after admin check.
      This avoids RLS hiding draft/unpublished duplicated events.
    */
    const supabase = supabaseService();

    /* --------------------------------------------------
       2. Parse payload
    -------------------------------------------------- */
    const body = await req.json();

    console.log("🎫 [ADMIN TICKETS][POST] payload:", body);

    const { name, price_pence, is_active = true } = body;

    if (!name || typeof price_pence !== "number") {
      console.error("❌ [ADMIN TICKETS][POST] invalid payload");

      return NextResponse.json(
        { error: "Missing name or price" },
        { status: 400 }
      );
    }

    const cleanName = String(name).trim();

    if (!cleanName) {
      return NextResponse.json(
        { error: "Ticket name is required" },
        { status: 400 }
      );
    }

    /* --------------------------------------------------
       3. Load event
    -------------------------------------------------- */
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, image_url")
      .eq("id", id)
      .single();

    console.log("🎫 [ADMIN TICKETS][POST] loaded event:", event, eventError);

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    /* --------------------------------------------------
       4. Check default ticket exists

       Extra tickets should only be added after the event
       has a default ticket.
    -------------------------------------------------- */
    const { data: defaultTicket, error: defaultTicketError } = await supabase
      .from("event_ticket_types")
      .select("id")
      .eq("event_id", id)
      .eq("is_default", true)
      .maybeSingle();

    console.log(
      "🎫 [ADMIN TICKETS][POST] default ticket check:",
      defaultTicket,
      defaultTicketError
    );

    if (defaultTicketError) {
      return NextResponse.json(
        { error: defaultTicketError.message },
        { status: 500 }
      );
    }

    if (!defaultTicket) {
      return NextResponse.json(
        { error: "Default ticket missing for event" },
        { status: 500 }
      );
    }

    /* --------------------------------------------------
       5. Create linked product
    -------------------------------------------------- */
    const productName = `${event.title} – ${cleanName}`;

    const productSlug = slugify(
      `${event.title}-${cleanName}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      {
        lower: true,
        strict: true,
      }
    );

    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        name: productName,
        slug: productSlug,
        description: cleanName,
        price: (price_pence / 100).toFixed(2),
        image_url: event.image_url,
        product_type: "event",
        inventory_count: 0,
        fulfilment_mode: "made_to_order",
        supply_source: "stock",
        out_of_stock_behavior: "stop_selling",
      })
      .select()
      .single();

    console.log(
      "🎫 [ADMIN TICKETS][POST] product created:",
      product,
      productError
    );

    if (productError || !product) {
      return NextResponse.json(
        { error: productError?.message || "Product creation failed" },
        { status: 500 }
      );
    }

    /* --------------------------------------------------
       6. Create ticket type
    -------------------------------------------------- */
    const { data: ticket, error: ticketError } = await supabase
      .from("event_ticket_types")
      .insert({
        event_id: id,
        name: cleanName,
        description: cleanName,
        price_pence,
        inventory_count: 0,
        sold_count: 0,
        product_id: product.id,
        is_default: false,
        is_active,
      })
      .select()
      .single();

    console.log(
      "🎫 [ADMIN TICKETS][POST] ticket inserted:",
      ticket,
      ticketError
    );

    if (ticketError) {
      /*
        Clean up product if ticket insert fails,
        so no orphan product is left behind.
      */
      const { error: cleanupError } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (cleanupError) {
        console.error(
          "⚠️ [ADMIN TICKETS][POST] failed to clean up product after ticket error:",
          cleanupError
        );
      }

      return NextResponse.json(
        { error: ticketError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, ticket });
  } catch (err) {
    console.error("💥 [ADMIN TICKETS][POST] crashed:", err);

    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}