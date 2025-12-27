import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import RefundOrderButton from "@/components/admin/orders/RefundOrderButton";
import { Button } from "@/components/ui/Button";

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

  if (!user) redirect("/sign-in?callbackURL=/admin/orders");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

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
        name,
        quantity,
        refunded_quantity,
        refunded_amount,
        price,
        event_id
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <h1 className="text-2xl font-bold">Order not found</h1>
      </div>
    );
  }

  /* --------------------------------------------------
     TOTALS
  -------------------------------------------------- */
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
        <p className="text-xs font-mono text-neutral-500 mt-1">{order.id}</p>
      </div>

      {/* META */}
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

      {/* ITEMS */}
      <div>
        <h2 className="font-semibold mb-3">Items</h2>

        <div className="space-y-3">
          {order.order_items.map((item) => {
            const refundedQty = item.refunded_quantity ?? 0;
            const remainingQty = item.quantity - refundedQty;

            const displayName =
              item.name ??
              (item.kind === "event" ? "Event ticket" : "Product");

            return (
              <div
                key={item.id}
                className="border rounded-lg p-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{displayName}</p>

                  <p className="text-xs text-neutral-500 capitalize">
                    {item.kind} · Purchased {item.quantity}
                  </p>

                  <p className="text-xs text-neutral-500">
                    Refunded {refundedQty} · Remaining {remainingQty}
                  </p>
                </div>

                {/* ACTIONS */}
                <div className="text-right space-y-2">
                  <p>£{Number(item.price).toFixed(2)}</p>

                  {/* PRODUCT REFUNDS */}
                  {item.kind === "product" && remainingQty > 0 && (
                    <form action="/api/admin/refund" method="POST">
                      <input type="hidden" name="orderItemId" value={item.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Refund 1
                      </Button>
                    </form>
                  )}

                  {/* EVENT MANAGEMENT */}
                  {item.kind === "event" && item.event_id && (
                    <Link href={`/admin/events/${item.event_id}`}>
                      <Button size="sm" variant="outline">
                        Manage attendees
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FULL ORDER REFUND */}
      {refundable > 0 && (
        <div className="pt-4 border-t">
          <RefundOrderButton orderId={order.id} refundable={refundable} />
        </div>
      )}
    </div>
  );
}
