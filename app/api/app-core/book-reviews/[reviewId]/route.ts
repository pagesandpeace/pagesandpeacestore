import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

async function ownerReview(reviewId: string, userId: string) {
  return supabaseService().schema("app_core").from("book_reviews")
    .select("id,book_id,customer_id,rating,body,contains_spoilers,status")
    .eq("id", reviewId).eq("customer_id", userId).maybeSingle();
}

export async function PATCH(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await params;
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to edit your review." }, { status: 401 });
  const existing = await ownerReview(reviewId, user.id);
  if (!existing.data || existing.data.status === "removed") return NextResponse.json({ error: "Review not found." }, { status: 404 });
  const payload = await request.json().catch(() => null);
  const rating = Number(payload?.rating);
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  const containsSpoilers = payload?.containsSpoilers === true;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Choose a rating from 1 to 5." }, { status: 400 });
  if (body.length < 40 || body.length > 5000) return NextResponse.json({ error: "Reviews must be between 40 and 5,000 characters." }, { status: 400 });
  const db = supabaseService().schema("app_core");
  const updated = await db.from("book_reviews").update({ rating, body, contains_spoilers: containsSpoilers, updated_at: new Date().toISOString(), edited_at: new Date().toISOString() }).eq("id", reviewId).eq("customer_id", user.id).select("id").single();
  if (updated.error) return NextResponse.json({ error: "Could not save review." }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await params;
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to remove your review." }, { status: 401 });
  const existing = await ownerReview(reviewId, user.id);
  if (!existing.data) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  const db = supabaseService().schema("app_core");
  const result = await db.from("book_reviews").update({ status: "removed", updated_at: new Date().toISOString() }).eq("id", reviewId).eq("customer_id", user.id);
  if (result.error) return NextResponse.json({ error: "Could not remove review." }, { status: 500 });
  return NextResponse.json({ success: true });
}
