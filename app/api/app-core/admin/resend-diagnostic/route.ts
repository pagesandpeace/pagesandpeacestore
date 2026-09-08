import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/require-admin-user";
import { FROM } from "@/lib/email/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Read-only Preview diagnostic. It never exposes the Resend key. */
export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  return NextResponse.json({
    resend_api_key_configured: Boolean(process.env.RESEND_API_KEY),
    sender: FROM,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
