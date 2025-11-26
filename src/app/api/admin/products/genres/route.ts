import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { genres } from "@/lib/db/schema";
import { getCurrentUserServer } from "@/lib/auth/actions";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/products/genres
 * Returns list of genres for product forms
 */
export async function GET() {
  try {
    const user = await getCurrentUserServer();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
    }

    const rows = await db.select().from(genres);

    return NextResponse.json(rows);
  } catch (err) {
    console.error("❌ GENRES API ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load genres" },
      { status: 500 }
    );
  }
}
