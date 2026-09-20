# Project Change Log

This log records material product, architecture, security and delivery decisions from the engineering-governance baseline onward. Earlier rationale is **unknown / pre-baseline** unless supported by repository evidence.

## 2026-09-20 — Baseline v1
### Decision
Adopt a repository-based AI-assisted engineering governance model for the existing live Pages & Peace application.

### Delivery model
Significant work uses:
DISCOVER → PLAN → APPROVE → BUILD → TEST → INDEPENDENT REVIEW → PREVIEW → HUMAN ACCEPTANCE → RELEASE.

The implementer is not the sole reviewer. Human approval remains required for high-consequence actions.

### Source-of-truth model
Established `AGENTS.md`, product roadmap, this change log, slice specifications and the security model as durable project documentation alongside code/database state and Git/PR history.

### Production safety
Bootstrap is documentation/governance only. No application behaviour, database schema/data, authentication, production configuration, infrastructure, secrets or deployments are changed by this baseline.

### Verified baseline architecture
Repository: `pagesandpeace/pagesandpeacestore`.
Application: Next.js 16, React 19, TypeScript, App Router.
Backend/auth: Supabase, with legacy `public` data and a newer server-only `app_core` event-commerce schema.
Key integrations: Stripe, Resend, Cloudinary and Beehiiv. OpenAI SDK presence is known from dependencies; its active production purpose remains unverified.
Production Supabase: `pigyhsjzcoofaajguzhr`.
Staging Supabase: `ehbzvkynjcrewlzjgtkq`.
Production Vercel project: `pagesandpeacestore` in the Pages & Peace team.

### Historical evidence retained
`docs/production-app-core-cutover.md` and `docs/simple-core-rebuild.md` remain historical evidence and are not replaced by this baseline.

### Known gaps
No dedicated automated test script or repository GitHub Actions workflow was identified during baseline discovery. Branch-protection policy was not established by the discovery evidence and remains unverified. Historical rationale outside evidenced cutover documentation remains pre-baseline/unknown.

## 2026-09-20 — Community book reviews Phase 1
### Decision
Add a public reading-community feature where anyone can discover book reviews and authenticated customers can contribute reviews of any book, with optional imagery.

### Architecture
Model books separately from reviews so community content can grow into durable book pages and later reading/community features. Keep new tables inside server-only `app_core`; authenticated mutations derive ownership from Supabase Auth and execute server-side. Images reuse the existing Cloudinary boundary.

### Growth principle
Build the smallest useful community loop now while preserving expansion paths for reading lists, reactions, reviewer profiles, staff picks, event/shop relationships and recommendations. Do not prematurely build a full social network.

## 2026-09-20 — Quiet engagement and comment pagination
### Decision
Keep the book community deliberately low-noise. Reactions and reading-status changes remain useful community signals without individual email alerts. Comments are treated as conversation, but no automatic community email notifications are introduced in this stage.

### Comment-feed behaviour
Individual review pages load the latest 10 published comments initially and use cursor-based pagination to load earlier conversation on demand. This prevents long, heavy pages while preserving the full discussion history.

## 2026-09-20 — Mobile account navigation and app-shell polish
### Decision
Simplify mobile navigation and remove nested account interactions. Customer My Account links now lead directly to the account profile, the authenticated dashboard behaves as a contained app shell without the public footer, and the public event basket uses the ticket icon used elsewhere.

### UX behaviour
Mobile navigation drawers own their scrolling and lock background scroll while open. The account page no longer shows a false signed-out state while client user data is loading, and profile changes provide explicit success/error feedback.

## 2026-09-20 — Mobile menu viewport and browser-chrome refinement
### Decision
The public mobile menu is a static full-screen navigation surface rather than an independently scrolling drawer. The small number of primary destinations should remain visible at once, making the menu easier to scan and less susceptible to nested-scroll confusion.

### Mobile browser chrome
Dashboard sidebar account actions reserve additional bottom clearance beyond the CSS safe area so Settings and Sign out remain reachable above mobile browser tab/navigation controls.

## 2026-09-20 — Account entry-point refinement
### Decision
For signed-in customers, the public navbar's My Account action leads to the dashboard as the primary account landing page. The dashboard then exposes My Events, Order History, My Reviews, profile and settings through the account sidebar.

### Sidebar profile row
The sidebar profile row uses the customer's uploaded profile image (or the standard fallback avatar) as its single identity icon. A second generic avatar glyph is intentionally omitted to reduce visual duplication.
