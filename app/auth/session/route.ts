import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get(
    `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}-auth-token`
  );

  return NextResponse.json({
    session: session?.value ?? null,
  });
}
