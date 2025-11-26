import { db } from "@/lib/db";
import { marketing_blocks } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";              // ✔ you were missing sql
import { NextResponse } from "next/server";

export async function GET() {
  const [block] = await db
    .select()
    .from(marketing_blocks)
    .where(eq(marketing_blocks.key, "shop_hero"))
    .limit(1);

  return NextResponse.json(block);
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    await db
      .update(marketing_blocks)
      .set({
        title: body.title ?? null,
        subtitle: body.subtitle ?? null,
        cta_text: body.cta_text ?? null,
        cta_link: body.cta_link ?? null,
        image_url: body.image_url ?? null,
        visible: body.visible ?? true,
        starts_at: body.starts_at ?? null,
        ends_at: body.ends_at ?? null,
        updated_at: sql`NOW()`,
      })
      .where(eq(marketing_blocks.key, "shop_hero"));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("SHOP HERO PATCH ERROR:", err);
    return NextResponse.json(
      { error: "Failed to update hero banner" },
      { status: 500 }
    );
  }
}
