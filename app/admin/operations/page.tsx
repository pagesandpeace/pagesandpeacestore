import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { resolveBackorderTitle } from "@/lib/backorders/resolveBackorderTitle";
import OperationsClient from "./OperationsClient";

export const dynamic = "force-dynamic";

/* ---------------------------------------------
   ADMIN CLIENT
--------------------------------------------- */

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/* ---------------------------------------------
   TYPES
--------------------------------------------- */

type OnlineOrderItemRow = {
  id: string;
  order_id: string;
  quantity: number;
  name: string | null;
};

type OrderRow = {
  id: string;
  created_at: string;
  status: string;
  user_id: string | null;
};

type UserRow = {
  id: string;
  name: string | null;
};

type BackorderRow = {
  id: string;
  customer_name: string | null;
  received_at: string | null;
  payment_status?: "paid" | "unpaid" | "deposit_taken";
  temp_title: string | null;
};

/**
 * ✅ ACTUAL DB SHAPE returned by the to-order query
 */
type ToOrderDbRow = {
  id: string;
  order_intent: string | null;
  requested_quantity: number | null;
  customer_name: string | null;
  temp_title: string | null;
  supplier_name: string | null;
  products: {
    name: string | null;
    fulfilment_mode: string;
  }[] | null;
};

/* ---------------------------------------------
   PAGE
--------------------------------------------- */

export default async function AdminOperationsPage() {
  const supabase = await supabaseServer();

  /* ---------- AUTH ---------- */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?callbackURL=/admin/operations");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  /* =====================================================
     🔴 ONLINE ORDERS → TO PICK
  ===================================================== */

  const { data: onlineItemsRaw } = await supabaseAdmin
    .from("order_items")
    .select(
      `
      id,
      order_id,
      quantity,
      name,
      products!inner ( fulfilment_mode )
    `
    )
    .eq("kind", "product")
    .eq("products.fulfilment_mode", "physical")
    .is("picked_at", null);

  const onlineItems = (onlineItemsRaw ?? []) as OnlineOrderItemRow[];
  const orderIds = Array.from(new Set(onlineItems.map((i) => i.order_id)));

  const { data: ordersRaw } =
    orderIds.length > 0
      ? await supabaseAdmin
          .from("orders")
          .select("id, created_at, status, user_id")
          .in("id", orderIds)
          .eq("status", "completed")
      : { data: [] };

  const orders = (ordersRaw ?? []) as OrderRow[];

  /* ---------- USERS ---------- */

  const userIds = Array.from(
    new Set(orders.map((o) => o.user_id).filter(Boolean) as string[])
  );

  const { data: usersRaw } =
    userIds.length > 0
      ? await supabaseAdmin
          .from("users")
          .select("id, name")
          .in("id", userIds)
      : { data: [] };

  const usersById = new Map(
    (usersRaw ?? []).map((u: UserRow) => [u.id, u])
  );

  const orderMap = new Map<string, OrderRow>(
    orders.map((o) => [o.id, o])
  );

  const onlineToPick = onlineItems
    .filter((i) => orderMap.has(i.order_id))
    .map((i) => {
      const order = orderMap.get(i.order_id)!;
      const customer = order.user_id
        ? usersById.get(order.user_id)
        : null;

      return {
        source: "online" as const,
        id: i.id,
        order_id: i.order_id,
        quantity: i.quantity,
        title: i.name ?? "Untitled item",
        customer_name: customer?.name ?? null,
        created_at: order.created_at,
      };
    });

  /* =====================================================
     🟠 CUSTOMER BACKORDERS → TO PICK
  ===================================================== */

  const { data: backordersRaw } = await supabaseAdmin
    .from("customer_backorders")
    .select(
      `
      id,
      customer_name,
      received_at,
      payment_status,
      temp_title,
      products ( fulfilment_mode )
    `
    )
    .not("received_at", "is", null)
    .is("picked_at", null)
    .is("collected_at", null)
    .eq("products.fulfilment_mode", "made_to_order");

  const backordersToPick = ((backordersRaw ?? []) as BackorderRow[]).map(
    (b) => ({
      source: "backorder" as const,
      id: b.id,
      quantity: null,
      title: resolveBackorderTitle(b),
      customer_name: b.customer_name,
      created_at: b.received_at!,
      payment_status: b.payment_status,
    })
  );

  /* =====================================================
     🔵 TO ORDER
  ===================================================== */

  const { data: toOrderRaw } = await supabaseAdmin
    .from("customer_backorders")
    .select(
      `
      id,
      order_intent,
      requested_quantity,
      customer_name,
      temp_title,
      supplier_name,
      products ( name, fulfilment_mode )
    `
    )
    .is("ordered_at", null)
    .is("cancelled_at", null)
    .eq("products.fulfilment_mode", "made_to_order")
    .order("created_at", { ascending: true });

  const toOrder = ((toOrderRaw ?? []) as ToOrderDbRow[]).map((r) => ({
    backorder_id: r.id,
    quantity: r.requested_quantity,
    product_name: resolveBackorderTitle({
      temp_title: r.temp_title,
      products: r.products,
    }),
    supplier_name: r.supplier_name ?? "Gardners",
    customer_name: r.customer_name,
    source: r.order_intent,
  }));

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <OperationsClient
      toPick={[...onlineToPick, ...backordersToPick]}
      readyBackorders={[]}
      toOrder={toOrder}
    />
  );
}
