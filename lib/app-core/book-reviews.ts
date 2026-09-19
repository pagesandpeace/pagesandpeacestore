import { supabaseService } from "@/lib/supabase/service";

export type PublicBookReview = {
  id: string; rating: number; body: string; image_url: string | null; contains_spoilers: boolean; created_at: string;
  book: { id: string; title: string; author: string; slug: string; cover_image_url: string | null };
  reviewer: { name: string; image: string | null };
};

export function normalizeBookValue(value: string) {
  return value.trim().toLocaleLowerCase("en-GB").replace(/\s+/g, " ");
}

export function bookSlug(title: string, author: string) {
  const base = `${title}-${author}`.toLocaleLowerCase("en-GB").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 220);
  return base || `book-${Date.now()}`;
}

export async function getPublicReviews(limit = 24): Promise<PublicBookReview[]> {
  const db = supabaseService().schema("app_core");
  const { data: reviews, error } = await db.from("book_reviews").select("id,book_id,customer_id,rating,body,image_url,contains_spoilers,created_at").eq("status", "published").order("created_at", { ascending: false }).limit(limit);
  if (error || !reviews?.length) return [];
  const bookIds = [...new Set(reviews.map((r) => r.book_id))];
  const customerIds = [...new Set(reviews.map((r) => r.customer_id))];
  const [{ data: books }, { data: customers }] = await Promise.all([
    db.from("books").select("id,title,author,slug,cover_image_url").in("id", bookIds),
    db.from("customers").select("auth_user_id,display_name,profile_image").in("auth_user_id", customerIds),
  ]);
  const byBook = new Map((books ?? []).map((b) => [b.id, b]));
  const byCustomer = new Map((customers ?? []).map((c) => [c.auth_user_id, c]));
  return reviews.flatMap((review) => {
    const book = byBook.get(review.book_id); const customer = byCustomer.get(review.customer_id);
    if (!book) return [];
    return [{ ...review, book, reviewer: { name: customer?.display_name?.trim() || "Pages & Peace reader", image: customer?.profile_image ?? null } }];
  });
}

export async function getPublicBook(slug: string) {
  const db = supabaseService().schema("app_core");
  const { data: book } = await db.from("books").select("id,title,author,slug,isbn,cover_image_url").eq("slug", slug).maybeSingle();
  if (!book) return null;
  const { data: reviews } = await db.from("book_reviews").select("id,customer_id,rating,body,image_url,contains_spoilers,created_at").eq("book_id", book.id).eq("status", "published").order("created_at", { ascending: false });
  const ids = [...new Set((reviews ?? []).map((r) => r.customer_id))];
  const { data: customers } = ids.length ? await db.from("customers").select("auth_user_id,display_name,profile_image").in("auth_user_id", ids) : { data: [] };
  const byCustomer = new Map((customers ?? []).map((c) => [c.auth_user_id, c]));
  return { book, reviews: (reviews ?? []).map((review) => ({ ...review, reviewer: { name: byCustomer.get(review.customer_id)?.display_name?.trim() || "Pages & Peace reader", image: byCustomer.get(review.customer_id)?.profile_image ?? null } })) };
}

export async function getCustomerReviews(authUserId: string) {
  const db = supabaseService().schema("app_core");
  const { data: reviews } = await db.from("book_reviews").select("id,book_id,rating,body,image_url,contains_spoilers,status,created_at,updated_at").eq("customer_id", authUserId).order("created_at", { ascending: false });
  if (!reviews?.length) return [];
  const { data: books } = await db.from("books").select("id,title,author,slug").in("id", [...new Set(reviews.map((r) => r.book_id))]);
  const byBook = new Map((books ?? []).map((b) => [b.id, b]));
  return reviews.map((review) => ({ ...review, book: byBook.get(review.book_id) ?? null }));
}
