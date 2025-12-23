import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/* --------------------------------------------------
   SERVICE ROLE CLIENT (BYPASS RLS FOR DATA ONLY)
-------------------------------------------------- */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type OrderRow = {
  id: string;
  created_at: string;
  total: number;
  status: string;
};

export default async function AdminOrdersPage() {
  /* ---------------------------------------------
     AUTH (ADMIN ONLY – SOURCE OF TRUTH = users table)
  --------------------------------------------- */
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?callbackURL=/admin/orders");
  }

  // ✅ MATCHES admin/events + admin/dashboard logic
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  /* ---------------------------------------------
     FETCH ORDERS (SERVICE ROLE)
  --------------------------------------------- */
  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select(`
      id,
      created_at,
      total,
      status
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/orders] fetch error:", error);
  }

  const safeOrders: OrderRow[] = orders ?? [];

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */
  return (
    <div className="max-w-6xl mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">Orders</h1>

      {safeOrders.length === 0 && (
        <p className="text-neutral-500 italic">No orders found.</p>
      )}

      {safeOrders.length > 0 && (
        <table className="w-full text-sm border">
          <thead className="bg-neutral-50">
            <tr>
              <th className="p-2 text-left">Order</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Total</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2" />
            </tr>
          </thead>

          <tbody>
            {safeOrders.map((order) => (
              <tr key={order.id} className="border-t">
                <td className="p-2 font-mono text-xs">
                  {order.id.slice(0, 8)}
                </td>

                <td className="p-2">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>

                <td className="p-2">
                  £{Number(order.total).toFixed(2)}
                </td>

                <td className="p-2 capitalize">
                  {order.status}
                </td>

                <td className="p-2 text-right">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="underline text-sm"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
