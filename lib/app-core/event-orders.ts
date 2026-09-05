import "server-only";

import { appCoreDb } from "@/lib/app-core/service";

type OrderRow = { id: string; auth_user_id: string; status: string; total_pence: number; currency: string; created_at: string };
type LineRow = { id: string; order_id: string; item_name: string; quantity: number; unit_amount_pence: number; ticket_type_id: string | null };
type BookingRow = { id: string; order_line_id: string; event_id: string; ticket_type_id: string; auth_user_id: string; quantity: number; status: string; created_at: string };
type EventRow = { id: string; title: string; series_name: string | null; starts_at: string };
type TicketRow = { id: string; name: string };
type CustomerRow = { auth_user_id: string; email: string; display_name: string | null };

export type EventOrder = OrderRow & {
  lines: Array<LineRow & { booking?: BookingRow; event?: EventRow; ticket?: TicketRow }>;
};

async function loadEventOrders(authUserId?: string) {
  const db = appCoreDb();
  let query = db.from("orders").select("id, auth_user_id, status, total_pence, currency, created_at").eq("status", "paid");
  if (authUserId) query = query.eq("auth_user_id", authUserId);
  const { data: orders, error } = await query.order("created_at", { ascending: false }).limit(1000);
  if (error) throw new Error("Could not load event orders");

  const typedOrders = (orders ?? []) as OrderRow[];
  const orderIds = typedOrders.map((order) => order.id);
  if (!orderIds.length) return { orders: [] as EventOrder[], customers: new Map<string, CustomerRow>() };

  const { data: lines } = await db.from("order_lines").select("id, order_id, item_name, quantity, unit_amount_pence, ticket_type_id").in("order_id", orderIds);
  const typedLines = (lines ?? []) as LineRow[];
  const lineIds = typedLines.map((line) => line.id);

  const { data: bookings } = lineIds.length
    ? await db.from("bookings").select("id, order_line_id, event_id, ticket_type_id, auth_user_id, quantity, status, created_at").in("order_line_id", lineIds).eq("status", "confirmed")
    : { data: [] };
  const typedBookings = (bookings ?? []) as BookingRow[];

  const eventIds = [...new Set(typedBookings.map((booking) => booking.event_id))];
  const ticketIds = [...new Set(typedBookings.map((booking) => booking.ticket_type_id))];
  const customerIds = [...new Set(typedOrders.map((order) => order.auth_user_id))];

  const [{ data: events }, { data: tickets }, { data: customers }] = await Promise.all([
    eventIds.length ? db.from("events").select("id, title, series_name, starts_at").in("id", eventIds) : Promise.resolve({ data: [] }),
    ticketIds.length ? db.from("ticket_types").select("id, name").in("id", ticketIds) : Promise.resolve({ data: [] }),
    customerIds.length ? db.from("customers").select("auth_user_id, email, display_name").in("auth_user_id", customerIds) : Promise.resolve({ data: [] }),
  ]);

  const bookingsByLine = new Map(typedBookings.map((booking) => [booking.order_line_id, booking]));
  const eventsById = new Map(((events ?? []) as EventRow[]).map((event) => [event.id, event]));
  const ticketsById = new Map(((tickets ?? []) as TicketRow[]).map((ticket) => [ticket.id, ticket]));
  const customersById = new Map(((customers ?? []) as CustomerRow[]).map((customer) => [customer.auth_user_id, customer]));

  return {
    orders: typedOrders.map((order) => ({
      ...order,
      lines: typedLines.filter((line) => line.order_id === order.id).map((line) => {
        const booking = bookingsByLine.get(line.id);
        return { ...line, booking, event: booking ? eventsById.get(booking.event_id) : undefined, ticket: booking ? ticketsById.get(booking.ticket_type_id) : undefined };
      }),
    })),
    customers: customersById,
  };
}

export async function getCustomerEventOrders(authUserId: string) {
  const result = await loadEventOrders(authUserId);
  return result.orders;
}

export async function getAdminEventOrders() {
  return loadEventOrders();
}
