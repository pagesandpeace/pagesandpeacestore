import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserServer } from "@/lib/auth/actions";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserServer();

    // Admin authentication guard
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
    }

    const productId = params.id;

    if (!productId) {
      return NextResponse.json({ error: "Missing product ID." }, { status: 400 });
    }

    // Check if product exists
    const existing = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    // Delete the row
    await db.delete(products).where(eq(products.id, productId));

    return NextResponse.json({ success: true, deletedId: productId });
  } catch (err) {
    console.error("❌ Product DELETE error:", err);
    return NextResponse.json(
      { error: "DELETE_FAILED", detail: String(err) },
      { status: 500 }
    );
  }
}
