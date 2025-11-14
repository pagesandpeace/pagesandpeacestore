"use server";

import { db } from "@/lib/db";
import { vouchers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Fetch all vouchers purchased by the logged-in user.
 */
export async function getVoucherOrders(email: string) {
  if (!email) return [];

  const rows = await db
    .select()
    .from(vouchers)
    .where(eq(vouchers.buyerEmail, email))
    .orderBy(vouchers.createdAt);

  // Normalize into a universal "order-like" shape
  return rows.map((v) => ({
    id: v.id,
    type: "voucher" as const,     // 🔥 FIXED literal type
    code: v.code,
    total: v.amountInitialPence / 100,
    remaining: v.amountRemainingPence / 100,
    currency: v.currency,
    created_at: v.createdAt ?? new Date(), // 🔥 never null
    status: v.status ?? "active",          // 🔥 ensure string
    receipt: `/gift-vouchers/${v.code}`,
  }));
}
