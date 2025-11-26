import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, genres, events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

// ------------------------------------------------------
// LIST PRODUCTS (excluding event-linked Stripe products)
// ------------------------------------------------------
export async function GET() {
  // 1. Find all products that belong to events
  const eventRows = await db
    .select({ product_id: events.productId })
    .from(events);

  // Convert to Set for fast lookup
  const eventProductIds = new Set(eventRows.map((e) => e.product_id));

  // 2. Fetch all products with optional genre name
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      image_url: products.image_url,
      product_type: products.product_type,
      inventory_count: products.inventory_count,
      genre_name: genres.name,
    })
    .from(products)
    .leftJoin(genres, eq(products.genre_id, genres.id));

  // 3. Remove event-linked products
  const filtered = rows.filter((p) => !eventProductIds.has(p.id));

  return NextResponse.json({ products: filtered });
}

// ------------------------------------------------------
// CREATE PRODUCT
// ------------------------------------------------------
export async function POST(req: Request) {
  const body = await req.json();

  const id = uuid();

  await db.insert(products).values({
    id,
    name: body.name,
    slug: body.slug,
    description: body.description ?? "",
    price: String(body.price),
    image_url: body.image_url ?? null,
    genre_id: body.genre_id ?? null,

    // Product type (book, coffee, merch, blind-date, etc.)
    product_type: body.product_type ?? "general",

    // Book-specific fields
    author: body.author ?? null,
    format: body.format ?? null,
    language: body.language ?? null,

    // Metadata for coffee, blind-date, and others
    metadata: body.metadata ? JSON.stringify(body.metadata) : "{}",

    // Inventory & subscription options
    inventory_count: Number(body.inventory_count) || 0,
    is_subscription: Boolean(body.is_subscription) || false,

    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, id });
}
