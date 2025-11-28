import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { StoreSettings } from "@/types/store";

interface RouteParams {
  params: { id: string };
}

export async function GET(_req: Request, { params }: RouteParams) {
  const store = (
    await db.select().from(stores).where(eq(stores.id, params.id))
  )[0];

  return NextResponse.json({ store });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const data: Partial<StoreSettings> = await req.json();

  await db
    .update(stores)
    .set({
      phone: data.phone,
      email: data.email,
      address: data.address,
      collectionInstructions: data.collection_instructions,
      openingHours: data.opening_hours,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(stores.id, params.id));

  return NextResponse.json({ ok: true });
}
