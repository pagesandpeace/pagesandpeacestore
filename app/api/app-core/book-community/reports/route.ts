import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { consumeCommunityRateLimit } from "@/lib/app-core/rate-limit";

const REASONS = new Set(["spam","harassment","hate","sexual","privacy","copyright","other"]);

export async function POST(request: Request) {
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to report content." }, { status: 401 });
  if (!await consumeCommunityRateLimit(`community:report:${user.id}`, 20)) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  const payload = await request.json().catch(() => null);
  const reviewId = typeof payload?.reviewId === "string" ? payload.reviewId : null;
  const commentId = typeof payload?.commentId === "string" ? payload.commentId : null;
  const reason = typeof payload?.reason === "string" && REASONS.has(payload.reason) ? payload.reason : null;
  const details = typeof payload?.details === "string" ? payload.details.trim().slice(0, 1200) : null;
  if ((!reviewId && !commentId) || (reviewId && commentId) || !reason) return NextResponse.json({ error: "Invalid report." }, { status: 400 });
  const db = supabaseService().schema("app_core");
  const { data: customer } = await db.from("customers").select("auth_user_id").eq("auth_user_id", user.id).maybeSingle();
  if (!customer) return NextResponse.json({ error: "Customer profile not found." }, { status: 403 });
  const target = reviewId
    ? await db.from("book_reviews").select("id").eq("id", reviewId).maybeSingle()
    : await db.from("book_review_comments").select("id").eq("id", commentId).maybeSingle();
  if (!target.data) return NextResponse.json({ error: "Content not found." }, { status: 404 });
  const duplicate = reviewId
    ? await db.from("book_community_reports").select("id").eq("reporter_customer_id", user.id).eq("review_id", reviewId).eq("status", "open").maybeSingle()
    : await db.from("book_community_reports").select("id").eq("reporter_customer_id", user.id).eq("comment_id", commentId).eq("status", "open").maybeSingle();
  if (duplicate.data) return NextResponse.json({ success: true, duplicate: true });
  const inserted = await db.from("book_community_reports").insert({ reporter_customer_id: user.id, review_id: reviewId, comment_id: commentId, reason, details: details || null }).select("id").single();
  if (inserted.error) return NextResponse.json({ error: "Could not submit report." }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}
