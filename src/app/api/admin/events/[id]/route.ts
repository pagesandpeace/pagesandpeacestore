import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  events,
  products,
  stores,
  eventCategoryLinks,
  eventCategories,
  users,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserServer } from "@/lib/auth/actions";

export const dynamic = "force-dynamic";

/* ---------------------------------------------------------
   GET /api/admin/events/[id]
   Fetch full event record (event + product + store + categories)
--------------------------------------------------------- */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }   // ⭐ FIXED: params must be awaited
) {
  try {
    // ⭐ FIXED: required in Next.js 15 dynamic routes
    const { id: eventId } = await context.params;

    const user = await getCurrentUserServer();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, user.id));

    if (!dbUser || (dbUser.role !== "admin" && dbUser.role !== "staff")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* ---------------------------------------------------------
       1. Fetch Event + Product + Store
    --------------------------------------------------------- */
    const rows = await db
      .select({
        // event
        eventId: events.id,
        eventTitle: events.title,
        eventSubtitle: events.subtitle,
        eventShortDescription: events.shortDescription,
        eventDescription: events.description,
        eventDate: events.date,
        eventCapacity: events.capacity,
        eventPricePence: events.pricePence,
        eventImageUrl: events.imageUrl,
        eventPublished: events.published,

        // product
        productId: products.id,
        productName: products.name,
        productSlug: products.slug,
        productDescription: products.description,
        productPrice: products.price,
        productImageUrl: products.imageUrl,
        productType: products.productType,
        productMetadata: products.metadata,

        // store
        storeId: stores.id,
        storeName: stores.name,
        storeAddress: stores.address,
        storeChapter: stores.chapter,
        storeCode: stores.code,
      })
      .from(events)
      .innerJoin(products, eq(products.id, events.productId))
      .innerJoin(stores, eq(stores.id, events.storeId))
      .where(eq(events.id, eventId));

    if (rows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const base = rows[0];

    /* ---------------------------------------------------------
       2. Fetch Categories
    --------------------------------------------------------- */
    const categoryRows = await db
      .select({
        id: eventCategories.id,
        name: eventCategories.name,
        slug: eventCategories.slug,
      })
      .from(eventCategoryLinks)
      .innerJoin(
        eventCategories,
        eq(eventCategories.id, eventCategoryLinks.categoryId)
      )
      .where(eq(eventCategoryLinks.eventId, eventId));

    /* ---------------------------------------------------------
       3. Build Response
    --------------------------------------------------------- */
    const response = {
      id: base.eventId,
      title: base.eventTitle,
      subtitle: base.eventSubtitle,
      shortDescription: base.eventShortDescription,
      description: base.eventDescription,
      date: base.eventDate,
      capacity: base.eventCapacity,
      pricePence: base.eventPricePence,
      imageUrl: base.eventImageUrl,
      published: base.eventPublished,

      product: {
        id: base.productId,
        name: base.productName,
        slug: base.productSlug,
        description: base.productDescription,
        price: base.productPrice,
        imageUrl: base.productImageUrl,
        productType: base.productType,
        metadata: base.productMetadata,
      },

      store: {
        id: base.storeId,
        name: base.storeName,
        chapter: base.storeChapter,
        address: base.storeAddress,
        code: base.storeCode,
      },

      categories: categoryRows,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("❌ [admin/event detail] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}
