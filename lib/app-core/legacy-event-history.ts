import "server-only";

import { appCoreDb } from "@/lib/app-core/service";

export type LegacyEventBooking = {
  id: string;
  title: string;
  starts_at: string;
  quantity: number;
  cancelled: boolean;
  refunded: boolean;
};

export async function getLegacyEventBookings(authUserId: string): Promise<LegacyEventBooking[]> {
  const { data, error } = await appCoreDb()
    .schema("public")
    .from("event_bookings")
    .select("id, created_at, quantity, cancelled, refunded, events!inner(title, date, is_test)")
    .eq("user_id_uuid", authUserId)
    .eq("paid", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Could not load previous event bookings");

  const now = Date.now();
  return (data ?? []).flatMap((booking: any) => {
    const event = Array.isArray(booking.events) ? booking.events[0] : booking.events;
    if (!event || event.is_test || new Date(event.date).getTime() >= now) return [];
    return [{
      id: booking.id,
      title: event.title,
      starts_at: event.date,
      quantity: Number(booking.quantity ?? 1),
      cancelled: Boolean(booking.cancelled),
      refunded: Boolean(booking.refunded),
    }];
  });
}
