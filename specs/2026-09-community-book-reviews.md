# Community Book Reviews — Foundation + Community Core

**Status:** Approved for implementation by product owner on 2026-09-20.

## Product principle
Pages & Peace staff do not seed a closed catalogue. Readers introduce books they have read. If the book already exists, their review joins the shared book page; if it does not, the system creates the community book from an ISBN/Open Library match or a carefully validated manual fallback.

**Books are shared. Reviews are personal. Conversation grows around both.**

## Outcome
Create a public, shareable Pages & Peace reading community where:
- anyone can discover books, ratings and published reviews;
- authenticated customers can add one editable review per shared book;
- ISBN/work/edition metadata reduces duplicate books;
- each review has a permanent shareable destination and branded social preview;
- readers can react, comment and mark reading status;
- unsafe content can be reported and reviewed by a Pages & Peace administrator.

## Permanent architecture
### Shared book/work
`app_core.books` is the canonical community work-level object. It stores title/author identity, canonical slug, Open Library work key where known, first publication year and preferred cover metadata.

### Editions
`app_core.book_editions` stores edition identifiers such as ISBN-10, ISBN-13 and Open Library edition key plus publisher/language/cover/source metadata. A work can have multiple editions.

### Reviews
`app_core.book_reviews` stores the authenticated customer's individual rating/review, optional image, spoiler flag, moderation state, edition reference and permanent share slug. One customer may have only one active database review record per book.

### Community interaction
- `book_review_reactions`: helpful/love reactions.
- `book_review_comments`: reader conversation with moderation state.
- `book_reading_statuses`: want to read / reading / read.
- `book_community_reports`: human moderation queue for reviews/comments.

All community tables remain in server-only `app_core`; browser roles receive no direct table grants.

## Book discovery and identity
Contribution begins with **Find your book**, not free-text review creation.

Search order:
1. Existing Pages & Peace community books.
2. Open Library search by title/author/ISBN.
3. Validated manual title/author/optional ISBN fallback.

Matching prefers, in order:
1. existing Pages & Peace book ID;
2. ISBN edition match;
3. Open Library work key;
4. normalized title + author.

This protects the shared community object while still allowing readers to introduce books absent from external metadata.

Open Library is an enrichment source, not the Pages & Peace source of truth after ingestion.

## Public surfaces
- `/book-reviews`: public discovery/feed.
- `/books/[slug]`: canonical shared book page with aggregate rating, reading status counts and individual reviews.
- `/books/[slug]/reviews/[review]`: permanent individual review/conversation page.
- Dynamic Open Graph images create branded Pages & Peace share previews for individual reviews.

## Authenticated customer surfaces
- `/dashboard/reviews/new`: find/add book and publish review.
- `/dashboard/reviews`: My Reviews.
- `/dashboard/reviews/[reviewId]/edit`: edit or soft-remove own review.

Ownership is always derived from the authenticated Supabase Auth user ID server-side, never from a client-provided customer identifier.

## Community behaviour
- One 1–5 rating per customer review.
- Comments are public after authenticated submission.
- Helpful and love reactions can be toggled by authenticated customers.
- Reading status is one of want-to-read, reading or read.
- Spoilers are explicitly flagged.
- Removed reviews/comments are soft-hidden through status, preserving moderation/audit history.

## Moderation
Readers can report a review or comment for spam, harassment, hate, sexual content, privacy, copyright or other reasons.

Admin moderation lives at `/admin/community`. Content is not automatically removed merely because it receives a report; a human chooses hide/remove/dismiss. This preserves an explicit human gate for public-content moderation.

## Images
Optional customer review photos use the existing server-side Cloudinary integration:
- JPG, PNG, WebP or AVIF only;
- maximum 8 MB;
- server-side upload and transformation;
- no Cloudinary secret is exposed to clients.

Book covers may use Open Library's cover service when sourced from Open Library.

## Privacy
Public community output exposes only the customer's chosen display name/profile image in the context of their contribution. Email, Auth user ID and internal customer identifiers are never public community fields.

Public standalone reader profile pages are intentionally not part of this stage; exposing a broader public identity surface is a separate privacy/product decision.

## Abuse and integrity controls
- server-side authentication/ownership checks on every mutation;
- database uniqueness for one review per book/customer and reaction identity;
- duplicate open reports prevented;
- bounded text lengths and rating enums;
- moderation states for reviews/comments/reports;
- no browser grants to community tables;
- RLS enabled as defence in depth.

## Acceptance criteria
1. Logged-out visitors can browse books, ratings, reviews and conversations.
2. Logged-out visitors cannot mutate community data.
3. Signed-in customers can search existing/internal/external book records and add a missing book through the contribution flow.
4. ISBN/Open Library identity is retained at edition/work level.
5. A customer cannot create two reviews for the same shared book.
6. Reviews support rating, spoiler flag and optional validated image.
7. Every published review has a permanent share URL and branded OG preview.
8. Signed-in readers can react, comment and mark reading status.
9. Customers can edit or soft-remove only their own reviews.
10. Readers can report reviews/comments.
11. Only admins can moderate reports/content.
12. Public output does not expose email/Auth/internal customer identifiers.
13. Existing event-commerce/auth behaviour is unaffected.

## Staged delivery
### Stage A — Foundation + community core
This PR: schema, book/edition resolution, reviews, sharing, reactions, comments, reading status, reporting and admin moderation.

### Stage B — Discovery and retention
Separate verified slice after Stage A: richer search/filtering, trending/most-loved/new-to-community discovery, reading lists, optional notification model and reader activity surfaces.

### Stage C — Pages & Peace integration
Separate slice: staff picks, event/book relationships, store/inventory/order links and community-to-commerce journeys.

### Stage D — Personalisation
Only after sufficient real usage: recommendation/ranking systems based on explicit community signals. Avoid premature AI/social complexity.

## Release
Migrations are additive. They are applied and verified on staging first. Production migration requires final code review, preview verification, human acceptance and rollback readiness. Application rollback is a code revert; additive tables can safely remain unused if a release is rolled back.
