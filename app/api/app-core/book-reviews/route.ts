import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { bookSlug, normalizeBookValue } from "@/lib/app-core/book-reviews";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function fail(error: string, status = 400) { return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } }); }

export async function POST(request: Request) {
  const auth = await supabaseAuthServer();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return fail("Sign in to share a review.", 401);
  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const author = String(form.get("author") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  const isbn = String(form.get("isbn") ?? "").trim() || null;
  const rating = Number(form.get("rating"));
  const containsSpoilers = form.get("containsSpoilers") === "true";
  if (!title || title.length > 240 || !author || author.length > 180) return fail("Add a valid book title and author.");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail("Choose a rating from 1 to 5.");
  if (body.length < 40 || body.length > 5000) return fail("Reviews must be between 40 and 5,000 characters.");
  if (isbn && isbn.length > 32) return fail("ISBN is too long.");

  const db = supabaseService().schema("app_core");
  const { data: customer } = await db.from("customers").select("auth_user_id").eq("auth_user_id", user.id).maybeSingle();
  if (!customer) return fail("Customer profile not found.", 403);

  const normalizedTitle = normalizeBookValue(title), normalizedAuthor = normalizeBookValue(author);
  let { data: book } = await db.from("books").select("id,title,author,slug").eq("normalized_title", normalizedTitle).eq("normalized_author", normalizedAuthor).maybeSingle();
  if (!book) {
    let slug = bookSlug(title, author);
    const existingSlug = await db.from("books").select("id").eq("slug", slug).maybeSingle();
    if (existingSlug.data) slug = `${slug}-${crypto.randomUUID().slice(0, 8)}`;
    const inserted = await db.from("books").insert({ title, author, slug, normalized_title: normalizedTitle, normalized_author: normalizedAuthor, isbn }).select("id,title,author,slug").single();
    if (inserted.error || !inserted.data) return fail("We could not add that book.", 500);
    book = inserted.data;
  }

  const existing = await db.from("book_reviews").select("id").eq("book_id", book.id).eq("customer_id", user.id).maybeSingle();
  if (existing.data) return fail("You have already reviewed this book.", 409);

  let imageUrl: string | null = null;
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_TYPES.has(file.type)) return fail("Use a JPG, PNG, WebP or AVIF image.");
    if (file.size > MAX_BYTES) return fail("Images must be smaller than 8 MB.");
    try {
      const encoded = Buffer.from(await file.arrayBuffer()).toString("base64");
      const upload = await cloudinary.uploader.upload(`data:${file.type};base64,${encoded}`, { folder: `pages-and-peace/book-reviews/${user.id}`, resource_type: "image", allowed_formats: ["jpg","jpeg","png","webp","avif"], transformation: [{ width: 1400, height: 1400, crop: "limit", quality: "auto", fetch_format: "auto" }] });
      imageUrl = upload.secure_url;
    } catch { return fail("The image could not be uploaded. Please try again.", 502); }
  }

  const insertedReview = await db.from("book_reviews").insert({ book_id: book.id, customer_id: user.id, rating, body, image_url: imageUrl, contains_spoilers: containsSpoilers, status: "published" }).select("id").single();
  if (insertedReview.error) return fail("We could not publish your review.", 500);
  return NextResponse.json({ success: true, reviewId: insertedReview.data.id, bookSlug: book.slug }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
