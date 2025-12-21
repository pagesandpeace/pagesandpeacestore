export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import slugify from "slugify";

export async function POST(req: Request) {
  try {
    console.log("🛍 Incoming: CREATE PRODUCT");

    const body = await req.json();
    console.log("📥 Body:", body);

    const {
      name,
      price,
      description = "",
      product_type = "merch",
      inventory_count = 0,
      image_url = null,
    } = body;

    if (!name || !price) {
      return NextResponse.json(
        { error: "Name and price are required." },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    // AUTH
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // ROLE CHECK
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", authUser.user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    // SLUG
    const slug =
      slugify(name, { lower: true, strict: true }) +
      "-" +
      Date.now().toString().slice(-6);

    const priceString = Number(price).toFixed(2);

    const productPayload = {
      name,
      slug,
      description,
      price: priceString,
      product_type,
      inventory_count,
      image_url,
    };

    console.log("📦 Insert payload:", productPayload);

    const { data: product, error } = await supabase
      .from("products")
      .insert(productPayload)
      .select()
      .single();

    if (error) {
      console.error("❌ Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, product });
  } catch (err) {
    console.error("🔥 CREATE PRODUCT ROUTE FAILED:", err);
    return NextResponse.json({ error: "Server error creating product" }, { status: 500 });
  }
}
