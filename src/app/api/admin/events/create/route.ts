import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, users, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserServer } from "@/lib/auth/actions";
import crypto from "crypto";

/**
 * POST /api/admin/events/create
 * Creates a new event (admin/staff only)
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUserServer();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin/staff role
    const [dbUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser || (dbUser.role !== "admin" && dbUser.role !== "staff")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse payload
    const { title, description, date, capacity, pricePence } = await req.json();

    if (!title || !date || !capacity || !pricePence) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ---------------------------------------------
    // 1️⃣ CREATE PRODUCT FIRST (Shopify model)
    // ---------------------------------------------
    const productId = crypto.randomUUID();
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    await db.insert(products).values({
      id: productId,
      name: title,
      slug,
      description: description ?? "",
      price: Number(pricePence) / 100,           // decimal £
      productType: "event",                      // NEW TYPE
      metadata: {},                              // optional data
      imageUrl: null,
      inventoryCount: 999999,                    // effectively unlimited
    });

    // ---------------------------------------------
    // 2️⃣ CREATE EVENT AND LINK IT TO PRODUCT
    // ---------------------------------------------
    const eventId = crypto.randomUUID();

    await db.insert(events).values({
      id: eventId,
      productId,
      title,
      description: description || "",
      date: new Date(date),
      capacity: Number(capacity),
      pricePence: Number(pricePence),
      imageUrl: null,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, id: eventId });
  } catch (err) {
    console.error("❌ Event Creation Error:", err);
    return NextResponse.json(
      { error: "Server error creating event" },
      { status: 500 }
    );
  }
}
