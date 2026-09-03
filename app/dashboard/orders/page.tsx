import Link from "next/link";
import { redirect } from "next/navigation";

import { getCustomerEventOrders } from "@/lib/app-core/event-orders";
import { supabaseAuthServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/sign-in");

  const orders = await getCustomerEventOrders(user.id);

  return <main className="min-h-screen bg-[#FAF6F1] px-6 py-12 text-[#111]">
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard" className="text-sm underline">← Dashboard</Link>
      <h1 className="mt-4 text-3xl font-semibold">My event orders</h1>
      <p className="mt-1 text-sm text-neutral-600">Confirmed event bookings and payment history.</p>
      <div className="mt-8 space-y-4">
        {orders.length ? orders.map((order) => <article key={order.id} className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">Order #{order.id.slice(0, 8)}</p><p className="text-sm text-neutral-600">{new Date(order.created_at).toLocaleDateString("en-GB")}</p></div><span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">Paid</span></div>
          <ul className="mt-4 space-y-3">{order.lines.map((line) => <li key={line.id} className="border-t pt-3"><p className="font-medium">{line.event?.title ?? line.item_name}</p><p className="text-sm text-neutral-600">{line.ticket?.name ?? "Ticket"} × {line.quantity}{line.event ? ` · ${new Date(line.event.starts_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}` : ""}</p></li>)}</ul>
          <p className="mt-4 font-semibold">Total paid: £{(order.total_pence / 100).toFixed(2)}</p>
        </article>) : <section className="rounded-2xl border bg-white p-8 text-center"><p>No confirmed event orders yet.</p><Link href="/events" className="mt-3 inline-block underline">Browse events</Link></section>}
      </div>
    </div>
  </main>;
}
