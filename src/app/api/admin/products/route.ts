import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, genres, events } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

/* ------------------------------------------------------
   GET /api/admin/products
   Search, filter, pagination, exclude event products
------------------------------------------------------ */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");
  const search = searchParams.get("search") ?? "";
  const type = searchParams.get("type") ?? "all";

  const offset = (page - 1) * limit;

  /* ------------------------------------------------------
     1. Exclude event-linked products
  ------------------------------------------------------ */
  const eventRows = await db
    .select({ product_id: events.productId })
    .from(events);

  const eventProductIds = new Set(eventRows.map((e) => e.product_id));

  /* ------------------------------------------------------
     2. Build search filters
  ------------------------------------------------------ */
  const filters = [];

  if (search) {
    const s = `%${search}%`;

    filters.push(
      sql`(
        ${products.name} ILIKE ${s}
        OR ${products.slug} ILIKE ${s}
        OR ${genres.name} ILIKE ${s}

        -- BOOKS
        OR ${products.author} ILIKE ${s}
        OR (${products.metadata}::jsonb ->> 'isbn') ILIKE ${s}

        -- COFFEE
        OR (${products.metadata}::jsonb ->> 'roast') ILIKE ${s}
        OR (${products.metadata}::jsonb ->> 'origin') ILIKE ${s}
        OR (${products.metadata}::jsonb ->> 'weight') ILIKE ${s}

        -- BLIND DATE
        OR (${products.metadata}::jsonb ->> 'theme') ILIKE ${s}
        OR (${products.metadata}::jsonb ->> 'colour') ILIKE ${s}
        OR (${products.metadata}::jsonb ->> 'vibe') ILIKE ${s}

        -- MERCH
        OR (${products.metadata}::jsonb ->> 'size') ILIKE ${s}
        OR (${products.metadata}::jsonb ->> 'material') ILIKE ${s}
      )`
    );
  }

  if (type !== "all") {
    filters.push(eq(products.product_type, type));
  }

  const whereClause = filters.length ? and(...filters) : undefined;

  /* ------------------------------------------------------
     3. Count rows (for pagination)
  ------------------------------------------------------ */
  const totalResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(products)
    .leftJoin(genres, eq(products.genre_id, genres.id))
    .where(whereClause);

  const total = Number(totalResult[0].count);

  /* ------------------------------------------------------
     4. Fetch product rows
  ------------------------------------------------------ */
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      image_url: products.image_url,
      product_type: products.product_type,
      inventory_count: products.inventory_count,
      metadata: products.metadata,
      genre_name: genres.name,
      author: products.author,
    })
    .from(products)
    .leftJoin(genres, eq(products.genre_id, genres.id))
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(products.name);

  /* ------------------------------------------------------
     5. Remove event-linked products
  ------------------------------------------------------ */
  const filtered = rows.filter((p) => !eventProductIds.has(p.id));

  /* ------------------------------------------------------
     6. Parse metadata safely
  ------------------------------------------------------ */
  const parsed = filtered.map((p) => ({
    ...p,
    metadata:
      typeof p.metadata === "string"
        ? JSON.parse(p.metadata)
        : p.metadata ?? {},
  }));

  return NextResponse.json({
    products: parsed,
    total,
    page,
    limit,
  });
}

/* ------------------------------------------------------
   POST /api/admin/products
   Create a product
------------------------------------------------------ */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = crypto.randomUUID();

    await db.insert(products).values({
      id,
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,

      // Numeric → must pass number or string Drizzle accepts
      price: body.price ? String(body.price) : "0",

      image_url: body.image_url ?? null,
      genre_id: body.genre_id ?? null,

      product_type: body.product_type ?? "general",

      author: body.author ?? null,
      format: body.format ?? null,
      language: body.language ?? null,

      // JSONB → must be real JS object
      metadata: body.metadata ?? {},

      inventory_count: body.inventory_count ?? 0,
      is_subscription: body.is_subscription ?? false,

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("PRODUCT CREATE ERROR:", err);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
