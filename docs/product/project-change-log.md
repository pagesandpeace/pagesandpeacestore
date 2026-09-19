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
