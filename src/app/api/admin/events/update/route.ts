import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  events,
  products,
  eventCategoryLinks,
} from "@/lib/db/schema";

import { eq } from "drizzle-orm";
import { getCurrentUserServer } from "@/lib/auth/actions";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserServer();

    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      id,
      title,
      subtitle,
      shortDescription,
      description,
      date,
      capacity,
      pricePence,
      published,
      imageUrl,
      categoryIds,
    } = await req.json();

    console.log("🔍 RAW DATE RECEIVED:", date);

    if (!id || !title || !date || !capacity || !pricePence) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    /* -----------------------------------------
       FETCH EXISTING EVENT
    ------------------------------------------ */
    const existing = (
      await db.select().from(events).where(eq(events.id, id)).limit(1)
    )[0];

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const productId = existing.productId;

    /* -----------------------------------------
       ⭐ STORE EXACT DATE AS TYPED  
       NO UTC. NO TIMEZONE. NO CONVERSION.
    ------------------------------------------ */

    // If datetime-local comes without seconds → add ":00"
const exact = date.length === 16 ? date + ":00" : date;

    // Validate format (just to prevent total nonsense)
    if (isNaN(new Date(exact).getTime())) {
      return NextResponse.json(
        { error: "Invalid datetime format" },
        { status: 400 }
      );
    }

    // ⭐ DO NOT use new Date().toISOString() — it changes the hour.
    // Just save the exact string with full seconds.
    const finalDate = exact; // e.g., "2025-11-23T18:00:00"

    /* -----------------------------------------
   UPDATE EVENT
------------------------------------------ */
await db
  .update(events)
  .set({
    title,
    subtitle: subtitle || null,
    shortDescription: shortDescription || null,
    description: description || "",

    date: finalDate,
    capacity: Number(capacity),
    pricePence: Number(pricePence),

    // ⭐ EVENTS table uses camelCase
    imageUrl: imageUrl || existing.imageUrl,

    published: Boolean(published),

    // ⭐ EVENTS table uses camelCase
    updatedAt: new Date().toISOString(),
  })
  .where(eq(events.id, id));


/* -----------------------------------------
   UPDATE PRODUCT
------------------------------------------ */
await db
  .update(products)
  .set({
    name: title,
    description: shortDescription || description || "",

    // ⭐ PRODUCTS table uses snake_case
    image_url: imageUrl || existing.imageUrl,

    metadata: {
      subtitle: subtitle || null,
      shortDescription: shortDescription || null,
      published: Boolean(published),
    },

    // ⭐ PRODUCTS table uses snake_case
    updated_at: new Date().toISOString(),
  })
  .where(eq(products.id, productId));



    /* -----------------------------------------
       UPDATE CATEGORY LINKS
    ------------------------------------------ */
    if (Array.isArray(categoryIds)) {
      await db
        .delete(eventCategoryLinks)
        .where(eq(eventCategoryLinks.eventId, id));

      if (categoryIds.length > 0) {
        const rows = categoryIds.map((catId: string) => ({
          id: crypto.randomUUID(),
          eventId: id,
          categoryId: catId,
        }));

        await db.insert(eventCategoryLinks).values(rows);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Event update error:", err);
    return NextResponse.json(
      { error: "Server error updating event" },
      { status: 500 }
    );
  }
}
