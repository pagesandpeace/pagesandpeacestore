import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/require-admin-user";
import { sendAppCoreBookingConfirmation } from "@/lib/app-core/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const formData = await request.formData();
  const orderId = String(formData.get("order_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
    return NextResponse.redirect(new URL("/admin/diagnostics/email?error=invalid-order", request.url), 303);
  }

  try {
    await sendAppCoreBookingConfirmation(orderId);
    return NextResponse.redirect(new URL(`/admin/diagnostics/email?order_id=${orderId}&sent=1`, request.url), 303);
  } catch (error) {
    console.error("app_core manual confirmation email failed", {
      orderId,
      reason: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.redirect(new URL(`/admin/diagnostics/email?order_id=${orderId}&error=send-failed`, request.url), 303);
  }
}
