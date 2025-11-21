import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailBlasts } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const blasts = await db
      .select()
      .from(emailBlasts)
      .orderBy(emailBlasts.createdAt);

    return NextResponse.json({ ok: true, blasts });
  } catch (err) {
    console.error("HISTORY ERROR:", err);
    return NextResponse.json({ ok: false, error: "Failed to load history" }, { status: 500 });
  }
}
