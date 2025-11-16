import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eventCategoryLinks, eventCategories } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getCurrentUserServer } from "@/lib/auth/actions";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    console.log("📌 [by-event] START");

    const { id } = await props.params;
    console.log("📌 [by-event] eventId =", id);

    const user = await getCurrentUserServer();
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      console.log("⛔ [by-event] Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const links = await db
      .select()
      .from(eventCategoryLinks)
      .where(eq(eventCategoryLinks.eventId, id));

    console.log("📌 [by-event] Found links:", links.length);

    if (links.length === 0) {
      console.log("📌 [by-event] No categories for this event");
      return NextResponse.json([]);
    }

    const categoryIds = links.map((l) => l.categoryId);
    console.log("📌 [by-event] categoryIds:", categoryIds);

    const categories = await db
      .select()
      .from(eventCategories)
      .where(inArray(eventCategories.id, categoryIds));

    console.log("📌 [by-event] categories loaded:", categories.length);

    return NextResponse.json(categories);
  } catch (err) {
    console.error("❌ [by-event] ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
