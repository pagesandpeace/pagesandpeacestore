import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import RefundOrderButton from "@/components/admin/orders/RefundOrderButton";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await supabaseServer();

  /* --------------------------------------------------
     AUTH (ADMIN ONLY)
  -------------------------------------------------- */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  /* --------------------------------------------------
     FETCH ORDER (WITH ITEMS + RELATIONS)
  -------------------------------------------------- */
  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id,
      created_at,
      total,
      status,
      stripe_payment_intent_id,
      order_items (
        id,
        kind,
        quantity,
        refunded_quantity,
        refunded_amount,
        price,
        product:products (
          id,
          name
        ),
        event:events (
          id,
          title
        )
      )
    `)
    .eq("id", id)
    .single();

  console.log("[admin/orders/[id]] order:", order);
  console.log("[admin/orders/[id]] error:", error);

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="text-neutral-600 mt-2">
          ID: <span className="font-mono">{id}</span>
        </p>
      </div>
    );
  }

  const refundedTotal = order.order_items.reduce(
    (sum, item) => sum + Number(item.refunded_amount ?? 0),
    0
  );

  const refundable = Number(order.total) - refundedTotal;

  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */
  return (
    <div className="max-w-4xl mx-auto py-10 space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Order</h1>
        <p className="text-sm text-neutral-500 font-mono mt-1">
          {order.id}
        </p>
      </div>

      {/* META */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-neutral-500">Date</span>
          <div>{new Date(order.created_at).toLocaleString()}</div>
        </div>

        <div>
          <span className="text-neutral-500">Status</span>
          <div className="capitalize">{order.status}</div>
        </div>

        <div>
          <span className="text-neutral-500">Total</span>
          <div>£{Number(order.total).toFixed(2)}</div>
        </div>

        <div>
          <span className="text-neutral-500">Refunded</span>
          <div>£{refundedTotal.toFixed(2)}</div>
        </div>

        <div className="col-span-2">
          <span className="text-neutral-500">Payment Intent</span>
          <div className="font-mono text-xs break-all">
            {order.stripe_payment_intent_id}
          </div>
        </div>
      </div>

      {/* ITEMS */}
      <div>
        <h2 className="font-semibold mb-3">Items</h2>

        <table className="w-full text-sm border">
          <thead className="bg-neutral-50">
            <tr>
              <th className="p-2 text-left">Item</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Qty</th>
              <th className="p-2 text-left">Refunded</th>
              <th className="p-2 text-left">Price</th>
            </tr>
          </thead>

          <tbody>
            {order.order_items.map((item) => {
              const product =
                Array.isArray(item.product)
                  ? item.product[0]
                  : item.product;

              const event =
                Array.isArray(item.event)
                  ? item.event[0]
                  : item.event;

              const name =
                item.kind === "product"
                  ? product?.name ?? "Unknown product"
                  : event?.title ?? "Unknown event";

              return (
                <tr key={item.id} className="border-t">
                  <td className="p-2 font-medium">{name}</td>
                  <td className="p-2 capitalize">{item.kind}</td>
                  <td className="p-2">{item.quantity}</td>
                  <td className="p-2">
                    {item.refunded_quantity ?? 0}
                  </td>
                  <td className="p-2">
                    £{Number(item.price).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* REFUND ACTION */}
      {refundable > 0 && (
        <div className="pt-4 border-t">
          <RefundOrderButton
            orderId={order.id}
            refundable={refundable}
          />
        </div>
      )}
    </div>
  );
}
