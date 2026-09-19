import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { getCustomerReviews } from "@/lib/app-core/book-reviews";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  return NextResponse.json({ reviews: await getCustomerReviews(user.id) }, { headers: { "Cache-Control": "no-store" } });
}
