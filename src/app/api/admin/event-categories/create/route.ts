import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eventCategories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Slug generator (simple + works)
function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    const slug = slugify(name);

    // Prevent duplicates
    const existing = await db
      .select()
      .from(eventCategories)
      .where(eq(eventCategories.slug, slug));

    if (existing.length > 0) {
      return NextResponse.json(existing[0]);
    }

    const [created] = await db
      .insert(eventCategories)
      .values({ name, slug })
      .returning();

    return NextResponse.json(created);
  } catch (err) {
    console.error("❌ Create category failed:", err);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
