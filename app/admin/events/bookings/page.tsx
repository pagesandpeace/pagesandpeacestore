import Link from "next/link";
import { redirect } from "next/navigation";

import AppCoreRefundButton from "@/components/admin/app-core-refund-button";
import { getAdminEventOrders } from "@/lib/app-core/event-orders";
import { requireAdminUser } from "@/lib/auth/require-admin-user";

export const dynamic = "force-dynamic";

export default async function AdminEventBookingsPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in");

  const { orders, customers } = await getAdminEventOrders();
  return <main className="min-h-screen bg-[#FAF6F1] px-6 py-12 text-[#111]">
    <div className="mx-auto max-w-7xl">
      <Link href="/admin" className="text-sm underline">← Admin dashboard</Link>
      <h1 className="mt-4 text-3xl font-semibold">Event bookings</h1>
      <p className="mt-1 text-sm text-neutral-600">Paid bookings from the rebuilt event system. Refunds are reflected in ticket and revenue figures.</p>
      <div className="mt-8 overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm"><thead className="bg-[#F3ECE5] text-xs uppercase tracking-wide text-neutral-600"><tr><th className="px-5 py-3">Event</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Tickets</th><th className="px-5 py-3">Net paid</th><th className="px-5 py-3">Order</th><th className="px-5 py-3">Refund actions</th></tr></thead>
        <tbody>{orders.flatMap((order) => order.lines.map((line, lineIndex) => {
          const customer = customers.get(order.auth_user_id);
          const refundedQty = Number(line.refunded_quantity ?? 0);
          const remainingQty = Math.max(0, Number(line.quantity) - refundedQty);
          const grossPence = Number(line.quantity) * Number(line.unit_amount_pence);
          const refundedPence = Number(line.refunded_amount_pence ?? 0);
          const netPence = Math.max(0, grossPence - refundedPence);
          const orderRemainingPence = Math.max(0, Number(order.total_pence) - Number(order.refunded_total_pence ?? 0));
          const itemName = line.event?.title ?? line.item_name;

          return <tr key={line.id} className={`border-t ${remainingQty === 0 ? "bg-neutral-50 text-neutral-500" : ""}`}>
            <td className="px-5 py-4"><p className="font-medium">{itemName}</p><p className="text-xs text-neutral-600">{line.event ? new Date(line.event.starts_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : ""}</p>{remainingQty === 0 ? <span className="mt-1 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Refunded</span> : null}</td>
            <td className="px-5 py-4">{customer?.display_name ?? "Customer"}<br/><span className="text-xs text-neutral-600">{customer?.email ?? ""}</span></td>
            <td className="px-5 py-4"><p>{line.ticket?.name ?? "Ticket"} × {remainingQty}</p>{refundedQty > 0 ? <p className="text-xs text-red-700">{refundedQty} refunded</p> : null}</td>
            <td className="px-5 py-4"><p>£{(netPence / 100).toFixed(2)}</p>{refundedPence > 0 ? <p className="text-xs text-red-700">£{(refundedPence / 100).toFixed(2)} refunded</p> : null}</td>
            <td className="px-5 py-4"><p className="font-mono text-xs">{order.id.slice(0, 8)}</p><p className="mt-1 text-xs capitalize text-neutral-500">{order.refund_status === "none" ? "Paid" : `${order.refund_status} refund`}</p></td>
            <td className="px-5 py-4"><div className="flex min-w-36 flex-col items-start gap-2">
              <AppCoreRefundButton scope="order_line" orderId={order.id} orderLineId={line.id} label="Refund this event" itemName={itemName} amountPence={netPence} disabled={remainingQty === 0} />
              {lineIndex === 0 && orderRemainingPence > 0 ? <AppCoreRefundButton scope="order" orderId={order.id} label="Full order refund" itemName={`Entire order ${order.id.slice(0, 8)}`} amountPence={orderRemainingPence} /> : null}
            </div></td>
          </tr>;
        }))}</tbody></table>
      </div>
      {!orders.length ? <p className="mt-6 text-sm text-neutral-600">No paid bookings yet.</p> : null}
    </div>
  </main>;
}
