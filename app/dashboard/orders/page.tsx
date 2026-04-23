import { supabaseServer } from "@/lib/supabase/server";
import Link from "next/link";

type OrderItemRow = {
  id: string;
  name: string | null;
  kind: string | null;
};

type OrderRow = {
  id: string;
  total: number | string;
  status: string;
  created_at: string;
  order_items?: OrderItemRow[] | null;
};

function shortId(id: string, n = 10) {
  return id?.slice(0, n) ?? "";
}

function getOrderTitle(
  orderItems?: { name: string | null; kind: string | null }[] | null
) {
  if (!orderItems || orderItems.length === 0) {
    return { title: "Order item", meta: "" };
  }

  const firstNamed = orderItems.find((item) => item.name?.trim());
  const first = firstNamed ?? orderItems[0];

  const title = first?.name?.trim() || "Order item";
  const extraCount = orderItems.length - 1;
  const kind = first?.kind
    ? first.kind[0].toUpperCase() + first.kind.slice(1)
    : "";

  let meta = kind;

  if (extraCount > 0) {
    meta = meta ? `${meta} • +${extraCount} more` : `+${extraCount} more`;
  }

  return { title, meta };
}

function getStatusClasses(status: string) {
  if (status === "completed") {
    return "bg-green-100 text-green-800";
  }

  if (status === "partially_refunded") {
    return "bg-orange-100 text-orange-800";
  }

  if (status === "refunded") {
    return "bg-red-100 text-red-800";
  }

  return "bg-gray-200 text-gray-700";
}

export default async function OrdersPage() {
  const supabase = await supabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    return (
      <main className="p-8">
        <p className="opacity-60 text-sm">
          Please sign in to view your orders.
        </p>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        id,
        total,
        status,
        created_at,
        order_items (
          id,
          name,
          kind
        )
      `
    )
    .eq("user_id_uuid", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Failed to load orders:", error);
    return (
      <main className="p-8">
        <p className="opacity-60 text-sm">Failed to load orders.</p>
      </main>
    );
  }

  const orders: OrderRow[] = data ?? [];

  return (
    <main className="min-h-screen bg-[#FAF6F1] text-[#111] px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="pb-4 border-b">
          <h1 className="text-3xl font-semibold tracking-wide">
            My Orders 📦
          </h1>
          <p className="text-sm opacity-60 mt-1">
            An overview of your recent purchases.
          </p>
        </header>

        {orders.length === 0 && (
          <div className="text-center py-20 opacity-70">
            <p>No orders yet.</p>
            <Link
              href="/shop"
              className="underline text-accent mt-2 inline-block"
            >
              Browse the shop →
            </Link>
          </div>
        )}

        <div className="space-y-4 md:hidden">
          {orders.map((o) => {
            const canRequestRefund =
              o.status === "completed" ||
              o.status === "partially_refunded";

            const itemInfo = getOrderTitle(o.order_items);

            return (
              <div
                key={o.id}
                className="rounded-xl border bg-white p-4 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-sm opacity-60">Order date</p>
                    <p className="font-medium">
                      {new Date(o.created_at).toLocaleDateString("en-GB")}
                    </p>
                    <p className="text-xs opacity-50 mt-1">
                      Order #{shortId(o.id, 10)}
                    </p>
                  </div>

                  <span
                    className={`text-xs px-2 py-1 rounded-md capitalize ${getStatusClasses(
                      o.status
                    )}`}
                  >
                    {o.status.replace("_", " ")}
                  </span>
                </div>

                <div>
                  <p className="text-sm opacity-60">Item</p>
                  <p className="font-medium">{itemInfo.title}</p>
                  {itemInfo.meta ? (
                    <p className="text-xs opacity-60 mt-1">{itemInfo.meta}</p>
                  ) : null}
                </div>

                <div>
                  <p className="text-sm opacity-60">Total</p>
                  <p className="text-lg font-semibold">
                    £{Number(o.total).toFixed(2)}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t gap-3">
                  <Link
                    href={`/dashboard/orders/${o.id}`}
                    className="text-accent underline"
                  >
                    View order →
                  </Link>

                  {canRequestRefund && (
                    <a
                      href={`mailto:admin@pagesandpeace.co.uk?subject=Refund request for order ${o.id}`}
                      className="text-xs underline text-neutral-600 text-right"
                    >
                      Need a refund?
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {orders.length > 0 && (
          <div className="hidden md:block overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-[#F3ECE5] uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">Date / Order</th>
                  <th className="px-5 py-3 text-left">Item</th>
                  <th className="px-5 py-3 text-left">Amount</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((o) => {
                  const canRequestRefund =
                    o.status === "completed" ||
                    o.status === "partially_refunded";

                  const itemInfo = getOrderTitle(o.order_items);

                  return (
                    <tr
                      key={o.id}
                      className="border-t hover:bg-[#FAF6F1]/60"
                    >
                      <td className="px-5 py-4">
                        <div>
                          {new Date(o.created_at).toLocaleDateString("en-GB")}
                        </div>
                        <div className="text-xs text-neutral-500 mt-1">
                          Order #{shortId(o.id, 10)}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium">{itemInfo.title}</div>
                        {itemInfo.meta ? (
                          <div className="text-xs text-neutral-500 mt-1">
                            {itemInfo.meta}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-5 py-4 font-medium">
                        £{Number(o.total).toFixed(2)}
                      </td>

                      <td className="px-5 py-4 capitalize">
                        <span
                          className={`inline-flex px-2 py-1 text-xs rounded-md ${getStatusClasses(
                            o.status
                          )}`}
                        >
                          {o.status.replace("_", " ")}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right space-x-3">
                        <Link
                          href={`/dashboard/orders/${o.id}`}
                          className="text-accent underline"
                        >
                          View →
                        </Link>

                        {canRequestRefund && (
                          <a
                            href={`mailto:admin@pagesandpeace.co.uk?subject=Refund request for order ${o.id}`}
                            className="text-xs underline text-neutral-600"
                          >
                            Need a refund?
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}