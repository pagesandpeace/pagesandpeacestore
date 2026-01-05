import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type OrderRow = {
  id: string;
  created_at: string;
  total: string | number;
  status: string | null;
  stripe_checkout_session_id: string | null;
  user_id: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  kind: string | null;
};

type BookingRow = {
  order_item_id: string;
};

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function shortId(id: string, n = 8) {
  return id?.slice(0, n) ?? "";
}

function asMoney(total: string | number) {
  const num = typeof total === "string" ? Number(total) : total;
  return Number.isNaN(num) ? String(total) : num.toFixed(2);
}

export default async function AdminOrdersPage() {
  const supabase = await supabaseServer();

  /* ---------------- AUTH ---------------- */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?callbackURL=/admin/orders");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  /* ---------------- LOAD ORDERS ---------------- */
  const { data: ordersRaw } = await supabaseAdmin
    .from("orders")
    .select("id, created_at, total, status, stripe_checkout_session_id, user_id")
    .order("created_at", { ascending: false });

  const orders: OrderRow[] = ordersRaw ?? [];
  if (orders.length === 0) {
    return <div className="p-10">No orders</div>;
  }

  const orderIds = orders.map((o) => o.id);

  /* ---------------- LOAD ORDER ITEMS ---------------- */
  const { data: itemsRaw } = await supabaseAdmin
    .from("order_items")
    .select("id, order_id, kind")
    .in("order_id", orderIds);

  const items: OrderItemRow[] = itemsRaw ?? [];

  /* ---------------- LOAD EVENT BOOKINGS ---------------- */
  const eventItemIds = items
    .filter((i) => i.kind === "event")
    .map((i) => i.id);

  const { data: bookingsRaw } =
    eventItemIds.length > 0
      ? await supabaseAdmin
          .from("event_bookings")
          .select("order_item_id")
          .in("order_item_id", eventItemIds)
      : { data: [] };

  const bookings: BookingRow[] = bookingsRaw ?? [];

  /* ---------------- MAP COUNTS ---------------- */
  const eventItemsByOrder = new Map<string, number>();
  for (const it of items) {
    if (it.kind === "event") {
      eventItemsByOrder.set(
        it.order_id,
        (eventItemsByOrder.get(it.order_id) ?? 0) + 1
      );
    }
  }

  const bookingsByOrder = new Map<string, number>();
  for (const b of bookings) {
    const parent = items.find((i) => i.id === b.order_item_id);
    if (!parent) continue;
    bookingsByOrder.set(
      parent.order_id,
      (bookingsByOrder.get(parent.order_id) ?? 0) + 1
    );
  }

  /* ---------------- USERS ---------------- */
  const userIds = Array.from(
    new Set(orders.map((o) => o.user_id).filter(Boolean) as string[])
  );

  const { data: usersRaw } =
    userIds.length > 0
      ? await supabaseAdmin
          .from("users")
          .select("id, email, name")
          .in("id", userIds)
      : { data: [] };

  const usersById = new Map(
    (usersRaw ?? []).map((u: UserRow) => [u.id, u])
  );

  /* ---------------- RENDER ---------------- */
  return (
    <div className="max-w-6xl mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">Orders</h1>

      <div className="overflow-x-auto border rounded-lg bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Order</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Total</th>
              <th className="px-4 py-3 text-left">Stripe</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((o) => {
              const eventItemCount = eventItemsByOrder.get(o.id) ?? 0;
              const bookingCount = bookingsByOrder.get(o.id) ?? 0;

              const needsReconcile =
                eventItemCount > 0 && bookingCount === 0;

              const customer = o.user_id
                ? usersById.get(o.user_id)
                : null;

              return (
                <tr key={o.id} className="border-b">
                  <td className="px-4 py-3">{fmtDate(o.created_at)}</td>

                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="underline text-[var(--accent)]"
                    >
                      {shortId(o.id, 10)}
                    </Link>
                  </td>

                  <td className="px-4 py-3">
                    <div>{customer?.name ?? "—"}</div>
                    <div className="text-xs text-neutral-500">
                      {customer?.email ?? "—"}
                    </div>
                  </td>

                  <td className="px-4 py-3">{o.status}</td>

                  <td className="px-4 py-3 font-semibold">
                    £{asMoney(o.total)}
                  </td>

                  <td className="px-4 py-3 text-xs">
                    {o.stripe_checkout_session_id
                      ? shortId(o.stripe_checkout_session_id, 14)
                      : "—"}
                  </td>

                  <td className="px-4 py-3">
                    {needsReconcile && (
                      <Link
                        href={`/admin/orders/${o.id}?reconcile=1`}
                        className="text-red-600 font-semibold underline"
                      >
                        Reconcile
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
