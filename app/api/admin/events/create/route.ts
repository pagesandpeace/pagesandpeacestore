import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseService } from "@/lib/supabase/service";
import slugify from "slugify";

type SupabaseServiceClient = ReturnType<typeof supabaseService>;

async function cleanupPartialCreate({
  supabase,
  createdEventId,
  createdProductId,
}: {
  supabase: SupabaseServiceClient;
  createdEventId: string | null;
  createdProductId: string | null;
}) {
  console.warn("🧹 [CREATE EVENT] cleaning up partial create:", {
    createdEventId,
    createdProductId,
  });

  if (createdEventId) {
    await supabase
      .from("event_ticket_types")
      .delete()
      .eq("event_id", createdEventId);

    await supabase.from("events").delete().eq("id", createdEventId);
  }

  if (createdProductId) {
    await supabase.from("products").delete().eq("id", createdProductId);
  }
}

export async function POST(req: Request) {
  let createdProductId: string | null = null;
  let createdEventId: string | null = null;

  try {
    console.log("📩 Incoming create event request...");

    /* -------------------------------------------------
       1. Require admin
    ------------------------------------------------- */
    const { error: adminError } = await requireAdmin();

    if (adminError) return adminError;

    /*
      Use service role only AFTER admin check.
      This avoids RLS blocking admin event/product/ticket inserts.
    */
    const supabase = supabaseService();

    /* -------------------------------------------------
       2. Parse payload
    ------------------------------------------------- */
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
      booking_type = "ticketed",
    } = body;

    if (!title || !date || !store_id) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const cleanTitle = String(title).trim();

    if (!cleanTitle) {
      return NextResponse.json(
        { error: "Event title is required." },
        { status: 400 }
      );
    }

    const cleanBookingType = booking_type === "interest" ? "interest" : "ticketed";

    const cleanCapacity =
      typeof capacity === "number" && capacity >= 0 ? capacity : 0;

    const cleanPricePence =
      typeof price_pence === "number" && price_pence >= 0 ? price_pence : 0;

    const slug =
      slugify(cleanTitle, { lower: true, strict: true }) +
      "-" +
      Date.now().toString().slice(-6);

    let product: { id: string } | null = null;

    /* -------------------------------------------------
       3. Create product only if ticketed
    ------------------------------------------------- */
    if (cleanBookingType === "ticketed") {
      const productPayload = {
        name: `${cleanTitle} – General Admission`,
        slug: `${slug}-general`,
        description: subtitle || short_description || "",
        price: (cleanPricePence / 100).toFixed(2),
        image_url: image_url || null,
        product_type: "event",
        inventory_count: cleanCapacity,
        fulfilment_mode: "made_to_order",
        supply_source: "stock",
        out_of_stock_behavior: "stop_selling",
      };

      const { data: productData, error: productError } = await supabase
        .from("products")
        .insert(productPayload)
        .select("id")
        .single();

      if (productError || !productData) {
        console.error("❌ [CREATE EVENT] product error:", productError);

        return NextResponse.json(
          { error: productError?.message || "Failed to create product" },
          { status: 500 }
        );
      }

      product = productData;
      createdProductId = productData.id;
    }

    /* -------------------------------------------------
       4. Create event
    ------------------------------------------------- */
    const eventPayload = {
      title: cleanTitle,
      subtitle: subtitle || null,
      short_description: short_description || null,
      description: description || null,
      date,
      capacity: cleanCapacity,
      price_pence: cleanPricePence,
      image_url: image_url || null,
      store_id,
      published: Boolean(published),
      slug,
      product_id: product?.id ?? null,
      booking_type: cleanBookingType,
    };

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert(eventPayload)
      .select()
      .single();

    if (eventError || !event) {
      console.error("❌ [CREATE EVENT] event error:", eventError);

      await cleanupPartialCreate({
        supabase,
        createdEventId,
        createdProductId,
      });

      return NextResponse.json(
        { error: eventError?.message || "Failed to create event" },
        { status: 500 }
      );
    }

    createdEventId = event.id;

    /* -------------------------------------------------
       5. Create default ticket type only if ticketed
    ------------------------------------------------- */
    if (cleanBookingType === "ticketed") {
      if (!product) {
        await cleanupPartialCreate({
          supabase,
          createdEventId,
          createdProductId,
        });

        return NextResponse.json(
          { error: "Product missing for ticketed event." },
          { status: 500 }
        );
      }

      const ticketPayload = {
        event_id: event.id,
        name: "General Admission",
        description: null,
        price_pence: cleanPricePence,
        inventory_count: cleanCapacity,
        sold_count: 0,
        product_id: product.id,
        is_default: true,
        is_active: true,
      };

      const { error: ticketError } = await supabase
        .from("event_ticket_types")
        .insert(ticketPayload);

      if (ticketError) {
        console.error("❌ [CREATE EVENT] ticket error:", ticketError);

        await cleanupPartialCreate({
          supabase,
          createdEventId,
          createdProductId,
        });

        return NextResponse.json(
          { error: ticketError.message },
          { status: 500 }
        );
      }
    }

    console.log("🎉 [CREATE EVENT] created successfully:", event.id);

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error("🔥 [CREATE EVENT] route crashed:", err);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}