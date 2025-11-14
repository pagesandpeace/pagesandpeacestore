import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vouchers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sid = searchParams.get("sid");
  if (!sid) return NextResponse.json({ error: "Missing sid" }, { status: 400 });

  const [voucher] = await db
    .select({
      code: vouchers.code,
      amountRemainingPence: vouchers.amountRemainingPence,
      expiresAt: vouchers.expiresAt,
    })
    .from(vouchers)
    .where(eq(vouchers.stripeCheckoutSessionId, sid))
    .limit(1);

  if (!voucher) return NextResponse.json({ found: false });

  return NextResponse.json({
    found: true,
    code: voucher.code,
    amountRemainingPence: voucher.amountRemainingPence,
    expiresAt: voucher.expiresAt,
  });
}
