export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

type IncomingItem = {
  product_id: string;
  quantity: number;
  notes?: string;
};

type IncomingPayload = {
  order_date: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  payment_status: "paid" | "unpaid";
  payment_reference?: string;
  items: IncomingItem[];
};

/* ---------------------------------------------
   POST
--------------------------------------------- */

export async function POST(req: Request) {
  try {
    console.log("🟡 [BACKORDERS CREATE] route hit");

    const supabase = await supabaseServer();

    /* -------------------------
       AUTH
    ------------------------- */
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("auth_user_id, role")
      .eq("auth_user_id", auth.user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    /* -------------------------
       BODY
    ------------------------- */
    const body: IncomingPayload = await req.json();

    if (
      !body.order_date ||
      !body.customer?.name ||
      !body.customer?.email ||
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    /* -------------------------
       NORMALISE ROWS
    ------------------------- */
    const rows = body.items.map((item) => {
      if (!item.product_id || item.quantity <= 0) {
        throw new Error("Invalid product or quantity");
      }

      return {
        product_id: item.product_id,
        quantity: item.quantity,

        customer_name: body.customer.name,
        customer_email: body.customer.email,
        customer_phone: body.customer.phone ?? null,

        payment_status: body.payment_status,
        notes:
          body.payment_status === "paid" && body.payment_reference
            ? `Payment ref: ${body.payment_reference}${item.notes ? " | " + item.notes : ""}`
            : item.notes ?? null,

        order_date: body.order_date,
        status: "awaiting_order",
        created_by: profile.auth_user_id,
      };
    });

    /* -------------------------
       INSERT
    ------------------------- */
    const { error } = await supabase
      .from("customer_backorders")
      .insert(rows);

    if (error) {
      console.error("❌ insert failed", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: rows.length,
    });
  } catch (err) {
    console.error("🔥 crashed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
