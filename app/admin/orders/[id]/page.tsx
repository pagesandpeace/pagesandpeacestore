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

  if (!user) {
    redirect("/sign-in?callbackURL=/admin/orders");
  }

  // ✅ MATCHES STAGING + admin/events
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  /* --------------------------------------------------
     FETCH ORDER
  -------------------------------------------------- */
  const { data: order } = await supabase
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

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="text-neutral-600 mt-2 font-mono">{id}</p>
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
      <div>
        <h1 className="text-2xl font-bold">Order</h1>
        <p className="text-xs font-mono text-neutral-500 mt-1">
          {order.id}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-neutral-500">Date</p>
          <p>{new Date(order.created_at).toLocaleString()}</p>
        </div>

        <div>
          <p className="text-neutral-500">Status</p>
          <p className="capitalize">{order.status}</p>
        </div>

        <div>
          <p className="text-neutral-500">Total</p>
          <p>£{Number(order.total).toFixed(2)}</p>
        </div>

        <div>
          <p className="text-neutral-500">Refunded</p>
          <p>£{refundedTotal.toFixed(2)}</p>
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-3">Items</h2>

        <div className="space-y-3">
          {order.order_items.map((item) => {
            const product = Array.isArray(item.product)
              ? item.product[0]
              : item.product;

            const event = Array.isArray(item.event)
              ? item.event[0]
              : item.event;

            const name =
              item.kind === "product"
                ? product?.name
                : event?.title;

            return (
              <div
                key={item.id}
                className="border rounded-lg p-4 flex justify-between"
              >
                <div>
                  <p className="font-medium">{name}</p>
                  <p className="text-xs text-neutral-500 capitalize">
                    {item.kind} · Qty {item.quantity}
                  </p>
                </div>

                <div className="text-right">
                  <p>£{Number(item.price).toFixed(2)}</p>
                  {item.refunded_quantity > 0 && (
                    <p className="text-xs text-red-600">
                      Refunded {item.refunded_quantity}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
