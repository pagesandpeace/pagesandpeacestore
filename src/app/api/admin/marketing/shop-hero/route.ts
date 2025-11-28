import { db } from "@/lib/db";
import { marketing_blocks } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(marketing_blocks)
      .where(eq(marketing_blocks.key, "shop_hero"))
      .limit(1);

    const block = rows[0];

    // ❗ Always return valid JSON
    if (!block) {
      return NextResponse.json({
        id: null,
        key: "shop_hero",
        title: "",
        subtitle: "",
        cta_text: "",
        cta_link: "",
        image_url: null,
        visible: false,
        starts_at: null,
        ends_at: null,
      });
    }

    return NextResponse.json(block);
  } catch (err) {
    console.error("SHOP HERO GET ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load hero banner" },
      { status: 500 }
    );
  }
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
