export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */
type SaleLineInput = {
  product_id: string;
  quantity: number;
  unit_price: number;
};

export async function POST(req: Request) {
  console.log("🟢 [POS CREATE] Route hit");

  try {
    /* ---------------------------------------------
       AUTH (ADMIN ONLY)
    --------------------------------------------- */
    const supabase = await supabaseServer();
    const { data: auth } = await supabase.auth.getUser();

    console.log("👤 [AUTH USER]", auth?.user?.id);

    if (!auth?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role")
      .eq("auth_user_id", auth.user.id)
      .single();

    console.log("🛂 [ROLE CHECK]", profile);

    if (profileError || !profile) {
      console.error("❌ [PROFILE LOAD FAILED]", profileError);
      return NextResponse.json(
        { error: "Failed to resolve user profile" },
        { status: 500 }
      );
    }

    if (profile.role !== "admin") {
      return NextResponse.json(
        { error: "Admins only" },
        { status: 403 }
      );
    }

    /* ---------------------------------------------
       SERVICE ROLE CLIENT
    --------------------------------------------- */
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    /* ---------------------------------------------
       PAYLOAD
    --------------------------------------------- */
    const body = (await req.json()) as {
      sale_ref?: string;
      lines: SaleLineInput[];
    };

    console.log("📦 [REQUEST BODY]", body);

    const { lines, sale_ref } = body;

    if (!sale_ref || sale_ref.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing SumUp / sales reference" },
        { status: 400 }
      );
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: "No sale lines provided" },
        { status: 400 }
      );
    }

    const total = lines.reduce(
      (sum, l) => sum + l.unit_price * l.quantity,
      0
    );

    console.log("💰 [TOTAL]", total);

    const saleNumber = `POS-${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")}-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;

    /* ---------------------------------------------
       INSERT POS SALE (HEADER)
    --------------------------------------------- */
    const { data: sale, error: saleError } =
      await supabaseAdmin
        .from("pos_sales")
        .insert({
          sale_number: saleNumber,
          total,
          created_by: profile.id,
          notes: sale_ref.trim(), // ✅ SumUp sales ID stored here
        })
        .select()
        .single();

    if (saleError) {
      console.error("❌ POS SALE INSERT FAILED", saleError);
      return NextResponse.json(
        { error: saleError.message },
        { status: 500 }
      );
    }

    console.log("✅ [POS SALE CREATED]", sale.id);

    /* ---------------------------------------------
       ADJUST INVENTORY (PER LINE)
    --------------------------------------------- */
    for (const line of lines) {
      console.log("📦 [POS LINE]", line);

      const { data: product, error: productError } =
        await supabaseAdmin
          .from("products")
          .select("inventory_count")
          .eq("id", line.product_id)
          .single();

      if (productError || !product) {
        console.error(
          "❌ [PRODUCT LOAD FAILED]",
          productError
        );
        throw new Error("Failed to load product inventory");
      }

      const newQuantity =
        product.inventory_count - line.quantity;

      console.log(
        "📉 [INVENTORY CHANGE]",
        line.product_id,
        product.inventory_count,
        "→",
        newQuantity
      );

      const { error: rpcError } =
        await supabaseAdmin.rpc(
          "adjust_product_inventory",
          {
            p_product_id: line.product_id,
            p_new_quantity: newQuantity,
            p_reason: "pos_sale",
            p_user_id: profile.id,
          }
        );

      if (rpcError) {
        console.error(
          "❌ [INVENTORY RPC FAILED]",
          rpcError
        );
        throw rpcError;
      }
    }

    console.log("✅ [ALL INVENTORY UPDATED]");

    /* ---------------------------------------------
       SUCCESS
    --------------------------------------------- */
    return NextResponse.json({
      sale_id: sale.id,
      sale_number: sale.sale_number,
      total,
    });
  } catch (err) {
    console.error("🔥 POS SALE CREATE FAILED", err);
    return NextResponse.json(
      { error: "Failed to create POS sale" },
      { status: 500 }
    );
  }
}
