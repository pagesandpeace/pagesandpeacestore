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
   DB ROW TYPES
--------------------------------------------- */

type OnlineOrderItemRow = {
  id: string;
  order_id: string;
  quantity: number;
  name: string | null;
  picked_at: string | null;
};

type OrderRow = {
  id: string;
  created_at: string;
  status: string;
  fulfilment_method: string | null;
  users: {
    name: string | null;
  }[];
};

type BackorderRow = {
  id: string;
  customer_name: string | null;
  received_at: string | null;
  picked_at?: string | null;
  payment_status?: "paid" | "unpaid" | "deposit_taken";
  temp_title: string | null;
};

type ToOrderRow = {
  id: string;
  order_intent: string | null;
  quantity: number | null;
  customer_name: string | null;
  temp_title: string | null;
};

/* ---------------------------------------------
   PAGE
--------------------------------------------- */

export default async function AdminOperationsPage() {
  const supabase = await supabaseServer();

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

  console.log("🧪 [OPS] AdminOperationsPage loaded");

  /* =====================================================
     🔴 ONLINE ORDERS → TO PICK
  ===================================================== */

  const { data: onlineItemsRaw, error: onlineItemsError } =
    await supabaseAdmin
      .from("order_items")
      .select(
        `
        id,
        order_id,
        quantity,
        name,
        picked_at,
        products!inner ( fulfilment_mode )
      `
      )
      .eq("kind", "product")
      .eq("products.fulfilment_mode", "physical")
      .is("picked_at", null);

  const onlineItems = (onlineItemsRaw ?? []) as OnlineOrderItemRow[];

  console.log("🧪 [OPS] onlineItems count:", onlineItems.length);
  console.log("🧪 [OPS] onlineItems error:", onlineItemsError);

  const orderIds = Array.from(
    new Set(onlineItems.map((i) => i.order_id))
  );

  /* =====================================================
     🔴 FETCH ORDERS
  ===================================================== */

  const { data: ordersRaw, error: ordersError } =
    orderIds.length > 0
      ? await supabaseAdmin
          .from("orders")
          .select(
            `
            id,
            created_at,
            status,
            fulfilment_method,
            users ( name )
          `
          )
          .in("id", orderIds)
          .eq("status", "completed")
      : { data: [], error: null };

  const orders = (ordersRaw ?? []) as OrderRow[];

  console.log("🧪 [OPS] orders fetched:", orders);
  console.log("🧪 [OPS] orders error:", ordersError);

  const orderMap = new Map<string, OrderRow>(
    orders.map((o) => [o.id, o])
  );

  const onlineToPick = onlineItems
    .filter((i) => orderMap.has(i.order_id))
    .map((i) => {
      const order = orderMap.get(i.order_id)!;

      return {
        source: "online" as const,
        id: i.id,
        order_id: i.order_id,
        quantity: i.quantity,
        title: i.name ?? "Untitled item",
        customer_name: order.users[0]?.name ?? null,
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
     🟢 READY FOR COLLECTION
  ===================================================== */

  const { data: readyBackordersRaw } = await supabaseAdmin
    .from("customer_backorders")
    .select(
      `
      id,
      customer_name,
      picked_at,
      payment_status,
      temp_title
    `
    )
    .not("picked_at", "is", null)
    .is("collected_at", null)
    .order("picked_at", { ascending: true });

  const readyBackorders = ((readyBackordersRaw ?? []) as BackorderRow[]).map(
    (b) => ({
      id: b.id,
      customer_name: b.customer_name,
      title: resolveBackorderTitle(b),
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
      quantity,
      customer_name,
      temp_title,
      products ( fulfilment_mode )
    `
    )
    .is("ordered_at", null)
    .is("cancelled_at", null)
    .eq("products.fulfilment_mode", "made_to_order")
    .order("created_at", { ascending: true });

  const toOrder = ((toOrderRaw ?? []) as ToOrderRow[]).map((r) => ({
    backorder_id: r.id,
    order_intent: r.order_intent,
    quantity: r.quantity,
    customer_name: r.customer_name,
    product_name: resolveBackorderTitle(r),
  }));

  console.log("🧪 [OPS] FINAL toPick payload:", [
    ...onlineToPick,
    ...backordersToPick,
  ]);

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <OperationsClient
      toPick={[...onlineToPick, ...backordersToPick]}
      readyBackorders={readyBackorders}
      toOrder={toOrder}
    />
  );
}
