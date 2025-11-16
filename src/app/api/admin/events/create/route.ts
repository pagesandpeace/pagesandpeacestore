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
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // -------------------------------
    // 1) Create Product
    // -------------------------------
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
      productType: "event",
      metadata: {
        subtitle: subtitle || null,
        shortDescription: shortDescription || null,
        location: location || null,
        published: Boolean(published),
      },
      imageUrl: imageUrl || null,
      inventoryCount: 999999,
    });

    // -------------------------------
    // 2) Create Event (NO TIMEZONE)
    // -------------------------------
    const eventId = crypto.randomUUID();

    // If datetime-local comes without seconds → add ":00"
    const exact =
      date.length === 16 ? date + ":00" : date;

    if (isNaN(new Date(exact).getTime())) {
      return NextResponse.json(
        { error: "Invalid datetime value" },
        { status: 400 }
      );
    }

    await db.insert(events).values({
      id: eventId,
      productId,
      title,
      description: description ?? "",
      date: exact, // ⭐ EXACT VALUE, NO SHIFTING
      capacity: Number(capacity),
      pricePence: Number(pricePence),
      imageUrl: imageUrl ?? null,
      storeId,
      subtitle: subtitle || null,
      shortDescription: shortDescription || null,
      published: Boolean(published),
    });

    // -------------------------------
    // 3) Category Links
    // -------------------------------
    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      const rows = categoryIds.map((catId: string) => ({
        id: crypto.randomUUID(),
        eventId,
        categoryId: catId,
      }));

      await db.insert(eventCategoryLinks).values(rows);
    }

    return NextResponse.json({ ok: true, id: eventId });
  } catch (err: any) {
    console.error("❌ Event Creation Error:", err);
    return NextResponse.json(
      { error: "Server error creating event" },
      { status: 500 }
    );
  }
}
