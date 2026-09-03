import { NextResponse } from "next/server";

import { appCoreDb } from "@/lib/app-core/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { ticketTypeIds?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 }); }
  const ids = Array.isArray(body.ticketTypeIds) ? body.ticketTypeIds.filter((id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)).slice(0, 20) : [];
  if (!ids.length) return NextResponse.json({ items: [] });

  const db = appCoreDb();
  const { data, error } = await db
    .from("ticket_types")
    .select("id, name, price_pence, is_active, events!inner(title, slug, status, starts_at)")
    .in("id", ids)
    .eq("is_active", true)
    .eq("events.status", "published")
    .gt("events.starts_at", new Date().toISOString());

  if (error) return NextResponse.json({ error: "BASKET_UNAVAILABLE" }, { status: 503 });
  return NextResponse.json({ items: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
