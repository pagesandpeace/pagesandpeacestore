import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminEventOrders } from "@/lib/app-core/event-orders";
import { requireAdminUser } from "@/lib/auth/require-admin-user";

export const dynamic = "force-dynamic";

export default async function AdminEventBookingsPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in");

  const { orders, customers } = await getAdminEventOrders();
  return <main className="min-h-screen bg-[#FAF6F1] px-6 py-12 text-[#111]">
    <div className="mx-auto max-w-6xl">
      <Link href="/admin" className="text-sm underline">← Admin dashboard</Link>
      <h1 className="mt-4 text-3xl font-semibold">Event bookings</h1>
      <p className="mt-1 text-sm text-neutral-600">Paid, confirmed bookings from the rebuilt event system.</p>
      <div className="mt-8 overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm"><thead className="bg-[#F3ECE5] text-xs uppercase tracking-wide text-neutral-600"><tr><th className="px-5 py-3">Event</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Tickets</th><th className="px-5 py-3">Paid</th><th className="px-5 py-3">Order</th></tr></thead>
        <tbody>{orders.flatMap((order) => order.lines.map((line) => {
          const customer = customers.get(order.auth_user_id);
          return <tr key={line.id} className="border-t"><td className="px-5 py-4"><p className="font-medium">{line.event?.title ?? line.item_name}</p><p className="text-xs text-neutral-600">{line.event ? new Date(line.event.starts_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : ""}</p></td><td className="px-5 py-4">{customer?.display_name ?? "Customer"}<br/><span className="text-xs text-neutral-600">{customer?.email ?? ""}</span></td><td className="px-5 py-4">{line.ticket?.name ?? "Ticket"} × {line.quantity}</td><td className="px-5 py-4">£{(order.total_pence / 100).toFixed(2)}</td><td className="px-5 py-4 font-mono text-xs">{order.id.slice(0, 8)}</td></tr>;
        }))}</tbody></table>
      </div>
      {!orders.length ? <p className="mt-6 text-sm text-neutral-600">No paid bookings yet.</p> : null}
    </div>
  </main>;
}
