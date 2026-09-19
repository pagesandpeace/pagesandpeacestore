import { supabaseService } from "@/lib/supabase/service";

export type BookSummary = {
  id: string;
  title: string;
  author: string;
  slug: string;
  cover_image_url: string | null;
  first_publish_year: number | null;
  open_library_work_key: string | null;
};

export type PublicBookReview = {
  id: string;
  rating: number;
  body: string;
  image_url: string | null;
  contains_spoilers: boolean;
  created_at: string;
  edited_at: string | null;
  share_slug: string | null;
  book: BookSummary;
  reviewer: { name: string; image: string | null };
  helpful_count: number;
  love_count: number;
  comment_count: number;
};

export function normalizeBookValue(value: string) {
  return value.trim().toLocaleLowerCase("en-GB").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
}

export function bookSlug(title: string, author: string) {
  const base = `${title}-${author}`.toLocaleLowerCase("en-GB").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 220);
  return base || `book-${crypto.randomUUID().slice(0, 8)}`;
}

export function reviewShareSlug(reviewId: string) {
  return reviewId.replaceAll("-", "").slice(0, 12);
}

async function communityCounts(reviewIds: string[]) {
  const db = supabaseService().schema("app_core");
  if (!reviewIds.length) return new Map<string, { helpful: number; love: number; comments: number }>();
  const [{ data: reactions }, { data: comments }] = await Promise.all([
    db.from("book_review_reactions").select("review_id,reaction").in("review_id", reviewIds),
    db.from("book_review_comments").select("review_id").in("review_id", reviewIds).eq("status", "published"),
  ]);
  const map = new Map<string, { helpful: number; love: number; comments: number }>();
  for (const id of reviewIds) map.set(id, { helpful: 0, love: 0, comments: 0 });
  for (const reaction of reactions ?? []) {
    const value = map.get(reaction.review_id); if (!value) continue;
    if (reaction.reaction === "helpful") value.helpful += 1;
    if (reaction.reaction === "love") value.love += 1;
  }
  for (const comment of comments ?? []) {
    const value = map.get(comment.review_id); if (value) value.comments += 1;
  }
  return map;
}

export async function getPublicReviews(limit = 36): Promise<PublicBookReview[]> {
  const db = supabaseService().schema("app_core");
  const { data: reviews, error } = await db.from("book_reviews")
    .select("id,book_id,customer_id,rating,body,image_url,contains_spoilers,created_at,edited_at,share_slug")
    .eq("status", "published").order("created_at", { ascending: false }).limit(limit);
  if (error || !reviews?.length) return [];
  const bookIds = [...new Set(reviews.map((r) => r.book_id))];
  const customerIds = [...new Set(reviews.map((r) => r.customer_id))];
  const [{ data: books }, { data: customers }, counts] = await Promise.all([
    db.from("books").select("id,title,author,slug,cover_image_url,first_publish_year,open_library_work_key").in("id", bookIds),
    db.from("customers").select("auth_user_id,display_name,profile_image").in("auth_user_id", customerIds),
    communityCounts(reviews.map((r) => r.id)),
  ]);
  const byBook = new Map((books ?? []).map((b) => [b.id, b]));
  const byCustomer = new Map((customers ?? []).map((c) => [c.auth_user_id, c]));
  return reviews.flatMap((review) => {
    const book = byBook.get(review.book_id); const customer = byCustomer.get(review.customer_id);
    if (!book) return [];
    const count = counts.get(review.id) ?? { helpful: 0, love: 0, comments: 0 };
    return [{ ...review, book, reviewer: { name: customer?.display_name?.trim() || "Pages & Peace reader", image: customer?.profile_image ?? null }, helpful_count: count.helpful, love_count: count.love, comment_count: count.comments }];
  });
}

export async function getPublicBook(slug: string) {
  const db = supabaseService().schema("app_core");
  const { data: book } = await db.from("books")
    .select("id,title,author,slug,description,subjects,first_publish_year,open_library_work_key,cover_image_url")
    .eq("slug", slug).maybeSingle();
  if (!book) return null;
  const [{ data: editions }, { data: reviews }, { data: readingStatuses }] = await Promise.all([
    db.from("book_editions").select("id,isbn10,isbn13,publisher,published_year,language,format,cover_image_url,source_url").eq("book_id", book.id).order("published_year", { ascending: false }),
    db.from("book_reviews").select("id,customer_id,rating,body,image_url,contains_spoilers,created_at,edited_at,share_slug").eq("book_id", book.id).eq("status", "published").order("created_at", { ascending: false }),
    db.from("book_reading_statuses").select("status").eq("book_id", book.id),
  ]);
  const ids = [...new Set((reviews ?? []).map((r) => r.customer_id))];
  const { data: customers } = ids.length ? await db.from("customers").select("auth_user_id,display_name,profile_image").in("auth_user_id", ids) : { data: [] };
  const byCustomer = new Map((customers ?? []).map((c) => [c.auth_user_id, c]));
  const counts = await communityCounts((reviews ?? []).map((r) => r.id));
  const reading = { want_to_read: 0, reading: 0, read: 0 };
  for (const row of readingStatuses ?? []) if (row.status in reading) reading[row.status as keyof typeof reading] += 1;
  return {
    book,
    editions: editions ?? [],
    reading,
    reviews: (reviews ?? []).map((review) => {
      const count = counts.get(review.id) ?? { helpful: 0, love: 0, comments: 0 };
      return { ...review, reviewer: { name: byCustomer.get(review.customer_id)?.display_name?.trim() || "Pages & Peace reader", image: byCustomer.get(review.customer_id)?.profile_image ?? null }, helpful_count: count.helpful, love_count: count.love, comment_count: count.comments };
    }),
  };
}

export async function getPublicReview(bookSlugValue: string, reviewId: string) {
  const data = await getPublicBook(bookSlugValue);
  if (!data) return null;
  const review = data.reviews.find((item) => item.id === reviewId || item.share_slug === reviewId);
  if (!review) return null;
  const db = supabaseService().schema("app_core");
  const { data: commentRows } = await db.from("book_review_comments")
    .select("id,customer_id,body,created_at")
    .eq("review_id", review.id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(11);
  const hasMoreComments = (commentRows?.length ?? 0) > 10;
  const latestComments = (commentRows ?? []).slice(0, 10).reverse();
  const customerIds = [...new Set(latestComments.map((c) => c.customer_id))];
  const { data: customers } = customerIds.length ? await db.from("customers").select("auth_user_id,display_name,profile_image").in("auth_user_id", customerIds) : { data: [] };
  const byCustomer = new Map((customers ?? []).map((c) => [c.auth_user_id, c]));
  const oldestLoaded = latestComments[0] ?? null;
  return {
    book: data.book,
    editions: data.editions,
    review,
    comments: latestComments.map((comment) => ({
      ...comment,
      reviewer: {
        name: byCustomer.get(comment.customer_id)?.display_name?.trim() || "Pages & Peace reader",
        image: byCustomer.get(comment.customer_id)?.profile_image ?? null,
      },
    })),
    commentPagination: {
      hasMore: hasMoreComments,
      cursor: hasMoreComments && oldestLoaded ? `${oldestLoaded.created_at}|${oldestLoaded.id}` : null,
    },
  };
}

export async function getCustomerReviews(authUserId: string) {
  const db = supabaseService().schema("app_core");
  const { data: reviews } = await db.from("book_reviews").select("id,book_id,rating,body,image_url,contains_spoilers,status,created_at,updated_at,edited_at,share_slug").eq("customer_id", authUserId).order("created_at", { ascending: false });
  if (!reviews?.length) return [];
  const { data: books } = await db.from("books").select("id,title,author,slug,cover_image_url").in("id", [...new Set(reviews.map((r) => r.book_id))]);
  const byBook = new Map((books ?? []).map((b) => [b.id, b]));
  return reviews.map((review) => ({ ...review, book: byBook.get(review.book_id) ?? null }));
}

export async function findInternalBooks(query: string, limit = 8) {
  const db = supabaseService().schema("app_core");
  const q = query.trim();
  if (!q) return [];
  const safe = q.replace(/[,%()]/g, " ");
  const { data } = await db.from("books")
    .select("id,title,author,slug,cover_image_url,first_publish_year,open_library_work_key")
    .or(`title.ilike.%${safe}%,author.ilike.%${safe}%`)
    .limit(limit);
  return data ?? [];
}
