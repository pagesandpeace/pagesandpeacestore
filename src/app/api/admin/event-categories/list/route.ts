import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eventCategories } from "@/lib/db/schema";

export async function GET() {
  try {
    const rows = await db.select().from(eventCategories);
    return NextResponse.json(rows);
  } catch (err) {
    console.error("❌ Failed to load event categories:", err);
    return NextResponse.json(
      { error: "Failed to load categories" },
      { status: 500 }
    );
  }
}
