# Community Book Reviews — Phase 1

**Status:** Approved for implementation by product owner on 2026-09-20.

## Outcome
Create a public, shareable Pages & Peace reading-community surface. Anyone can browse published reviews. Signed-in customers can contribute and manage their own reviews.

## Growth architecture
Phase 1 establishes durable Book → Review → Customer relationships rather than duplicating book metadata per review. This allows later book pages, reading lists, reactions, recommendations, event/shop links and reviewer profiles without redesigning the core model.

## Scope
- Public `/book-reviews` discovery page with newest reviews and aggregate book ratings.
- Public `/books/[slug]` pages containing book metadata and published community reviews.
- Authenticated `/dashboard/reviews/new` contribution flow.
- Authenticated `/dashboard/reviews` list for the customer's reviews.
- Prominent public navigation and customer-dashboard entry points.
- Optional customer image uploaded through the existing server-side Cloudinary integration.
- Rating (1–5), review text, spoiler flag and optional image.
- One active review per customer per book.
- Book matching by normalized title + author for Phase 1; ISBN can be captured when known.
- Reviews publish immediately, with moderation state available for staff removal/reporting expansion.

## Non-goals
Comments, follows, reactions, notifications, reading lists, AI recommendations, automated book metadata lookup, public reviewer profile pages and staff moderation UI are not Phase 1.

## Data model
`app_core.books`: id, title, author, slug, normalized_title, normalized_author, isbn, cover_image_url, timestamps.

`app_core.book_reviews`: id, book_id, customer_id, rating, body, image_url, contains_spoilers, status, timestamps.

Customer ownership uses `app_core.customers.auth_user_id`. Public reads and customer writes go through server routes; `app_core` remains server-only.

## Security and abuse
- All writes authenticate with Supabase Auth server-side.
- Service-role writes must derive customer identity from authenticated user ID, never request data.
- Public API exposes display name/avatar only, never customer email/auth identifiers.
- Validate lengths, rating, image type/size and URLs server-side.
- Images: JPG/PNG/WebP/AVIF, maximum 8 MB, Cloudinary server upload.
- Review status supports `published`, `hidden`, `removed`.
- Initial immediate publishing is intentionally reversible; moderation/reporting is the next safety expansion if usage warrants it.
- API mutation responses use no-store semantics.
- Database tables remain in server-only `app_core`; no anon/authenticated grants are added.

## Acceptance criteria
1. Logged-out visitors can browse reviews and book pages.
2. Logged-out visitors cannot submit/edit/delete reviews.
3. Signed-in customers can submit a valid review.
4. A customer cannot create two reviews for the same book.
5. Review contribution can include an optional validated image.
6. Only published reviews appear publicly.
7. Public output does not expose email, auth user ID or internal customer ID.
8. Customer dashboard exposes Review a book and My reviews.
9. Main public navigation exposes Book reviews.
10. Pages provide useful metadata for sharing/discovery.
11. Existing event commerce/auth behaviour is unaffected.

## Migration/release
Use an additive migration only. No existing rows are altered or deleted. Apply schema first, verify tables/constraints/indexes, run security/performance advisors, then deploy application code. Rollback application by reverting the release; additive tables may safely remain unused.

## Future expansion
Book pages become the durable public entity for community content. Future slices may add Open Library/ISBN enrichment, reading lists, reactions, reviewer profiles, staff picks, event/shop relationships, reporting/moderation workflows and recommendations based on real usage.
