import Link from "next/link";
import { redirect } from "next/navigation";

import EventOrdersTable from "@/components/admin/event-orders-table";
import { getAdminEventOrders } from "@/lib/app-core/event-orders";
import { requireAdminUser } from "@/lib/auth/require-admin-user";

export const dynamic = "force-dynamic";

export default async function AdminEventBookingsPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/sign-in");

  const { orders, customers } = await getAdminEventOrders();
  const groupedOrders = orders.map((order) => {
    const customer = order.auth_user_id ? customers.get(order.auth_user_id) : undefined;
    return {
      id: order.id,
      created_at: order.created_at,
      total_pence: Number(order.total_pence),
      refunded_total_pence: Number(order.refunded_total_pence ?? 0),
      refund_status: order.refund_status ?? "none",
      customerName: customer?.display_name ?? "Customer",
      customerEmail: customer?.email ?? "",
      lines: order.lines.map((line) => ({
        id: line.id,
        item_name: line.item_name,
        quantity: Number(line.quantity),
        unit_amount_pence: Number(line.unit_amount_pence),
        refunded_quantity: Number(line.refunded_quantity ?? 0),
        refunded_amount_pence: Number(line.refunded_amount_pence ?? 0),
        eventTitle: line.event?.title ?? line.item_name,
        eventStartsAt: line.event?.starts_at ?? null,
        ticketName: line.ticket?.name ?? "Ticket",
      })),
    };
  });

  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-12 text-[#111]">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="text-sm underline">← Admin dashboard</Link>
        <h1 className="mt-4 text-3xl font-semibold">Event orders & refunds</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Each row is one customer purchase. Open an order to see the events inside it, refund one event, or refund the remaining order in full.
        </p>

        <div className="mt-8">
          <EventOrdersTable orders={groupedOrders} />
        </div>

        {!orders.length ? <p className="mt-6 text-sm text-neutral-600">No paid event orders yet.</p> : null}
      </div>
    </main>
  );
}
