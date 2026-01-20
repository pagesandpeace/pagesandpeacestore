import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { resolveBackorderTitle } from "@/lib/backorders/resolveBackorderTitle";
import OperationsClient from "./OperationsClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ---------------------------------------------
   ADMIN CLIENT (SERVICE ROLE)
--------------------------------------------- */

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/* ---------------------------------------------
   PAGE
--------------------------------------------- */

export default async function AdminOperationsPage() {
  const supabase = await supabaseServer();

  /* -------------------------
     AUTH
  ------------------------- */
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
     🔴 TO PICK (ONLINE + BACKORDERS)
  ===================================================== */

  // ---------- ONLINE ORDER ITEMS ----------
  const { data: onlineItemsRaw } = await supabaseAdmin
    .from("order_items")
    .select(`
      id,
      order_id,
      quantity,
      name,
      products!inner ( fulfilment_mode )
    `)
    .eq("kind", "product")
    .eq("products.fulfilment_mode", "physical")
    .is("picked_at", null);

  const orderIds = Array.from(
    new Set((onlineItemsRaw ?? []).map((i) => i.order_id))
  );

  const { data: ordersRaw } =
    orderIds.length > 0
      ? await supabaseAdmin
          .from("orders")
          .select("id, created_at, user_id")
          .in("id", orderIds)
          .eq("status", "completed")
      : { data: [] };

  const { data: usersRaw } =
    ordersRaw && ordersRaw.length > 0
      ? await supabaseAdmin
          .from("users")
          .select("id, name")
          .in(
            "id",
            ordersRaw.map((o) => o.user_id).filter(Boolean) as string[]
          )
      : { data: [] };

  const usersById = new Map(
    (usersRaw ?? []).map((u) => [u.id, u.name])
  );

const onlineToPick =
  onlineItemsRaw
    ?.filter((i) => ordersRaw?.some((o) => o.id === i.order_id))
    .map((i) => {
      const order = ordersRaw!.find((o) => o.id === i.order_id)!;

      return {
        source: "online" as const,
        id: i.id,
        order_id: i.order_id,
        quantity: i.quantity,
        title: i.name ?? "Untitled item",
        customer_name: order.user_id
          ? usersById.get(order.user_id) ?? null
          : null,
        created_at: order.created_at,
        payment_status: "paid" as const,
      };
    }) ?? [];


  // ---------- BACKORDERS TO PICK ----------
  const { data: backordersToPickRaw, error: backordersError } =
  await supabaseAdmin
    .from("customer_backorders")
    .select(`
  id,
  title,
  customer_name,
  quantity,
  payment_status,
  temp_title,
  picked_at,
  collected_at,
  cancelled_at,
  products ( name )
`)
    .is("picked_at", null)
    .is("collected_at", null)
    .is("cancelled_at", null);

if (backordersError) {
  console.error("❌ BACKORDERS TO PICK QUERY FAILED:", backordersError);
}

const backordersToPick =
  backordersToPickRaw?.map((b) => ({
    source: "backorder" as const,
    id: b.id,
    quantity: b.quantity,
    title: b.title ?? resolveBackorderTitle(b),
    customer_name: b.customer_name,
    created_at: new Date().toISOString(),
    payment_status: b.payment_status,
  })) ?? [];


  /* =====================================================
     🟢 READY FOR COLLECTION
     (ONLINE ORDERS + BACKORDERS)
  ===================================================== */

  // ---------- READY BACKORDERS ----------
  const { data: readyBackordersRaw } = await supabaseAdmin
    .from("customer_backorders")
    .select(`
  id,
  title,
  customer_name,
  quantity,
  payment_status,
  temp_title,
  picked_at,
  collected_at,
  cancelled_at,
  products ( name )
`)
    .not("picked_at", "is", null)
    .is("collected_at", null)
    .is("cancelled_at", null)
    .order("picked_at", { ascending: true });


  const readyBackorders = Array.from(
  new Map(
    (readyBackordersRaw ?? []).map((b) => [
      `backorder:${b.id}`,
      {
        id: b.id,
        source: "backorder" as const,
        quantity: b.quantity,
        title: b.title ?? resolveBackorderTitle(b),
        customer_name: b.customer_name,
        payment_status: b.payment_status,
      },
    ])
  ).values()
);


  // ---------- READY ONLINE ORDERS ----------
  const { data: readyOnlineOrdersRaw } = await supabaseAdmin
    .from("orders")
    .select(`
      id,
      user_id,
      ready_for_collection_at,
      order_items (
        id,
        name,
        quantity
      )
    `)
    .not("ready_for_collection_at", "is", null)
    .eq("status", "completed")
    .order("ready_for_collection_at", { ascending: true });

  const readyUserIds = Array.from(
    new Set(
      (readyOnlineOrdersRaw ?? [])
        .map((o) => o.user_id)
        .filter(Boolean)
    )
  );

  const { data: readyUsersRaw } =
    readyUserIds.length > 0
      ? await supabaseAdmin
          .from("users")
          .select("id, name")
          .in("id", readyUserIds)
      : { data: [] };

  const readyUsersById = new Map(
    (readyUsersRaw ?? []).map((u) => [u.id, u.name])
  );

  const readyOnlineOrders =
  readyOnlineOrdersRaw?.flatMap((order) =>
    (order.order_items ?? []).map((item) => ({
      id: item.id, // ✅ UNIQUE
      source: "online" as const,
      title: item.name ?? "Untitled item",
      customer_name: order.user_id
        ? readyUsersById.get(order.user_id) ?? null
        : null,
      quantity: item.quantity,
      payment_status: "paid" as const,
    }))
  ) ?? [];

  /* =====================================================
     🔵 TO ORDER
  ===================================================== */

  const { data: toOrderRaw } = await supabaseAdmin
    .from("customer_backorders")
    .select(`
      id,
      requested_quantity,
      customer_name,
      supplier_name,
      order_intent,
      temp_title,
      products ( name )
    `)
    .is("ordered_at", null)
    .is("cancelled_at", null)
    .order("created_at", { ascending: true });

  const toOrder =
    toOrderRaw?.map((r) => ({
      backorder_id: r.id,
      quantity: r.requested_quantity,
      product_name: resolveBackorderTitle(r),
      supplier_name: r.supplier_name ?? "Gardners",
      customer_name: r.customer_name,
      source: r.order_intent,
    })) ?? [];

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <OperationsClient
      toPick={[...onlineToPick, ...backordersToPick]}
      readyBackorders={[...readyOnlineOrders, ...readyBackorders]}
      toOrder={toOrder}
    />
  );
}
