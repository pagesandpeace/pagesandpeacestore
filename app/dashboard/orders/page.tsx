import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, MailQuestion, RotateCcw, TriangleAlert } from "lucide-react";

import { getCustomerEventOrders } from "@/lib/app-core/event-orders";
import { supabaseAuthServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function money(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

function StatusIcon({ originalPayment, refunded }: { originalPayment: number; refunded: number }) {
  if (originalPayment > 0 && refunded >= originalPayment) {
    return <span title="Fully refunded" aria-label="Fully refunded" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-700"><RotateCcw className="h-4 w-4" aria-hidden="true" /></span>;
  }
  if (refunded > 0) {
    return <span title="Partially refunded" aria-label="Partially refunded" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-800"><TriangleAlert className="h-4 w-4" aria-hidden="true" /></span>;
  }
  return <span title="Paid" aria-label="Paid" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /></span>;
}

export default async function OrdersPage() {
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/sign-in");

  const orders = await getCustomerEventOrders(user.id);

  return <main className="min-h-screen bg-[#FAF6F1] px-6 py-12 text-[#111]">
    <div className="mx-auto max-w-5xl">
      <Link href="/dashboard" className="text-sm underline">← Dashboard</Link>
      <h1 className="mt-4 text-3xl font-semibold">Order history</h1>
      <p className="mt-1 text-sm text-neutral-600">Confirmed event bookings, payments and refunds. Select an order for full details.</p>

      <div className="mt-8 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-[#F3ECE5] text-xs uppercase tracking-wide text-neutral-600">
              <tr><th className="px-5 py-3">Order</th><th className="px-5 py-3">Purchased</th><th className="px-5 py-3">Items</th><th className="px-5 py-3">Paid</th><th className="px-5 py-3">Refunded</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Help</th></tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const originalPayment = order.lines.reduce((total, line) => total + Number(line.quantity) * Number(line.unit_amount_pence), 0);
                const refunded = order.lines.reduce((total, line) => total + Number(line.refunded_amount_pence ?? 0), 0);
                const netPaid = Math.max(0, originalPayment - refunded);
                const activeTickets = order.lines.reduce((total, line) => total + Math.max(0, Number(line.quantity) - Number(line.refunded_quantity ?? 0)), 0);
                const href = `/dashboard/orders/${order.id}`;
                const linkClass = "block h-full w-full py-4";

                return <tr key={order.id} className="border-t align-middle transition-colors hover:bg-[#189458]/5 focus-within:bg-[#189458]/5">
                  <td className="px-5"><Link href={href} className={linkClass}><p className="font-mono text-xs font-semibold">#{order.id.slice(0, 8)}</p></Link></td>
                  <td className="px-5"><Link href={href} className={linkClass}>{new Date(order.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</Link></td>
                  <td className="px-5"><Link href={href} className={linkClass}><p className="font-medium">{order.lines.length} event item{order.lines.length === 1 ? "" : "s"}</p><p className="text-xs text-neutral-500">{activeTickets} active ticket{activeTickets === 1 ? "" : "s"}</p></Link></td>
                  <td className="px-5"><Link href={href} className={`${linkClass} font-semibold`}>{money(netPaid)}</Link></td>
                  <td className="px-5"><Link href={href} className={`${linkClass} ${refunded > 0 ? "text-red-700" : "text-neutral-400"}`}>{refunded > 0 ? money(refunded) : "—"}</Link></td>
                  <td className="px-5"><Link href={href} className={linkClass}><StatusIcon originalPayment={originalPayment} refunded={refunded} /></Link></td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/contact?order=${encodeURIComponent(order.id.slice(0, 8))}&topic=refund`} title={`Contact Pages & Peace about order ${order.id.slice(0, 8)}`} aria-label={`Contact Pages & Peace about order ${order.id.slice(0, 8)}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-neutral-700 transition-colors hover:border-[#189458] hover:bg-[#189458] hover:text-white">
                      <MailQuestion className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        {!orders.length ? <div className="p-8 text-center"><p>No confirmed event orders yet.</p><Link href="/events" className="mt-3 inline-block underline">Browse events</Link></div> : null}
      </div>
      <p className="mt-4 text-xs text-neutral-500">Refunds are returned to the original payment method and may take a few working days to appear.</p>
    </div>
  </main>;
}
