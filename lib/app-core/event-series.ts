import "server-only";

import { appCoreDb } from "./service";

export async function getPublicEventSeries(slug: string) {
  const db = appCoreDb();
  const { data: series, error } = await db.from("event_series").select("id,slug,name,short_description,description,image_url,seo_title,seo_description").eq("slug", slug).eq("is_public", true).maybeSingle();
  if (error || !series) return null;
  const { data: events, error: eventError } = await db.from("events").select("id,slug,title,subtitle,short_description,starts_at,capacity,image_url,status").eq("series_id", series.id).eq("status", "published").order("starts_at", { ascending: true });
  if (eventError) throw new Error("Unable to load event series");
  return { ...series, events: events ?? [] };
}

export async function listPublicEventSeries() {
  const { data, error } = await appCoreDb().from("event_series").select("id,slug,name,short_description,description,image_url").eq("is_public", true).order("name");
  if (error) throw new Error("Unable to load event series");
  return data ?? [];
}
