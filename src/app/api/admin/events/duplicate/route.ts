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
     1) NEW PRODUCT FOR DUPLICATED EVENT
  ------------------------------------------------ */
  const newProductId = crypto.randomUUID();

  await db.insert(products).values({
    id: newProductId,
    name: title,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    description: original.shortDescription || original.description || "",
    price: String(Number(pricePence) / 100),
    productType: "event",
    imageUrl: original.imageUrl,
    metadata: {
      subtitle: original.subtitle,
      shortDescription: original.shortDescription,
      published: original.published,
    },
    inventoryCount: 999999,
  });

  /* ------------------------------------------------
     2) NEW EVENT USING THIS PRODUCT
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
     3) CATEGORY LINKS
  ------------------------------------------------ */
  if (categoryIds?.length) {
    await db.insert(eventCategoryLinks).values(
      categoryIds.map((id: string) => ({
        id: crypto.randomUUID(),
        eventId: inserted.id,
        categoryId: id,
      }))
    );
  }

  return NextResponse.json({ ok: true, newEventId: inserted.id });
}
