import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
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

    const supabase = await supabaseServer();

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
      return NextResponse.json({ error: error.message }, { status: 500 });
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

    const supabase = await supabaseServer();
    const body = await req.json();

    console.log("🎫 [ADMIN TICKETS][POST] payload:", body);

    const { name, price_pence } = body;

    if (!name || typeof price_pence !== "number") {
      console.error("❌ [ADMIN TICKETS][POST] invalid payload");
      return NextResponse.json(
        { error: "Missing name or price" },
        { status: 400 }
      );
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title")
      .eq("id", id)
      .single();

    console.log("🎫 [ADMIN TICKETS][POST] loaded event:", event, eventError);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { data: defaultTicket } = await supabase
      .from("event_ticket_types")
      .select("id")
      .eq("event_id", id)
      .eq("is_default", true)
      .maybeSingle();

    console.log(
      "🎫 [ADMIN TICKETS][POST] default ticket check:",
      defaultTicket
    );

    if (!defaultTicket) {
      return NextResponse.json(
        { error: "Default ticket missing for event" },
        { status: 500 }
      );
    }

    const productName = `${event.title} – ${name}`;
    const productSlug = slugify(
      `${event.title}-${name}-${Date.now()}`,
      { lower: true, strict: true }
    );

    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        name: productName,
        slug: productSlug,
        description: name,
        price: (price_pence / 100).toFixed(2),
        product_type: "event",
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
        { error: "Product creation failed" },
        { status: 500 }
      );
    }

    const { data: ticket, error: ticketError } = await supabase
      .from("event_ticket_types")
      .insert({
        event_id: id,
        name,
        price_pence,
        sold_count: 0,
        product_id: product.id,
        is_default: false,
        is_active: true,
        inventory_count: 0, 
      })
      .select()
      .single();

    console.log(
      "🎫 [ADMIN TICKETS][POST] ticket inserted:",
      ticket,
      ticketError
    );

    if (ticketError) {
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
