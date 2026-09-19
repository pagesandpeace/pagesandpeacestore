import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { consumeCommunityRateLimit } from "@/lib/app-core/rate-limit";
import { bookSlug, normalizeBookValue, reviewShareSlug } from "@/lib/app-core/book-reviews";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_FORMATS = new Set(["jpg", "jpeg", "png", "webp", "avif"]);

type SelectedBook = {
  source?: "pages_and_peace" | "open_library";
  id?: string;
  title?: string;
  author?: string;
  workKey?: string | null;
  editionKey?: string | null;
  firstPublishYear?: number | null;
  editionPublishedYear?: number | null;
  isbn10?: string | null;
  isbn13?: string | null;
  publisher?: string | null;
  language?: string | null;
  coverUrl?: string | null;
  sourceUrl?: string | null;
};

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function cleanIsbn(value: string | null | undefined) {
  const cleaned = (value ?? "").toUpperCase().replace(/[^0-9X]/g, "");
  return cleaned.length === 10 || cleaned.length === 13 ? cleaned : null;
}

function safeSelectedBook(value: FormDataEntryValue | null): SelectedBook | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const parsed = JSON.parse(value) as SelectedBook;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return fail("Sign in to share a review.", 401);
  if (!await consumeCommunityRateLimit(`community:review:${user.id}`, 10)) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });

  const form = await request.formData();
  const selected = safeSelectedBook(form.get("selectedBook"));
  const manualTitle = String(form.get("manualTitle") ?? "").trim();
  const manualAuthor = String(form.get("manualAuthor") ?? "").trim();
  const manualIsbn = cleanIsbn(String(form.get("manualIsbn") ?? ""));
  const title = (selected?.title ?? manualTitle).trim();
  const author = (selected?.author ?? manualAuthor).trim();
  const body = String(form.get("body") ?? "").trim();
  const rating = Number(form.get("rating"));
  const containsSpoilers = form.get("containsSpoilers") === "true";

  if (!title || title.length > 240 || !author || author.length > 180) return fail("Choose a book or add a valid title and author.");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail("Choose a rating from 1 to 5.");
  if (body.length < 40 || body.length > 5000) return fail("Reviews must be between 40 and 5,000 characters.");

  const db = supabaseService().schema("app_core");
  const { data: customer } = await db.from("customers").select("auth_user_id").eq("auth_user_id", user.id).maybeSingle();
  if (!customer) return fail("Customer profile not found.", 403);

  let book: { id: string; title: string; author: string; slug: string } | null = null;
  let editionId: string | null = null;

  if (selected?.source === "pages_and_peace" && selected.id) {
    const existing = await db.from("books").select("id,title,author,slug").eq("id", selected.id).maybeSingle();
    book = existing.data;
  }

  const isbn10 = cleanIsbn(selected?.isbn10) ?? (manualIsbn?.length === 10 ? manualIsbn : null);
  const isbn13 = cleanIsbn(selected?.isbn13) ?? (manualIsbn?.length === 13 ? manualIsbn : null);

  if (!book && (isbn13 || isbn10)) {
    let editionQuery = db.from("book_editions").select("id,book_id");
    editionQuery = isbn13 ? editionQuery.eq("isbn13", isbn13) : editionQuery.eq("isbn10", isbn10);
    const { data: edition } = await editionQuery.maybeSingle();
    if (edition) {
      editionId = edition.id;
      const { data: editionBook } = await db.from("books").select("id,title,author,slug").eq("id", edition.book_id).maybeSingle();
      book = editionBook;
    }
  }

  if (!book && selected?.workKey) {
    const byWork = await db.from("books").select("id,title,author,slug").eq("open_library_work_key", selected.workKey).maybeSingle();
    book = byWork.data;
  }

  const normalizedTitle = normalizeBookValue(title);
  const normalizedAuthor = normalizeBookValue(author);
  if (!book) {
    const byText = await db.from("books").select("id,title,author,slug").eq("normalized_title", normalizedTitle).eq("normalized_author", normalizedAuthor).maybeSingle();
    book = byText.data;
  }

  if (!book) {
    let slug = bookSlug(title, author);
    const slugExists = await db.from("books").select("id").eq("slug", slug).maybeSingle();
    if (slugExists.data) slug = `${slug}-${crypto.randomUUID().slice(0, 8)}`;
    const inserted = await db.from("books").insert({
      title,
      author,
      slug,
      normalized_title: normalizedTitle,
      normalized_author: normalizedAuthor,
      isbn: isbn13 ?? isbn10,
      cover_image_url: selected?.coverUrl ?? null,
      open_library_work_key: selected?.workKey ?? null,
      first_publish_year: selected?.firstPublishYear ?? null,
    }).select("id,title,author,slug").single();
    if (inserted.error || !inserted.data) {
      const retry = selected?.workKey
        ? await db.from("books").select("id,title,author,slug").eq("open_library_work_key", selected.workKey).maybeSingle()
        : await db.from("books").select("id,title,author,slug").eq("normalized_title", normalizedTitle).eq("normalized_author", normalizedAuthor).maybeSingle();
      if (!retry.data) return fail("We could not add that book.", 500);
      book = retry.data;
    } else {
      book = inserted.data;
    }
  }

  if (!book) return fail("We could not resolve that book.", 500);

  if (!editionId && (selected?.editionKey || isbn10 || isbn13)) {
    const conditions = [
      selected?.editionKey ? ["open_library_edition_key", selected.editionKey] : null,
      isbn13 ? ["isbn13", isbn13] : null,
      isbn10 ? ["isbn10", isbn10] : null,
    ].filter(Boolean) as [string, string][];
    for (const [column, value] of conditions) {
      const found = await db.from("book_editions").select("id").eq(column, value).maybeSingle();
      if (found.data) { editionId = found.data.id; break; }
    }
    if (!editionId) {
      const edition = await db.from("book_editions").insert({
        book_id: book.id,
        isbn10,
        isbn13,
        open_library_edition_key: selected?.editionKey ?? null,
        publisher: selected?.publisher ?? null,
        published_year: selected?.editionPublishedYear ?? null,
        language: selected?.language ?? null,
        cover_image_url: selected?.coverUrl ?? null,
        source_url: selected?.sourceUrl ?? null,
        metadata: selected ? { source: selected.source } : {},
      }).select("id").single();
      if (edition.data) editionId = edition.data.id;
    }
  }

  const existingReview = await db.from("book_reviews").select("id").eq("book_id", book.id).eq("customer_id", user.id).maybeSingle();
  if (existingReview.data) return fail("You have already reviewed this book. You can edit your existing review instead.", 409);

  let imageUrl: string | null = null;
  const imagePublicId = String(form.get("imagePublicId") ?? "").trim();
  if (imagePublicId) {
    const expectedPrefix = `pages-and-peace/book-reviews/${user.id}/`;
    if (!imagePublicId.startsWith(expectedPrefix)) return fail("Invalid review image.", 400);
    try {
      const resource = await cloudinary.api.resource(imagePublicId, { resource_type: "image" }) as {
        public_id?: string;
        secure_url?: string;
        bytes?: number;
        format?: string;
      };
      if (
        resource.public_id !== imagePublicId ||
        !resource.secure_url ||
        typeof resource.bytes !== "number" ||
        resource.bytes <= 0 ||
        resource.bytes > MAX_BYTES ||
        !resource.format ||
        !ALLOWED_IMAGE_FORMATS.has(resource.format.toLowerCase())
      ) {
        return fail("The review image is not valid.", 400);
      }
      imageUrl = resource.secure_url;
    } catch (error) {
      console.error("book review image verification failed", {
        message: error instanceof Error ? error.message : "unknown",
        userId: user.id,
      });
      return fail("We could not verify the uploaded image. Please try again.", 502);
    }
  }

  const reviewId = crypto.randomUUID();
  const insertedReview = await db.from("book_reviews").insert({
    id: reviewId,
    book_id: book.id,
    edition_id: editionId,
    customer_id: user.id,
    rating,
    body,
    image_url: imageUrl,
    contains_spoilers: containsSpoilers,
    status: "published",
    share_slug: reviewShareSlug(reviewId),
  }).select("id,share_slug").single();

  if (insertedReview.error) {
    console.error("book review insert failed", { code: insertedReview.error.code, message: insertedReview.error.message, userId: user.id, bookId: book.id });
    return fail("We could not publish your review.", 500);
  }
  return NextResponse.json({
    success: true,
    reviewId: insertedReview.data.id,
    reviewSlug: insertedReview.data.share_slug,
    bookSlug: book.slug,
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
