import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  events,
  products,
  users,
  eventCategoryLinks,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserServer } from "@/lib/auth/actions";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserServer();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [dbUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, user.id));

    if (!dbUser || (dbUser.role !== "admin" && dbUser.role !== "staff")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const {
      title,
      subtitle,
      shortDescription,
      description,
      date,
      capacity,
      pricePence,
      storeId,
      categoryIds,
      imageUrl,
      location,
      published = true,
    } = await req.json();

    if (!title || !date || !capacity || !pricePence || !storeId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    /* ------------------------------------------------
       1) ALWAYS CREATE A NEW PRODUCT FOR EACH EVENT
    ------------------------------------------------ */
    const productId = crypto.randomUUID();
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    await db.insert(products).values({
  id: productId,
  name: title,
  slug,
  description: shortDescription || description || "",
  price: String(Number(pricePence) / 100),

  product_type: "event",   // ⭐ FIXED
  metadata: {
    subtitle: subtitle || null,
    shortDescription: shortDescription || null,
    location: location || null,
    published: Boolean(published),
  },

  image_url: imageUrl || null, // ⭐ FIXED
  inventory_count: 999999,     // ⭐ FIXED
});


    /* ------------------------------------------------
       2) CREATE EVENT LINKED TO THIS PRODUCT
    ------------------------------------------------ */
    const eventId = crypto.randomUUID();

    const exact = date.length === 16 ? date + ":00" : date;

    await db.insert(events).values({
      id: eventId,
      productId, // ⭐ unique product per event
      title,
      description: description ?? "",
      date: exact,
      capacity: Number(capacity),
      pricePence: Number(pricePence),
      imageUrl: imageUrl ?? null,
      storeId,
      subtitle: subtitle || null,
      shortDescription: shortDescription || null,
      published: Boolean(published),
    });

    /* ------------------------------------------------
       3) CATEGORY LINKS
    ------------------------------------------------ */
    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      await db.insert(eventCategoryLinks).values(
        categoryIds.map((cat: string) => ({
          id: crypto.randomUUID(),
          eventId,
          categoryId: cat,
        }))
      );
    }

    return NextResponse.json({ ok: true, id: eventId });
  } catch (err) {
    console.error("❌ Event Creation Error:", err);
    return NextResponse.json({ error: "Server error creating event" }, { status: 500 });
  }
}
