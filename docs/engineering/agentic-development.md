# Agentic Development Model

## Purpose
This document defines how AI-assisted development is performed safely on the existing live Pages & Peace system.

## Lifecycle
### DISCOVER
Inspect current code, data boundaries, relevant live configuration when authorized, existing docs and recent implementation history. Identify unknowns. Do not assume another project's architecture applies.

### PLAN
Define the problem, scope, non-goals, architecture, affected data/security boundaries, acceptance criteria, testing, migration/config implications and rollback strategy.

### APPROVE
Obtain human approval before significant implementation. Approval of a plan does not authorize unrelated production operations.

### BUILD
Use a focused branch. Make the smallest coherent change that satisfies the approved plan. Avoid opportunistic rewrites.

### TEST
Run available automated checks and targeted tests. Add regression tests where practical. If coverage is missing, document manual verification rather than presenting it as automated assurance.

### INDEPENDENT REVIEW
A reviewer distinct from the implementer evaluates correctness and regressions. Security review is required for auth, permissions, sensitive data, service-role usage, payments, webhooks, customer communications or destructive operations.

### PREVIEW
Verify the deployable result in a non-production preview where applicable. Confirm responsive/accessibility behaviour for UI work and runtime/config assumptions for backend work.

### HUMAN ACCEPTANCE
Present the change, evidence, known limitations and production implications for acceptance.

### RELEASE
Before release, re-check branch/diff, checks, reviews, preview, migrations, environment/config requirements, production-data effects and rollback/recovery. Release only the accepted scope.

## Agent responsibilities
**Product Architect** owns discovery, scope, architecture and acceptance criteria.

**Developer Agent** owns implementation and developer-level verification but cannot be the sole approver.

**QA Agent** independently tests expected behaviour, edge cases and regressions.

**Security Reviewer** evaluates trust boundaries, authorization, RLS/service-role use, sensitive data, secrets, abuse paths, payments and destructive actions.

**Release Reviewer** verifies readiness and rollback before production release.

One AI system may perform multiple roles only when the work product clearly separates implementation from a fresh review pass; consequential changes still require human acceptance.

## Specifications
Create a slice spec for significant work. Small, low-risk fixes may use a concise approved plan when a full spec would add no value. See `specs/README.md`.

## Evidence
Reviews should reference actual code/diffs, executed checks and observable preview/live behaviour. A green deployment is evidence of deployability, not proof of correctness.

## Production access
Use least privilege. Read-only inspection is preferred during discovery. Production writes must be explicitly required by the approved slice. Never use production as a substitute for a test environment.

## Documentation write-back
Material decisions must be committed with the implementation. Chat discussions are not sufficient permanent records.
