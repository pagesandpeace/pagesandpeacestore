import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { consumeCommunityRateLimit } from "@/lib/app-core/rate-limit";

export async function POST(request: Request) {
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to join the conversation." }, { status: 401 });
  if (!await consumeCommunityRateLimit(`community:comment:${user.id}`, 40)) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  const payload = await request.json().catch(() => null);
  const reviewId = typeof payload?.reviewId === "string" ? payload.reviewId : "";
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  if (!reviewId || body.length < 1 || body.length > 1200) return NextResponse.json({ error: "Comments must be between 1 and 1,200 characters." }, { status: 400 });

  const db = supabaseService().schema("app_core");
  const [{ data: customer }, { data: review }] = await Promise.all([
    db.from("customers").select("auth_user_id,display_name,profile_image").eq("auth_user_id", user.id).maybeSingle(),
    db.from("book_reviews").select("id").eq("id", reviewId).eq("status", "published").maybeSingle(),
  ]);
  if (!customer || !review) return NextResponse.json({ error: "Review not found." }, { status: 404 });

  const inserted = await db.from("book_review_comments").insert({ review_id: reviewId, customer_id: user.id, body, status: "published" }).select("id,body,created_at").single();
  if (inserted.error || !inserted.data) return NextResponse.json({ error: "Could not post comment." }, { status: 500 });
  return NextResponse.json({ comment: { ...inserted.data, reviewer: { name: customer.display_name?.trim() || "Pages & Peace reader", image: customer.profile_image ?? null } } }, { status: 201 });
}
