import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import RefundOrderButton from "@/components/admin/orders/RefundOrderButton";

export const dynamic = "force-dynamic";

/* --------------------------------------------------
   SERVICE ROLE (DATA ONLY)
-------------------------------------------------- */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  console.log("🧭 [admin/orders/[id]] START", { id });

  /* --------------------------------------------------
     AUTH
  -------------------------------------------------- */
  const supabase = await supabaseServer();

  const userRes = await supabase.auth.getUser();
  console.log("👤 auth.getUser()", userRes);

  const user = userRes.data.user;

  if (!user) {
    console.error("❌ NO USER – SHOULD NOT REDIRECT YET");
    return (
      <pre className="p-6 text-sm">
        NO USER SESSION
      </pre>
    );
  }

  /* --------------------------------------------------
     ROLE CHECK
  -------------------------------------------------- */
  const profileRes = await supabase
    .from("users")
    .select("id, role, auth_user_id")
    .eq("auth_user_id", user.id)
    .single();

  console.log("🧑‍💼 profile lookup", profileRes);

  if (!profileRes.data) {
    console.error("❌ NO PROFILE ROW");
    return (
      <pre className="p-6 text-sm">
        NO PROFILE ROW FOR AUTH USER
        {JSON.stringify(profileRes, null, 2)}
      </pre>
    );
  }

  if (profileRes.data.role !== "admin") {
    console.error("❌ NOT ADMIN", profileRes.data);
    return (
      <pre className="p-6 text-sm">
        USER IS NOT ADMIN
        {JSON.stringify(profileRes.data, null, 2)}
      </pre>
    );
  }

  /* --------------------------------------------------
     FETCH ORDER (SERVICE ROLE)
  -------------------------------------------------- */
  const orderRes = await supabaseAdmin
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
        name,
        event_id
      )
    `)
    .eq("id", id)
    .maybeSingle(); // 🔥 IMPORTANT

  console.log("📦 order fetch", orderRes);

  if (!orderRes.data) {
    console.error("❌ ORDER NOT FOUND OR BLOCKED");
    return (
      <pre className="p-6 text-sm">
        ORDER NOT FOUND OR BLOCKED BY RLS
        {JSON.stringify(orderRes, null, 2)}
      </pre>
    );
  }

  const order = orderRes.data;

  /* --------------------------------------------------
     CALCULATIONS
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
      <h1 className="text-2xl font-bold">Order</h1>

      <pre className="text-xs bg-neutral-100 p-4 rounded">
        {JSON.stringify(order, null, 2)}
      </pre>

      {refundable > 0 && (
        <RefundOrderButton
          orderId={order.id}
          refundable={refundable}
        />
      )}
    </div>
  );
}
