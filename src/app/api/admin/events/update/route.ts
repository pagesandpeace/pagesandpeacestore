import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  events,
  products,
  eventCategoryLinks,
} from "@/lib/db/schema";

import { eq, and } from "drizzle-orm";
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

    if (!id || !title || !date || !capacity || !pricePence) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    /* -----------------------------------------
       FETCH EXISTING EVENT TO GET productId
    ------------------------------------------ */
    const existing = (
      await db.select().from(events).where(eq(events.id, id)).limit(1)
    )[0];

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const productId = existing.productId;

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
        date: new Date(
  new Date(date).toLocaleString("en-GB", { timeZone: "Europe/London" })
).toISOString(),

        capacity: Number(capacity),
        pricePence: Number(pricePence),
        imageUrl: imageUrl || existing.imageUrl,
        published: Boolean(published),
        updatedAt: new Date().toISOString()
      })
      .where(eq(events.id, id));

    /* -----------------------------------------
       UPDATE PRODUCT (MIRROR EVENT FIELDS)
    ------------------------------------------ */
    await db
      .update(products)
      .set({
        name: title,
        description: shortDescription || description || "",
        imageUrl: imageUrl || existing.imageUrl,
        metadata: {
          subtitle: subtitle || null,
          shortDescription: shortDescription || null,
          published: Boolean(published),
        },
        updatedAt: new Date().toISOString()
      })
      .where(eq(products.id, productId));

    /* -----------------------------------------
       UPDATE CATEGORY LINKS
    ------------------------------------------ */
    if (Array.isArray(categoryIds)) {
      // Remove old links
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
