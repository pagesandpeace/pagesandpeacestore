import Link from "next/link";
import { redirect } from "next/navigation";

import { getCustomerEventOrders } from "@/lib/app-core/event-orders";
import { supabaseAuthServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function money(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

export default async function OrdersPage() {
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/sign-in");

  const orders = await getCustomerEventOrders(user.id);

  return <main className="min-h-screen bg-[#FAF6F1] px-6 py-12 text-[#111]">
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard" className="text-sm underline">← Dashboard</Link>
      <h1 className="mt-4 text-3xl font-semibold">My event orders</h1>
      <p className="mt-1 text-sm text-neutral-600">Confirmed event bookings, payments and refunds.</p>
      <div className="mt-8 space-y-4">
        {orders.length ? orders.map((order) => {
          const originalPayment = order.lines.reduce((total, line) => total + Number(line.quantity) * Number(line.unit_amount_pence), 0);
          const refunded = order.lines.reduce((total, line) => total + Number(line.refunded_amount_pence ?? 0), 0);
          const netPaid = Math.max(0, originalPayment - refunded);
          const fullyRefunded = originalPayment > 0 && refunded >= originalPayment;
          const badge = fullyRefunded
            ? { label: "Fully refunded", className: "bg-red-100 text-red-800" }
            : refunded > 0
              ? { label: "Partially refunded", className: "bg-amber-100 text-amber-800" }
              : { label: "Paid", className: "bg-green-100 text-green-800" };

          return <article key={order.id} className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-semibold">Order #{order.id.slice(0, 8)}</p><p className="text-sm text-neutral-600">{new Date(order.created_at).toLocaleDateString("en-GB")}</p></div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${badge.className}`}>{badge.label}</span>
            </div>

            <ul className="mt-4 space-y-3">{order.lines.map((line) => {
              const refundedQty = Number(line.refunded_quantity ?? 0);
              const remainingQty = Math.max(0, Number(line.quantity) - refundedQty);
              const refundedPence = Number(line.refunded_amount_pence ?? 0);
              const lineFullyRefunded = refundedQty >= Number(line.quantity) && Number(line.quantity) > 0;

              return <li key={line.id} className="border-t pt-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{line.event?.title ?? line.item_name}</p>
                    <p className="text-sm text-neutral-600">{line.ticket?.name ?? "Ticket"} × {line.quantity}{line.event ? ` · ${new Date(line.event.starts_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}` : ""}</p>
                    {refundedQty > 0 ? <p className="mt-1 text-sm font-medium text-red-700">{lineFullyRefunded ? "Refunded" : `${refundedQty} ticket${refundedQty === 1 ? "" : "s"} refunded`} · {money(refundedPence)}</p> : null}
                    {!lineFullyRefunded && refundedQty > 0 ? <p className="text-xs text-neutral-500">{remainingQty} ticket{remainingQty === 1 ? "" : "s"} remain active</p> : null}
                  </div>
                  {lineFullyRefunded ? <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">Refunded</span> : null}
                </div>
              </li>;
            })}</ul>

            <div className="mt-5 rounded-xl bg-[#F8F5F1] p-4 text-sm">
              <div className="flex justify-between gap-4"><span className="text-neutral-600">Original payment</span><strong>{money(originalPayment)}</strong></div>
              {refunded > 0 ? <div className="mt-2 flex justify-between gap-4 text-red-700"><span>Refunded</span><strong>−{money(refunded)}</strong></div> : null}
              <div className="mt-2 flex justify-between gap-4 border-t pt-2"><span className="font-medium">Net paid</span><strong>{money(netPaid)}</strong></div>
            </div>

            {refunded > 0 ? <p className="mt-3 text-xs text-neutral-500">Refunds are returned to the original payment method. Your bank or card provider may take a few working days to display the credit.</p> : null}
          </article>;
        }) : <section className="rounded-2xl border bg-white p-8 text-center"><p>No confirmed event orders yet.</p><Link href="/events" className="mt-3 inline-block underline">Browse events</Link></section>}
      </div>
    </div>
  </main>;
}
