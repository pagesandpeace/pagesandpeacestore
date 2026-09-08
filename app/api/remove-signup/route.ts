export const runtime = "nodejs";

import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is no longer available" },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}
