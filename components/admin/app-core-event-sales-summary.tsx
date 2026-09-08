import Link from "next/link";

import { getAdminEventOrders } from "@/lib/app-core/event-orders";
import { requireAdminUser } from "@/lib/auth/require-admin-user";

const money = (pence: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export default async function AppCoreEventSalesSummary() {
  const admin = await requireAdminUser();
  if (!admin) return null;

  const { orders } = await getAdminEventOrders();
  const lines = orders.flatMap((order) => order.lines.map((line) => ({
    orderId: order.id,
    name: line.event?.series_name || line.event?.title || line.item_name,
    createdAt: order.created_at,
    quantity: Number(line.quantity),
    refundedQuantity: Number(line.refunded_quantity ?? 0),
    grossPence: Number(line.quantity) * Number(line.unit_amount_pence),
    refundedPence: Number(line.refunded_amount_pence ?? 0),
  })));

  const netQuantity = (line: (typeof lines)[number]) => Math.max(0, line.quantity - line.refundedQuantity);
  const netRevenue = (line: (typeof lines)[number]) => Math.max(0, line.grossPence - line.refundedPence);

  const revenue = lines.reduce((total, line) => total + netRevenue(line), 0);
  const refunded = lines.reduce((total, line) => total + line.refundedPence, 0);
  const tickets = lines.reduce((total, line) => total + netQuantity(line), 0);

  const orderNet = new Map<string, number>();
  for (const line of lines) orderNet.set(line.orderId, (orderNet.get(line.orderId) ?? 0) + netRevenue(line));
  const activeOrders = [...orderNet.values()].filter((amount) => amount > 0).length;

  const now = new Date();
  const currentMonth = monthKey(now);
  const thisMonthRevenue = lines
    .filter((line) => monthKey(new Date(line.createdAt)) === currentMonth)
    .reduce((total, line) => total + netRevenue(line), 0);

  const byEvent = new Map<string, { name: string; revenue: number; tickets: number }>();
  for (const line of lines) {
    const current = byEvent.get(line.name) ?? { name: line.name, revenue: 0, tickets: 0 };
    current.revenue += netRevenue(line);
    current.tickets += netQuantity(line);
    byEvent.set(line.name, current);
  }
  const events = [...byEvent.values()].filter((event) => event.revenue > 0 || event.tickets > 0).sort((a, b) => b.revenue - a.revenue);
  const maxEventRevenue = Math.max(...events.map((event) => event.revenue), 1);

  const trend = Array.from({ length: 12 }, (_, offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - offset), 1);
    const key = monthKey(date);
    const amount = lines.filter((line) => monthKey(new Date(line.createdAt)) === key).reduce((total, line) => total + netRevenue(line), 0);
    return { key, label: date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }), amount };
  });
  const maxMonthRevenue = Math.max(...trend.map((month) => month.amount), 1);

  return <div className="space-y-8">
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-2xl font-bold">Event sales</h2><p className="mt-1 text-sm text-emerald-900/70">All paid event sales in one view, net of partial and full refunds.</p></div>
        <Link href="/admin/events/bookings" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">View booking register & refunds</Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Net event revenue" value={money(revenue)} />
        <Metric label="Active paid orders" value={activeOrders.toLocaleString("en-GB")} />
        <Metric label="Net tickets sold" value={tickets.toLocaleString("en-GB")} />
        <Metric label="Revenue this month" value={money(thisMonthRevenue)} />
        <Metric label="Refunded total" value={money(refunded)} />
      </div>
    </section>

    <section className="rounded-2xl border bg-white p-6">
      <div><h2 className="text-xl font-bold">Monthly event revenue</h2><p className="mt-1 text-sm text-foreground/60">Last 12 calendar months, net of refunds.</p></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">{trend.map((month) => <div key={month.key} className="rounded-xl bg-[#f8f5f1] p-3"><p className="text-xs font-medium text-foreground/60">{month.label}</p><div className="mt-3 flex h-28 items-end"><div className="w-full rounded-t bg-emerald-700" style={{ height: `${Math.max((month.amount / maxMonthRevenue) * 100, month.amount ? 7 : 0)}%` }} /></div><p className="mt-2 text-sm font-semibold">{money(month.amount)}</p></div>)}</div>
    </section>

    <section className="rounded-2xl border bg-white p-6">
      <div><h2 className="text-xl font-bold">Revenue by event type</h2><p className="mt-1 text-sm text-foreground/60">All event sales and ticket counts, net of refunds.</p></div>
      {events.length ? <div className="mt-6 space-y-4">{events.map((event) => <div key={event.name}><div className="flex justify-between gap-4 text-sm"><span className="font-medium">{event.name} <span className="text-foreground/60">· {event.tickets} ticket{event.tickets === 1 ? "" : "s"}</span></span><span className="font-semibold">{money(event.revenue)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f1ede7]"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${(event.revenue / maxEventRevenue) * 100}%` }} /></div></div>)}</div> : <p className="mt-6 text-sm text-foreground/60">No paid event revenue yet.</p>}
    </section>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white p-4"><p className="text-xs uppercase tracking-wide text-foreground/60">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>;
}
