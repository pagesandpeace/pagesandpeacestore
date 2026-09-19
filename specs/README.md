# Slice Specifications

Specifications define the exact intended behaviour of significant product or engineering slices before implementation.

## When a spec is required
Create a spec when work materially affects product behaviour, architecture, authentication/authorization, payments, bookings/capacity, customer data, database schema/migrations, external integrations, customer communications or production operations.

A small low-risk fix may use a concise approved plan instead, provided acceptance criteria and risks are still explicit.

## Minimum contents
A useful spec contains:
1. Problem and user/business outcome.
2. Current behaviour and evidence.
3. Scope and non-goals.
4. Proposed behaviour and architecture.
5. Data model/migration implications.
6. Authentication, authorization, privacy and security implications.
7. External-service/config implications.
8. Failure, retry and idempotency behaviour where relevant.
9. Acceptance criteria.
10. Automated and manual test plan.
11. Preview/release plan.
12. Rollback/recovery strategy.
13. Open questions and required human decisions.

## Lifecycle
Use a descriptive filename such as `specs/2026-09-event-checkout-hardening.md`. A spec starts as proposed, becomes approved before significant build work, and is updated when an approved design materially changes.

Implementation should reference the spec in its pull request. The spec is not a substitute for code review or tests.

## Historical work
Do not create retrospective specifications that invent intent. If rationale is not evidenced, mark it **unknown / pre-baseline** and link to available historical documentation.
