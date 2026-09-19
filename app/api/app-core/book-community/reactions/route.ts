import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { consumeCommunityRateLimit } from "@/lib/app-core/rate-limit";

export async function POST(request: Request) {
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to react." }, { status: 401 });
  if (!await consumeCommunityRateLimit(`community:reaction:${user.id}`, 180)) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  const body = await request.json().catch(() => null);
  const reviewId = typeof body?.reviewId === "string" ? body.reviewId : "";
  const reaction = body?.reaction === "helpful" || body?.reaction === "love" ? body.reaction : null;
  if (!reviewId || !reaction) return NextResponse.json({ error: "Invalid reaction." }, { status: 400 });

  const db = supabaseService().schema("app_core");
  const [{ data: customer }, { data: review }] = await Promise.all([
    db.from("customers").select("auth_user_id").eq("auth_user_id", user.id).maybeSingle(),
    db.from("book_reviews").select("id").eq("id", reviewId).eq("status", "published").maybeSingle(),
  ]);
  if (!customer || !review) return NextResponse.json({ error: "Review not found." }, { status: 404 });

  const existing = await db.from("book_review_reactions").select("id").eq("review_id", reviewId).eq("customer_id", user.id).eq("reaction", reaction).maybeSingle();
  let active = false;
  if (existing.data) {
    await db.from("book_review_reactions").delete().eq("id", existing.data.id).eq("customer_id", user.id);
  } else {
    const inserted = await db.from("book_review_reactions").insert({ review_id: reviewId, customer_id: user.id, reaction }).select("id").single();
    if (inserted.error) return NextResponse.json({ error: "Could not save reaction." }, { status: 500 });
    active = true;
  }
  const { data: reactions } = await db.from("book_review_reactions").select("reaction").eq("review_id", reviewId);
  return NextResponse.json({ active, helpful: (reactions ?? []).filter((r) => r.reaction === "helpful").length, love: (reactions ?? []).filter((r) => r.reaction === "love").length });
}
