import "server-only";

import { appCoreDb } from "./service";

export type CoreEvent = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  short_description: string | null;
  description: string;
  starts_at: string;
  capacity: number;
  image_url: string | null;
};

export type CoreTicketType = {
  id: string;
  name: string;
  description: string | null;
  price_pence: number;
  capacity: number | null;
};

async function confirmedSeats(eventId: string) {
  const db = appCoreDb();
  const { data, error } = await db
    .from("bookings")
    .select("quantity")
    .eq("event_id", eventId)
    .in("status", ["pending", "confirmed"]);

  if (error) throw new Error("Unable to load event availability");
  return (data ?? []).reduce((total, booking) => total + booking.quantity, 0);
}

export async function listPublishedEvents() {
  const db = appCoreDb();
  const { data, error } = await db
    .from("events")
    .select("id, slug, title, subtitle, short_description, starts_at, capacity, image_url")
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (error) throw new Error("Unable to load events");

  return Promise.all(
    (data ?? []).map(async (event) => ({
      ...event,
      remaining_seats: Math.max(event.capacity - (await confirmedSeats(event.id)), 0),
    }))
  );
}

export async function getPublishedEvent(slug: string) {
  const db = appCoreDb();
  const { data: event, error } = await db
    .from("events")
    .select("id, slug, title, subtitle, short_description, description, starts_at, capacity, image_url")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !event) return null;

  const { data: ticketTypes, error: ticketError } = await db
    .from("ticket_types")
    .select("id, name, description, price_pence, capacity")
    .eq("event_id", event.id)
    .eq("is_active", true)
    .order("price_pence", { ascending: true });

  if (ticketError) throw new Error("Unable to load ticket types");

  return {
    ...event,
    ticket_types: ticketTypes ?? [],
    remaining_seats: Math.max(event.capacity - (await confirmedSeats(event.id)), 0),
  };
}
