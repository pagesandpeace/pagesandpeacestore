import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import RefundOrderButton from "@/components/admin/orders/RefundOrderButton";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  console.log("🧭 [admin/orders/[id]] START", { id });

  const supabase = await supabaseServer();

  /* --------------------------------------------------
     AUTH (ADMIN ONLY)
  -------------------------------------------------- */
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log("👤 auth.getUser()", { user, authError });

  if (!user) {
    console.warn("⛔ No user, redirecting to sign-in");
    redirect("/sign-in?callbackURL=/admin/orders");
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  console.log("🧑‍💼 profile lookup", { profile, profileError });

  if (profile?.role !== "admin") {
    console.warn("⛔ Not admin, redirecting to dashboard");
    redirect("/dashboard");
  }

  /* --------------------------------------------------
     FETCH ORDER (NO RELATION JOINS)
  -------------------------------------------------- */
  const { data: order, error: orderError } = await supabase
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
        price
      )
    `)
    .eq("id", id)
    .maybeSingle();

  console.log("📦 order fetch", { order, orderError });

  if (!order) {
    console.error("❌ Order not found", { id, orderError });
    return (
      <div className="max-w-4xl mx-auto py-10">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="text-neutral-600 mt-2 font-mono">{id}</p>
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

  console.log("💰 totals", { refundedTotal, refundable });

  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */
  return (
    <div className="max-w-4xl mx-auto py-10 space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Order</h1>
        <p className="text-xs font-mono text-neutral-500 mt-1">
          {order.id}
        </p>
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

        <div className="col-span-2">
          <p className="text-neutral-500">Payment Intent</p>
          <p className="font-mono text-xs break-all">
            {order.stripe_payment_intent_id ?? "—"}
          </p>
        </div>
      </div>

      {/* ITEMS */}
      <div>
        <h2 className="font-semibold mb-3">Items</h2>

        <div className="space-y-3">
          {order.order_items.map((item) => {
            const displayName =
              item.name ??
              (item.kind === "event" ? "Event ticket" : "Product");

            return (
              <div
                key={item.id}
                className="border rounded-lg p-4 flex justify-between"
              >
                <div>
                  <p className="font-medium">{displayName}</p>
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

      {/* REFUND */}
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
