import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { consumeCommunityRateLimit } from "@/lib/app-core/rate-limit";

const COMMENT_PAGE_SIZE = 10;

function parseCursor(value: string | null) {
  if (!value) return null;
  const split = value.lastIndexOf("|");
  if (split <= 0) return null;
  const createdAt = value.slice(0, split);
  const id = value.slice(split + 1);
  if (!createdAt || !id || Number.isNaN(Date.parse(createdAt))) return null;
  return { createdAt, id };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reviewId = (url.searchParams.get("reviewId") ?? "").trim();
  const cursor = parseCursor(url.searchParams.get("cursor"));
  if (!reviewId) return NextResponse.json({ error: "Invalid review." }, { status: 400 });

  const db = supabaseService().schema("app_core");
  const { data: review } = await db.from("book_reviews").select("id").eq("id", reviewId).eq("status", "published").maybeSingle();
  if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });

  let query = db.from("book_review_comments")
    .select("id,customer_id,body,created_at")
    .eq("review_id", reviewId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(COMMENT_PAGE_SIZE + 1);

  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }

  const { data: rows, error } = await query;
  if (error) return NextResponse.json({ error: "Could not load comments." }, { status: 500 });

  const hasMore = (rows?.length ?? 0) > COMMENT_PAGE_SIZE;
  const pageRows = (rows ?? []).slice(0, COMMENT_PAGE_SIZE).reverse();
  const customerIds = [...new Set(pageRows.map((row) => row.customer_id))];
  const { data: customers } = customerIds.length
    ? await db.from("customers").select("auth_user_id,display_name,profile_image").in("auth_user_id", customerIds)
    : { data: [] };
  const byCustomer = new Map((customers ?? []).map((customer) => [customer.auth_user_id, customer]));
  const oldest = pageRows[0] ?? null;

  return NextResponse.json({
    comments: pageRows.map((comment) => ({
      id: comment.id,
      body: comment.body,
      created_at: comment.created_at,
      reviewer: {
        name: byCustomer.get(comment.customer_id)?.display_name?.trim() || "Pages & Peace reader",
        image: byCustomer.get(comment.customer_id)?.profile_image ?? null,
      },
    })),
    pagination: {
      hasMore,
      cursor: hasMore && oldest ? `${oldest.created_at}|${oldest.id}` : null,
    },
  }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
}

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
