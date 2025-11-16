import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eventCategories } from "@/lib/db/schema";
import { ilike } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";

    if (!q) {
      const all = await db.select().from(eventCategories);
      return NextResponse.json(all);
    }

    const rows = await db
      .select()
      .from(eventCategories)
      .where(ilike(eventCategories.name, `%${q}%`));

    return NextResponse.json(rows);
  } catch (err) {
    console.error("❌ Search categories failed:", err);
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
