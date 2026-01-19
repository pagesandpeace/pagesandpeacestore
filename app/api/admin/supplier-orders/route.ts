export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { resolveBackorderTitle } from "@/lib/backorders/resolveBackorderTitle";
import type {
  SupplierOrderGroup,
  CustomerGroup,
} from "@/components/admin/supplier-orders/types";

/* ---------------------------------------------
   ROW TYPE (DB)
--------------------------------------------- */

type SupplierOrderRow = {
  id: string;

  // 🔑 NEW: real stored title (preferred)
  title: string | null;

  order_id: string | null;
  payment_status: "paid" | "unpaid" | null;

  order_date: string;
  created_at: string;
  ordered_at: string | null;
  cancelled_at: string | null;
  received_at: string | null;
  collected_at: string | null;

  quantity: number;
  requested_quantity: number;
  received_quantity: number | null;
  cancelled_quantity: number | null;

  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;

  temp_title: string | null;

  // ✅ working join kept
  products: {
    name: string | null;
  }[] | null;

  backorder_receipts: {
    received_at: string;
  }[] | null;

  supplier_purchase_orders: {
    id: string;
    supplier_name: string;
    po_number: string;
    ordered_at: string | null;
  } | null;
};

/* ---------------------------------------------
   GET
--------------------------------------------- */

export async function GET() {
  try {
    const supabase = await supabaseServer();

    /* ---------- AUTH ---------- */

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("auth_user_id", auth.user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    /* ---------- FETCH ---------- */

    const { data, error } = await supabase
      .from("customer_backorders")
      .select(
        `
        id,
        title,

        order_id,
        payment_status,

        order_date,
        created_at,
        ordered_at,
        cancelled_at,
        received_at,
        collected_at,

        quantity,
        requested_quantity,
        received_quantity,
        cancelled_quantity,

        customer_name,
        customer_email,
        customer_phone,

        temp_title,

        products:products!customer_backorders_product_id_fkey (
          name
        ),

        backorder_receipts ( received_at ),

        supplier_purchase_orders (
          id,
          supplier_name,
          po_number,
          ordered_at
        )
      `
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ supplier-orders fetch failed", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as unknown as SupplierOrderRow[];

    /* ---------------------------------------------
       GROUPING
    --------------------------------------------- */

    const grouped = new Map<string, SupplierOrderGroup>();

    for (const r of rows) {
      const po = r.supplier_purchase_orders ?? null;
      const groupKey = po?.id ?? "NO_PO";

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          po_id: po?.id ?? null,
          supplier_name: po?.supplier_name ?? "Unordered supplier items",
          po_number: po?.po_number ?? null,
          created_at: r.created_at,
          ordered_at: r.ordered_at ?? null,
          customers: [],
        });
      }

      const group = grouped.get(groupKey)!;

      /* ---------- CUSTOMER ---------- */

      const customerName = r.customer_name ?? "Unknown";
      const customerEmail = r.customer_email ?? null;

      const customer: CustomerGroup =
        group.customers.find(
          (c) =>
            c.customer_name === customerName &&
            c.customer_email === customerEmail
        ) ??
        (() => {
          const created: CustomerGroup = {
  customer_id: r.order_id!, // 🔑 customer-scoped identifier

  customer_name: customerName,
  customer_email: customerEmail,
  customer_phone: r.customer_phone ?? null,

  payment_status: r.payment_status ?? "unpaid",
  items: [],
};

          group.customers.push(created);
          return created;
        })();

      // Paid always wins
      if (r.payment_status === "paid") {
        customer.payment_status = "paid";
      }

      /* ---------- PRODUCT NAME (SAFE PRIORITY) ---------- */

      const productName =
        r.title ??
        resolveBackorderTitle({
          temp_title: r.temp_title,
          products: r.products,
        });

      /* ---------- LINE ITEM ---------- */

      customer.items.push({
        backorder_id: r.id,
        product_name: productName,

        quantity: r.quantity,
        requested_quantity: r.requested_quantity,

        received_quantity: r.received_quantity ?? 0,

        received_at: r.received_at ?? null,
        collected_at: r.collected_at ?? null,

        supplier_po_id: po?.id ?? null,
        ordered_at: r.ordered_at,
        cancelled_at: r.cancelled_at,
      });
    }

    return NextResponse.json([...grouped.values()]);
  } catch (err) {
    console.error("🔥 supplier-orders crashed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
