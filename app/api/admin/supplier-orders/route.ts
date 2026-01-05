export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/* ---------------------------------------------
   TYPES (API INTERNAL)
--------------------------------------------- */

type BackorderRow = {
  id: string;
  order_date: string;
  quantity: number;
  payment_status: "paid" | "unpaid";
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  notes: string | null;
  ordered_at: string | null;
  received_at: string | null;
  collected_at: string | null;
  products: {
    name: string;
    product_type: string;
  }[] | null; // ✅ FIX: array, not single object
};

type LineItem = {
  backorder_id: string;
  product_name: string;
  quantity: number;
};

type CustomerGroup = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  payment_status: "paid" | "unpaid";
  items: LineItem[];
};

type SupplierOrderGroup = {
  order_date: string;
  status:
    | "awaiting_order"
    | "ordered"
    | "received"
    | "collected";
  customers: CustomerGroup[];
};

/* ---------------------------------------------
   STATUS RESOLUTION
--------------------------------------------- */

function resolveStatus(
  row: BackorderRow
): SupplierOrderGroup["status"] {
  if (row.collected_at) return "collected";
  if (row.received_at) return "received";
  if (row.ordered_at) return "ordered";
  return "awaiting_order";
}

/* ---------------------------------------------
   HANDLER
--------------------------------------------- */

export async function GET() {
  try {
    const supabase = await supabaseServer();

    /* -------------------------
       AUTH
    ------------------------- */

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", auth.user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Admins only" },
        { status: 403 }
      );
    }

    /* -------------------------
       QUERY
    ------------------------- */

    const { data, error } = await supabase
      .from("customer_backorders")
      .select(`
        id,
        order_date,
        quantity,
        payment_status,
        customer_name,
        customer_email,
        customer_phone,
        notes,
        ordered_at,
        received_at,
        collected_at,
        products (
          name,
          product_type
        )
      `)
      .neq("status", "cancelled")
      .order("order_date", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    /* -------------------------
       GROUPING
    ------------------------- */

    const grouped = new Map<string, SupplierOrderGroup>();

    (data ?? []).forEach((row: BackorderRow) => {
      const status = resolveStatus(row);
      const key = `${row.order_date}-${status}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          order_date: row.order_date,
          status,
          customers: [],
        });
      }

      const group = grouped.get(key)!;

      let customer = group.customers.find(
        (c) => c.customer_email === row.customer_email
      );

      if (!customer) {
        customer = {
          customer_name: row.customer_name,
          customer_email: row.customer_email,
          customer_phone: row.customer_phone,
          payment_status: row.payment_status,
          items: [],
        };
        group.customers.push(customer);
      }

      customer.items.push({
        backorder_id: row.id,
        product_name:
          row.products?.[0]?.name ?? "[Missing product]",
        quantity: row.quantity,
      });
    });

    /* -------------------------
       RESPONSE
    ------------------------- */

    return NextResponse.json(Array.from(grouped.values()));
  } catch (err) {
    console.error("🔥 supplier-orders failed", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
