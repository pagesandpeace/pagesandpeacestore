import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import AdminOrdersList from "@/components/admin/orders/AdminOrdersList";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export default async function AdminOrdersPage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?callbackURL=/admin/orders");
  }

  // ✅ SAME CHECK EVERYWHERE
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("id, created_at, total, status")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-6xl mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">Orders</h1>

      {!orders || orders.length === 0 ? (
        <p className="text-neutral-500 italic">No orders found.</p>
      ) : (
        <AdminOrdersList orders={orders} />
      )}
    </div>
  );
}
