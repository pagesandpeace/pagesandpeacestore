import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Mail, RotateCcw, TriangleAlert } from "lucide-react";

import { getCustomerEventOrders } from "@/lib/app-core/event-orders";
import { supabaseAuthServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function money(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

function StatusIcon({ refundStatus }: { refundStatus: string }) {
  if (refundStatus === "full") {
    return <span title="Fully refunded" aria-label="Fully refunded" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-700"><RotateCcw size={17} aria-hidden="true" /></span>;
  }
  if (refundStatus === "partial") {
    return <span title="Partially refunded" aria-label="Partially refunded" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-800"><TriangleAlert size={17} aria-hidden="true" /></span>;
  }
  return <span title="Paid" aria-label="Paid" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={17} aria-hidden="true" /></span>;
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const orders = await getCustomerEventOrders(user.id);
  const order = orders.find((candidate) => candidate.id === id);
  if (!order) notFound();

  const originalPayment = order.lines.reduce((total, line) => total + Number(line.quantity) * Number(line.unit_amount_pence), 0);
  const refunded = order.lines.reduce((total, line) => total + Number(line.refunded_amount_pence ?? 0), 0);
  const netPaid = Math.max(0, originalPayment - refunded);

  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-12 text-[#111]">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard/orders" className="text-sm underline">← Order history</Link>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Order #{order.id.slice(0, 8)}</h1>
            <p className="mt-1 text-sm text-neutral-600">Placed {new Date(order.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
          <StatusIcon refundStatus={order.refund_status} />
        </div>

        <section className="mt-8 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b bg-[#F3ECE5] px-5 py-4">
            <h2 className="font-semibold">Event tickets</h2>
          </div>

          <div className="divide-y">
            {order.lines.map((line) => {
              const refundedQty = Number(line.refunded_quantity ?? 0);
              const remainingQty = Math.max(0, Number(line.quantity) - refundedQty);
              const gross = Number(line.quantity) * Number(line.unit_amount_pence);
              const lineRefunded = Number(line.refunded_amount_pence ?? 0);
              const lineNet = Math.max(0, gross - lineRefunded);

              return (
                <article key={line.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{line.event?.title ?? line.item_name}</p>
                      {line.event ? <p className="mt-1 text-sm text-neutral-600">{new Date(line.event.starts_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p> : null}
                      <p className="mt-1 text-sm text-neutral-700">{line.ticket?.name ?? "Ticket"} × {line.quantity}</p>
                      <p className="mt-1 text-xs text-neutral-500">{remainingQty} active{refundedQty > 0 ? ` · ${refundedQty} refunded` : ""}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold">{money(gross)}</p>
                      {lineRefunded > 0 ? <p className="mt-1 text-red-700">−{money(lineRefunded)} refunded</p> : null}
                      {lineRefunded > 0 ? <p className="mt-1 text-xs text-neutral-500">Net {money(lineNet)}</p> : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex justify-between gap-4 text-sm"><span className="text-neutral-600">Original payment</span><strong>{money(originalPayment)}</strong></div>
          {refunded > 0 ? <div className="mt-2 flex justify-between gap-4 text-sm text-red-700"><span>Refunded</span><strong>−{money(refunded)}</strong></div> : null}
          <div className="mt-3 flex justify-between gap-4 border-t pt-3"><span className="font-medium">Net paid</span><strong>{money(netPaid)}</strong></div>
          {refunded > 0 ? <p className="mt-3 text-xs text-neutral-500">Refunds are returned to the original payment method. Your bank or card provider may take a few working days to display the credit.</p> : null}
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/contact?order=${encodeURIComponent(order.id)}`} className="inline-flex items-center gap-2 rounded-full border-2 border-accent px-5 py-2.5 text-sm font-semibold text-accent">
            <Mail size={17} aria-hidden="true" /> Contact Pages &amp; Peace
          </Link>
          <Link href="/dashboard/orders" className="inline-flex items-center rounded-full border px-5 py-2.5 text-sm font-semibold">Back to orders</Link>
        </div>
      </div>
    </main>
  );
}
