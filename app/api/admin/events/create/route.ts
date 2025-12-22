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

    console.log("📝 Slug:", slug);

    // Convert pence → "12.50"
    const priceString = (price_pence / 100).toFixed(2);
    console.log("💷 Product price string:", priceString);

    // -------------------------------
    // 1️⃣ CREATE PRODUCT — sync capacity → inventory_count
    // -------------------------------
    const productPayload = {
      name: title,
      slug,
      description: subtitle || short_description || "",
      price: priceString, // TEXT column
      image_url,
      product_type: "event",
      inventory_count: capacity, // ⭐ NEW — FIXES OUT OF STOCK
    };

    console.log("🛍 Creating product:", productPayload);

    const { data: product, error: productError } = await supabase
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

    console.log("✅ Product created:", product);

    // -------------------------------
    // 2️⃣ CREATE EVENT linked to product_id
    // -------------------------------
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
      product_id: product.id,
    };

    console.log("📦 Inserting event:", eventPayload);

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

    console.log("🎉 Event successfully created:", event);

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error("🔥 Route crashed:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
