"use client";

import { useState } from "react";
import AppCoreRefundButton from "@/components/admin/app-core-refund-button";

type Line = {
  id: string;
  item_name: string;
  quantity: number;
  unit_amount_pence: number;
  refunded_quantity: number;
  refunded_amount_pence: number;
  eventTitle: string;
  eventStartsAt: string | null;
  ticketName: string;
};

type Order = {
  id: string;
  created_at: string;
  total_pence: number;
  refunded_total_pence: number;
  refund_status: string;
  customerName: string;
  customerEmail: string;
  lines: Line[];
};

export default function EventOrdersTable({ orders }: { orders: Order[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F3ECE5] text-xs uppercase tracking-wide text-neutral-600">
            <tr>
              <th className="px-5 py-3">Order</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Purchased</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Refunded</th><th className="px-5 py-3">Net</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const isOpen = expanded === order.id;
              const refunded = Number(order.refunded_total_pence ?? 0);
              const net = Math.max(0, Number(order.total_pence) - refunded);
              const eventCount = order.lines.length;
              const ticketCount = order.lines.reduce((sum, line) => sum + Math.max(0, line.quantity - Number(line.refunded_quantity ?? 0)), 0);
              return [
                <tr key={`${order.id}-summary`} className="border-t align-top">
                  <td className="px-5 py-4"><p className="font-mono text-xs font-semibold">{order.id.slice(0, 8)}</p><p className="mt-1 text-xs text-neutral-500">{new Date(order.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p></td>
                  <td className="px-5 py-4"><p className="font-medium">{order.customerName}</p><p className="text-xs text-neutral-500">{order.customerEmail}</p></td>
                  <td className="px-5 py-4"><p>{eventCount} event{eventCount === 1 ? "" : "s"}</p><p className="text-xs text-neutral-500">{ticketCount} active ticket{ticketCount === 1 ? "" : "s"}</p></td>
                  <td className="px-5 py-4 font-medium">£{(order.total_pence / 100).toFixed(2)}</td>
                  <td className="px-5 py-4 text-red-700">{refunded > 0 ? `£${(refunded / 100).toFixed(2)}` : "—"}</td>
                  <td className="px-5 py-4 font-semibold">£{(net / 100).toFixed(2)}</td>
                  <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${order.refund_status === "full" ? "bg-red-100 text-red-700" : order.refund_status === "partial" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>{order.refund_status === "full" ? "Fully refunded" : order.refund_status === "partial" ? "Partially refunded" : "Paid"}</span></td>
                  <td className="px-5 py-4 text-right"><button type="button" onClick={() => setExpanded(isOpen ? null : order.id)} className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-neutral-50">{isOpen ? "Close" : "View / refund"}</button></td>
                </tr>,
                isOpen ? <tr key={`${order.id}-detail`} className="border-t bg-[#FBF8F4]"><td colSpan={8} className="px-5 py-5">
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-base font-semibold">Items in order {order.id.slice(0, 8)}</h3><p className="mt-1 text-xs text-neutral-500">Refund individual ticket quantities within an event, or refund the whole remaining order.</p></div>{net > 0 ? <AppCoreRefundButton scope="order" orderId={order.id} label="Refund remaining order" itemName={`Order ${order.id.slice(0, 8)}`} amountPence={net} /> : null}</div>
                    <div className="grid gap-3">
                      {order.lines.map((line) => {
                        const refundedQty = Number(line.refunded_quantity ?? 0);
                        const remainingQty = Math.max(0, Number(line.quantity) - refundedQty);
                        const gross = Number(line.quantity) * Number(line.unit_amount_pence);
                        const lineRefunded = Number(line.refunded_amount_pence ?? 0);
                        const lineNet = Math.max(0, gross - lineRefunded);
                        return <div key={line.id} className="rounded-xl border bg-white p-4"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{line.eventTitle}</p>{remainingQty === 0 ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Refunded</span> : refundedQty > 0 ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Partially refunded</span> : null}</div>{line.eventStartsAt ? <p className="mt-1 text-xs text-neutral-500">{new Date(line.eventStartsAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p> : null}<p className="mt-1 text-sm text-neutral-700">{line.ticketName} × {line.quantity}</p><p className="mt-1 text-xs text-neutral-500">{remainingQty} active · {refundedQty} refunded</p><p className="mt-1 text-xs text-neutral-500">Original £{(gross / 100).toFixed(2)}{lineRefunded > 0 ? ` · Refunded £${(lineRefunded / 100).toFixed(2)} · Net £${(lineNet / 100).toFixed(2)}` : ""}</p></div>
                          <div className="shrink-0"><AppCoreRefundButton scope="order_line" orderId={order.id} orderLineId={line.id} label={remainingQty === 0 ? "Already refunded" : remainingQty > 1 ? "Refund ticket(s)" : "Refund ticket"} itemName={line.eventTitle} amountPence={lineNet} unitAmountPence={line.unit_amount_pence} maxQuantity={remainingQty} disabled={remainingQty === 0} /></div>
                        </div></div>;
                      })}
                    </div>
                  </div>
                </td></tr> : null,
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
