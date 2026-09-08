import Link from "next/link";

import { getAdminEventOrders } from "@/lib/app-core/event-orders";
import { appCoreDb } from "@/lib/app-core/service";
import { requireAdminUser } from "@/lib/auth/require-admin-user";

const money = (pence: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export default async function AppCoreEventSalesSummary() {
  const admin = await requireAdminUser();
  if (!admin) return null;

  const [{ orders }, { data: legacyBookingRows, error: legacyBookingsError }] = await Promise.all([
    getAdminEventOrders(),
    appCoreDb().schema("public").from("event_bookings").select("id, quantity, cancelled, refunded, events!inner(title, date, is_test)").eq("paid", true),
  ]);
  if (legacyBookingsError) throw new Error("Could not load historical event bookings");
  const nowTimestamp = Date.now();
  const legacyBookings = (legacyBookingRows ?? []).flatMap((booking: any) => {
    const event = Array.isArray(booking.events) ? booking.events[0] : booking.events;
    if (!event || event.is_test || new Date(event.date).getTime() >= nowTimestamp) return [];
    return [{ ...booking, event }];
  });
  const legacyTickets = legacyBookings.reduce((total: number, booking: any) => total + Number(booking.quantity ?? 1), 0);
  const lines = orders.flatMap((order) => order.lines.map((line) => ({ ...line, created_at: order.created_at })));
  const netQuantity = (line: (typeof lines)[number]) => Math.max(0, Number(line.quantity) - Number(line.refunded_quantity ?? 0));
  const netRevenue = (line: (typeof lines)[number]) => Math.max(0, Number(line.quantity) * Number(line.unit_amount_pence) - Number(line.refunded_amount_pence ?? 0));

  const revenue = lines.reduce((total, line) => total + netRevenue(line), 0);
  const refunded = lines.reduce((total, line) => total + Number(line.refunded_amount_pence ?? 0), 0);
  const tickets = lines.reduce((total, line) => total + netQuantity(line), 0);
  const activeOrders = orders.filter((order) => Number(order.total_pence) - Number(order.refunded_total_pence ?? 0) > 0);
  const now = new Date();
  const currentMonth = monthKey(now);
  const thisMonthLines = lines.filter((line) => monthKey(new Date(line.created_at)) === currentMonth);
  const thisMonthRevenue = thisMonthLines.reduce((total, line) => total + netRevenue(line), 0);

  const byEvent = new Map<string, { name: string; revenue: number; tickets: number }>();
  for (const line of lines) {
    const name = line.event?.series_name || line.event?.title || line.item_name;
    const current = byEvent.get(name) ?? { name, revenue: 0, tickets: 0 };
    current.revenue += netRevenue(line);
    current.tickets += netQuantity(line);
    byEvent.set(name, current);
  }
  const events = [...byEvent.values()].filter((event) => event.revenue > 0 || event.tickets > 0).sort((a, b) => b.revenue - a.revenue);
  const maxEventRevenue = Math.max(...events.map((event) => event.revenue), 1);

  const trend = Array.from({ length: 6 }, (_, offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - offset), 1);
    const key = monthKey(date);
    const amount = lines.filter((line) => monthKey(new Date(line.created_at)) === key).reduce((total, line) => total + netRevenue(line), 0);
    return { key, label: date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }), amount };
  });
  const maxMonthRevenue = Math.max(...trend.map((month) => month.amount), 1);

  return <div className="space-y-8">
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm font-medium text-emerald-800">Rebuilt event sales</p><h2 className="mt-1 text-2xl font-bold">Live booking figures</h2><p className="mt-1 text-sm text-emerald-900/70">Net figures after partial and full refunds. Original checkout values remain immutable.</p></div>
        <Link href="/admin/events/bookings" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">View booking register & refunds</Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Net event revenue" value={money(revenue)} />
        <Metric label="Active paid orders" value={activeOrders.length.toLocaleString("en-GB")} />
        <Metric label="Net tickets sold" value={tickets.toLocaleString("en-GB")} />
        <Metric label="Revenue this month" value={money(thisMonthRevenue)} />
        <Metric label="Refunded total" value={money(refunded)} />
      </div>
    </section>

    <section className="rounded-2xl border bg-white p-6">
      <div><h2 className="text-xl font-bold">Monthly event revenue</h2><p className="mt-1 text-sm text-foreground/60">Last six calendar months, net of refunds.</p></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">{trend.map((month) => <div key={month.key} className="rounded-xl bg-[#f8f5f1] p-3"><p className="text-xs font-medium text-foreground/60">{month.label}</p><div className="mt-3 flex h-28 items-end"><div className="w-full rounded-t bg-emerald-700" style={{ height: `${Math.max((month.amount / maxMonthRevenue) * 100, month.amount ? 7 : 0)}%` }} /></div><p className="mt-2 text-sm font-semibold">{money(month.amount)}</p></div>)}</div>
    </section>

    <section className="rounded-2xl border border-sky-200 bg-sky-50 p-6">
      <div><p className="text-sm font-medium text-sky-800">Previous system</p><h2 className="mt-1 text-xl font-bold">Historical event bookings</h2><p className="mt-1 text-sm text-sky-900/70">Read-only records retained from before the rebuilt checkout system. They are kept separate from the refund-aware live totals above.</p></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Metric label="Historical paid bookings" value={legacyBookings.length.toLocaleString("en-GB")} />
        <Metric label="Historical tickets" value={legacyTickets.toLocaleString("en-GB")} />
      </div>
    </section>

    <section className="rounded-2xl border bg-white p-6">
      <div><h2 className="text-xl font-bold">Revenue by event type</h2><p className="mt-1 text-sm text-foreground/60">Net revenue and ticket counts after refunds.</p></div>
      {events.length ? <div className="mt-6 space-y-4">{events.map((event) => <div key={event.name}><div className="flex justify-between gap-4 text-sm"><span className="font-medium">{event.name} <span className="text-foreground/60">· {event.tickets} ticket{event.tickets === 1 ? "" : "s"}</span></span><span className="font-semibold">{money(event.revenue)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f1ede7]"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${(event.revenue / maxEventRevenue) * 100}%` }} /></div></div>)}</div> : <p className="mt-6 text-sm text-foreground/60">No net paid event revenue yet.</p>}
    </section>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white p-4"><p className="text-xs uppercase tracking-wide text-foreground/60">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>;
}
