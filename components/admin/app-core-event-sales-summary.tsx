import Link from "next/link";

import { getAdminEventOrders } from "@/lib/app-core/event-orders";
import { requireAdminUser } from "@/lib/auth/require-admin-user";

export default async function AppCoreEventSalesSummary() {
  const admin = await requireAdminUser();
  if (!admin) return null;

  const { orders } = await getAdminEventOrders();
  const seats = orders.flatMap((order) => order.lines).reduce((total, line) => total + line.quantity, 0);
  const revenue = orders.reduce((total, order) => total + order.total_pence, 0);
  const thisMonth = orders.filter((order) => {
    const date = new Date(order.created_at);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const thisMonthRevenue = thisMonth.reduce((total, order) => total + order.total_pence, 0);

  return <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-medium text-emerald-800">Rebuilt event sales</p><h2 className="mt-1 text-2xl font-bold">Live event booking figures</h2><p className="mt-1 text-sm text-emerald-900/70">From the secure app_core event system.</p></div>
      <Link href="/admin/events/bookings" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">View bookings</Link>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl bg-white p-4"><p className="text-xs uppercase tracking-wide text-foreground/60">Revenue</p><p className="mt-1 text-2xl font-bold">£{(revenue / 100).toFixed(2)}</p></div>
      <div className="rounded-xl bg-white p-4"><p className="text-xs uppercase tracking-wide text-foreground/60">Paid orders</p><p className="mt-1 text-2xl font-bold">{orders.length}</p></div>
      <div className="rounded-xl bg-white p-4"><p className="text-xs uppercase tracking-wide text-foreground/60">Tickets sold</p><p className="mt-1 text-2xl font-bold">{seats}</p></div>
    </div>
    <p className="mt-4 text-sm text-emerald-900/70">This month: £{(thisMonthRevenue / 100).toFixed(2)} across {thisMonth.length} paid event order{thisMonth.length === 1 ? "" : "s"}.</p>
  </section>;
}
