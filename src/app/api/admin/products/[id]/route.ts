import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, genres } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserServer } from "@/lib/auth/actions";

/* ---------------------------------------
   ADMIN CHECK
--------------------------------------- */
async function requireAdmin() {
  const user = await getCurrentUserServer();
  if (!user || user.role !== "admin") return null;
  return user;
}

/* ---------------------------------------
   GET PRODUCT BY ID
--------------------------------------- */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const row = (
    await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        price: products.price,
        image_url: products.image_url,
        genre_id: products.genre_id,
        product_type: products.product_type,
        metadata: products.metadata,
        inventory_count: products.inventory_count,

        // book-specific fields
        author: products.author,
        format: products.format,
        language: products.language,
      })
      .from(products)
      .leftJoin(genres, eq(products.genre_id, genres.id))
      .where(eq(products.id, id))
  )[0];

  if (!row) {
    return NextResponse.json(
      { error: "Product not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(row);
}

/* ---------------------------------------
   UPDATE PRODUCT
--------------------------------------- */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await req.json();

  try {
    await db
      .update(products)
      .set({
        name: data.name,
        slug: data.slug?.toLowerCase().replace(/\s+/g, "-") ?? undefined,
        description: data.description ?? "",
        price: String(data.price ?? "0"),

        image_url: data.image_url ?? null,
        genre_id: data.genre_id ?? null,
        product_type: data.product_type ?? "physical",

        metadata: data.metadata ?? {},

        inventory_count: Number(data.inventory_count) || 0,
        updated_at: new Date().toISOString(),
      })
      .where(eq(products.id, id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/* ---------------------------------------
   DELETE PRODUCT
--------------------------------------- */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await db.delete(products).where(eq(products.id, id));

  return NextResponse.json({ ok: true });
}
