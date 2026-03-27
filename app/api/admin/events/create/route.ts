import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import slugify from "slugify";

export async function POST(req: Request) {
  try {
    console.log("📩 Incoming create event request...");

    const body = await req.json();
    console.log("📥 Payload received:", body);

    const {
      title,
      subtitle,
      short_description,
      description,
      date,
      capacity,
      price_pence,
      image_url,
      store_id,
      published,
      booking_type = "ticketed", // ✅ NEW
    } = body;

    if (!title || !date || !store_id) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    const { data: authUser } = await supabase.auth.getUser();
    console.log("👤 Auth user:", authUser);

    const slug =
      slugify(title, { lower: true, strict: true }) +
      "-" +
      Date.now().toString().slice(-6);

    let product = null;

    /* -------------------------------------------------
       1️⃣ CREATE PRODUCT (ONLY IF TICKETED)
    ------------------------------------------------- */
    if (booking_type === "ticketed") {
      const productPayload = {
        name: `${title} – General Admission`,
        slug: `${slug}-general`,
        description: subtitle || short_description || "",
        price: (price_pence / 100).toFixed(2),
        image_url,
        product_type: "event",
        inventory_count: capacity,
      };

      const { data: productData, error: productError } = await supabase
        .from("products")
        .insert(productPayload)
        .select()
        .single();

      if (productError) {
        console.error("❌ PRODUCT ERROR:", productError);
        return NextResponse.json(
          { error: productError.message },
          { status: 500 }
        );
      }

      product = productData;
    }

    /* -------------------------------------------------
       2️⃣ CREATE EVENT
    ------------------------------------------------- */
    const eventPayload = {
      title,
      subtitle,
      short_description,
      description,
      date,
      capacity,
      price_pence,
      image_url,
      store_id,
      published,
      slug,
      product_id: product?.id ?? null, // ✅ safe
      booking_type, // ✅ NEW
    };

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert(eventPayload)
      .select()
      .single();

    if (eventError) {
      console.error("❌ EVENT ERROR:", eventError);
      return NextResponse.json(
        { error: eventError.message },
        { status: 500 }
      );
    }

    /* -------------------------------------------------
       3️⃣ CREATE TICKET TYPE (ONLY IF TICKETED)
    ------------------------------------------------- */
    if (booking_type === "ticketed") {
      const ticketPayload = {
        event_id: event.id,
        name: "General Admission",
        description: null,
        price_pence,
        inventory_count: capacity,
        product_id: product.id,
        is_default: true,
        is_active: true,
      };

      const { error: ticketError } = await supabase
        .from("event_ticket_types")
        .insert(ticketPayload);

      if (ticketError) {
        console.error("❌ TICKET ERROR:", ticketError);
        return NextResponse.json(
          { error: ticketError.message },
          { status: 500 }
        );
      }
    }

    console.log("🎉 Event created successfully");

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error("🔥 Route crashed:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}