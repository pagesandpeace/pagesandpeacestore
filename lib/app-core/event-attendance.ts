import "server-only";

import { appCoreDb } from "@/lib/app-core/service";

export type EventAttendanceRow = {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  ticketType: string;
  activeQuantity: number;
  bookingStatus: "confirmed";
  salesChannel: "online";
};

export type EventAttendanceSummary = {
  attendees: number;
  bookings: number;
};

/**
 * Canonical operational attendance for an event. A booking represents a line
 * item, so the attendee count is its confirmed quantity less any line-level
 * refunded quantity. Fully refunded and cancelled bookings are intentionally
 * omitted rather than shown as people expected at the door.
 */
export async function getEventAttendance(eventId: string): Promise<{
  rows: EventAttendanceRow[];
  summary: EventAttendanceSummary;
}> {
  const db = appCoreDb();
  const { data: bookings, error: bookingsError } = await db
    .from("bookings")
    .select("id, order_line_id, ticket_type_id, auth_user_id, quantity, status, customer_name, customer_email")
    .eq("event_id", eventId)
    .eq("status", "confirmed");

  if (bookingsError) throw new Error("Unable to load event attendance");

  const confirmedBookings = bookings ?? [];
  const lineIds = confirmedBookings.map((booking) => booking.order_line_id);
  const ticketTypeIds = [...new Set(confirmedBookings.map((booking) => booking.ticket_type_id))];
  const customerIds = [...new Set(confirmedBookings.map((booking) => booking.auth_user_id))];

  const [{ data: lines, error: linesError }, { data: ticketTypes, error: ticketTypesError }, { data: customers, error: customersError }] = await Promise.all([
    lineIds.length ? db.from("order_lines").select("id, refunded_quantity").in("id", lineIds) : Promise.resolve({ data: [], error: null }),
    ticketTypeIds.length ? db.from("ticket_types").select("id, name").in("id", ticketTypeIds) : Promise.resolve({ data: [], error: null }),
    customerIds.length ? db.from("customers").select("auth_user_id, display_name, email").in("auth_user_id", customerIds) : Promise.resolve({ data: [], error: null }),
  ]);

  if (linesError || ticketTypesError || customersError) {
    throw new Error("Unable to load attendance details");
  }

  const refundedByLine = new Map((lines ?? []).map((line) => [line.id, Number(line.refunded_quantity ?? 0)]));
  const ticketById = new Map((ticketTypes ?? []).map((ticket) => [ticket.id, ticket.name]));
  const customerById = new Map((customers ?? []).map((customer) => [customer.auth_user_id, customer]));

  const rows = confirmedBookings.flatMap((booking): EventAttendanceRow[] => {
    const activeQuantity = Math.max(0, Number(booking.quantity) - (refundedByLine.get(booking.order_line_id) ?? 0));
    if (!activeQuantity) return [];

    const customer = customerById.get(booking.auth_user_id);
    return [{
      bookingId: booking.id,
      customerName: booking.customer_name || customer?.display_name || "Guest",
      customerEmail: booking.customer_email || customer?.email || "",
      ticketType: ticketById.get(booking.ticket_type_id) || "Ticket",
      activeQuantity,
      bookingStatus: "confirmed",
      salesChannel: "online",
    }];
  }).sort((a, b) => a.customerName.localeCompare(b.customerName));

  return {
    rows,
    summary: { attendees: rows.reduce((total, row) => total + row.activeQuantity, 0), bookings: rows.length },
  };
}
