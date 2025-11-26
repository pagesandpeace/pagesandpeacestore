import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  events,
  products,
  eventCategoryLinks,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { originalEventId, title, date, pricePence, categoryIds } = body;

    const [original] = await db
      .select()
      .from(events)
      .where(eq(events.id, originalEventId));

    if (!original) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    /* ------------------------------------------------
       1) NEW PRODUCT
    ------------------------------------------------ */
    const newProductId = crypto.randomUUID();

    const safePrice = (Number(pricePence) / 100).toFixed(2);

    await db.insert(products).values({
  id: newProductId,
  name: title,
  slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  description: original.shortDescription || original.description || "",
  price: safePrice,

  product_type: "event",            // ⭐ FIXED
  image_url: original.imageUrl,     // ⭐ FIXED
  metadata: {
    subtitle: original.subtitle,
    shortDescription: original.shortDescription,
    published: original.published,
  },
  inventory_count: 999999,          // ⭐ FIXED
});


    /* ------------------------------------------------
       2) NEW EVENT
    ------------------------------------------------ */
    const [inserted] = await db
      .insert(events)
      .values({
        id: crypto.randomUUID(),
        productId: newProductId,
        title,
        description: original.description,
        subtitle: original.subtitle,
        shortDescription: original.shortDescription,
        date,
        capacity: original.capacity,
        pricePence,
        imageUrl: original.imageUrl,
        storeId: original.storeId,
        published: original.published,
      })
      .returning();

    /* ------------------------------------------------
       3) CATEGORY LINKS — SAFE GUARD
    ------------------------------------------------ */
    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      // Ensure IDs are valid UUIDs
      const safeCategories = categoryIds.filter((id: string) =>
        /^[0-9a-fA-F-]{36}$/.test(id)
      );

      if (safeCategories.length > 0) {
        await db.insert(eventCategoryLinks).values(
          safeCategories.map((id: string) => ({
            id: crypto.randomUUID(),
            eventId: inserted.id,
            categoryId: id,
          }))
        );
      }
    }

    return NextResponse.json({ ok: true, newEventId: inserted.id });
  } catch (err) {
  const message =
    err instanceof Error
      ? err.message
      : "Unknown error";

  console.error("❌ Duplicating event failed:", err);

  return NextResponse.json(
    { error: message },
    { status: 500 }
    );
  }
}
