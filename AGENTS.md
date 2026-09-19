# Pages & Peace — Agent Operating Rules

This repository is an existing live production system. Preserve working architecture and production behaviour unless an approved product slice explicitly requires change.

## Source of truth
1. This file: agent behaviour and delivery rules.
2. `docs/product/product-roadmap.md`: product direction and priorities.
3. `docs/product/project-change-log.md`: material decisions and changes.
4. `specs/`: exact behaviour for significant slices.
5. `docs/security/security-model.md`: permanent security and data boundaries.
6. Repository code, migrations and live verified configuration: what exists.
7. Git history and pull requests: implementation history.

Chat history is context, not a durable source of truth. Write material decisions back to the repository. Surface conflicts between documentation and implementation rather than silently choosing one.

## Delivery lifecycle
Significant work follows:

DISCOVER → PLAN → APPROVE → BUILD → TEST → INDEPENDENT REVIEW → PREVIEW → HUMAN ACCEPTANCE → RELEASE

Do not begin significant implementation before an approved plan. The implementer must not be the sole reviewer.

Roles:
- Product Architect: discovery, scope, architecture, acceptance criteria and risk.
- Developer Agent: implementation on a focused branch.
- QA Agent: independent functional/regression verification.
- Security Reviewer: auth, permissions, data, secrets, payments and abuse review where relevant.
- Release Reviewer: checks preview, migrations/config, production implications and rollback readiness.

## Standard commands
- **start the next slice**: perform discovery and product/architecture planning first. Do not immediately make significant code changes.
- **dev it**: implement the approved plan on a focused branch, then test and review it.
- **release it**: verify checks, review, preview, migrations/config, production implications and rollback before release.

## Git discipline
- Never write feature work directly to `main`.
- Use a focused branch and meaningful commits.
- Do not create noop, marker, temporary or empty-file commits.
- Review the complete diff before merge.
- Prefer squash merge for a completed meaningful slice unless history genuinely benefits from another strategy.
- Do not merge merely because a build is green.
- Preserve unrelated user changes.

## Production safety
Do not modify production data, production configuration, authentication/authorization, secrets, infrastructure, payment behaviour or destructive database state without explicit scope and approval.

Destructive database changes, material auth/security changes, production-data operations, external transfers of customer data and consequential automation require explicit human approval plus a rollback/recovery plan.

Never copy staging data over production. Production is authoritative. The production Supabase project is `pigyhsjzcoofaajguzhr`; staging is `ehbzvkynjcrewlzjgtkq`.

## High-consequence actions
Keep human approval for payments/refunds, customer communications, deletion, contracts, staff decisions, security permissions and production migrations. AI-generated code is not presumed correct.

Prefer better specifications, tests, observability, least privilege and approval gates over unrestricted autonomy.

## Documentation
A significant product or architecture decision must update the relevant roadmap, change log, spec and/or security documentation in the same slice. Historical rationale that cannot be evidenced must be labelled **unknown / pre-baseline**.

Existing cutover documents are historical evidence and must not be rewritten to invent rationale.

## Current architectural constraints
The application is a Next.js/React/TypeScript App Router system using Supabase, Stripe, Resend, Cloudinary and Beehiiv. The newer `app_core` Supabase schema is designed as server-only. Browser roles must not be granted direct access merely for convenience. Service-role code bypasses ordinary browser RLS boundaries and is security-sensitive.

Event timestamps represent instants. Display UK event times using `Europe/London`; do not bulk-shift stored timestamps to compensate for BST/GMT presentation errors.

## Quality
For every slice, identify relevant lint/build/tests and execute what exists. Where automated coverage is absent, document the gap and use explicit manual acceptance checks. Do not claim checks were run when they were not.

Before release, verify responsive behaviour and accessibility where UI changes are involved, and verify failure/retry/idempotency behaviour where payments, webhooks, email or data mutations are involved.
