import Link from "next/link";

import { getAdminEventOrders } from "@/lib/app-core/event-orders";
import { requireAdminUser } from "@/lib/auth/require-admin-user";

export default async function AppCoreEventOrdersPanel() {
  const admin = await requireAdminUser();
  if (!admin) return null;

  const { orders, customers } = await getAdminEventOrders();
  return <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-medium text-emerald-800">Rebuilt event orders</p><h2 className="mt-1 text-xl font-bold">Confirmed online event sales</h2></div>
      <Link href="/admin/events/bookings" className="text-sm font-semibold underline">Full booking register</Link>
    </div>
    {orders.length ? <div className="mt-5 overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-[#f8f5f1] text-xs uppercase tracking-wide text-foreground/60"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Event</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Tickets</th><th className="px-4 py-3">Total</th></tr></thead><tbody>{orders.flatMap((order) => order.lines.map((line) => { const customer = customers.get(order.auth_user_id); return <tr key={line.id} className="border-t"><td className="px-4 py-3">{new Date(order.created_at).toLocaleDateString("en-GB")}</td><td className="px-4 py-3 font-medium">{line.event?.title ?? line.item_name}</td><td className="px-4 py-3">{customer?.display_name ?? "Customer"}<br/><span className="text-xs text-foreground/60">{customer?.email ?? ""}</span></td><td className="px-4 py-3">{line.ticket?.name ?? "Ticket"} × {line.quantity}</td><td className="px-4 py-3">£{((line.quantity * line.unit_amount_pence) / 100).toFixed(2)}</td></tr>; }))}</tbody></table></div> : <p className="mt-4 text-sm text-foreground/70">No confirmed rebuilt event orders yet.</p>}
  </section>;
}
