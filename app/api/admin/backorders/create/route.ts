export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

type ExistingItem = {
  kind: "existing";
  product_id: string;
  product_name: string;
  quantity: number;
  requested_quantity?: number;
  notes: string;
};

type NewItem = {
  kind: "new";
  title: string;
  author?: string;
  supplier?: string;
  isbn?: string;
  quantity: number;
  requested_quantity?: number;
  notes: string;
};

type IncomingItem = ExistingItem | NewItem;

type OrderIntent = "customer" | "stock";

type IncomingPayload = {
  order_intent?: OrderIntent;
  order_date?: string;

  supplier_name?: string;

  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };

  payment_status?: "paid" | "unpaid";
  payment_reference?: string;

  items?: IncomingItem[];
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
    console.log("📦 RAW BODY:", JSON.stringify(body, null, 2));

    /* -------------------------
       VALIDATION
    ------------------------- */
    if (
      !body.order_intent ||
      !body.order_date ||
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (body.order_intent === "customer") {
      if (!body.customer?.name || !body.customer?.email) {
        return NextResponse.json(
          { error: "Customer name and email required" },
          { status: 400 }
        );
      }
    }

    if (body.order_intent === "stock" && !body.supplier_name) {
      return NextResponse.json(
        { error: "Supplier name required for stock orders" },
        { status: 400 }
      );
    }

    /* -------------------------
       NORMALISE ROWS
    ------------------------- */
    const rows = body.items.map((item, idx) => {
      console.log(`➡️ processing item ${idx}`, item);

      if (item.quantity <= 0) {
        throw new Error("Invalid quantity");
      }

      const requestedQty = item.requested_quantity ?? item.quantity;

      /* ---------- EXISTING PRODUCT ---------- */
      if (item.kind === "existing") {
        if (!item.product_id) {
          throw new Error("Missing product_id for existing item");
        }

        return {
          product_id: item.product_id,

          // ✅ PHYSICAL TITLE STORED
          title: item.product_name,

          quantity: item.quantity,
          requested_quantity: requestedQty,

          temp_title: null,
          temp_author: null,
          temp_supplier: null,
          temp_isbn: null,

          supplier_name:
            body.order_intent === "stock" ? body.supplier_name : null,

          customer_name:
            body.order_intent === "customer"
              ? body.customer!.name
              : body.supplier_name ?? null,

          customer_email:
            body.order_intent === "customer"
              ? body.customer!.email
              : null,

          customer_phone:
            body.order_intent === "customer"
              ? body.customer?.phone ?? null
              : null,

          payment_status:
            body.order_intent === "customer"
              ? body.payment_status ?? "unpaid"
              : "unpaid",

          notes:
            body.order_intent === "customer" &&
            body.payment_status === "paid" &&
            body.payment_reference
              ? `Payment ref: ${body.payment_reference}${
                  item.notes ? " | " + item.notes : ""
                }`
              : item.notes ?? null,

          order_intent: body.order_intent,
          order_date: body.order_date,
          status: "awaiting_order",
          created_by: profile.auth_user_id,
        };
      }

      /* ---------- NEW / MANUAL ITEM ---------- */
      if (item.kind === "new") {
        if (!item.title?.trim()) {
          throw new Error("Missing title for new item");
        }

        return {
          product_id: null,

          // ✅ PHYSICAL TITLE STORED
          title: item.title,

          quantity: item.quantity,
          requested_quantity: requestedQty,

          temp_title: item.title,
          temp_author: item.author ?? null,
          temp_supplier: item.supplier ?? body.supplier_name ?? null,
          temp_isbn: item.isbn ?? null,

          supplier_name:
            body.order_intent === "stock" ? body.supplier_name : null,

          customer_name:
            body.order_intent === "customer"
              ? body.customer!.name
              : body.supplier_name ?? null,

          customer_email:
            body.order_intent === "customer"
              ? body.customer!.email
              : null,

          customer_phone:
            body.order_intent === "customer"
              ? body.customer?.phone ?? null
              : null,

          payment_status:
            body.order_intent === "customer"
              ? body.payment_status ?? "unpaid"
              : "unpaid",

          notes: item.notes ?? null,

          order_intent: body.order_intent,
          order_date: body.order_date,
          status: "awaiting_order",
          created_by: profile.auth_user_id,
        };
      }

      throw new Error("Unknown item kind");
    });

    console.log("🧾 INSERT ROWS:", rows);

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

    return NextResponse.json({ success: true, count: rows.length });
  } catch (err) {
    console.error("🔥 crashed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
