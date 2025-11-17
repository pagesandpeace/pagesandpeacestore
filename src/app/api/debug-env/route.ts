import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    DATABASE_URL: process.env.DATABASE_URL || null,
    DIRECT_URL: process.env.DIRECT_URL || null,
    SUPABASE_URL: process.env.SUPABASE_URL || null,
  });
}
