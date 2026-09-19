# Security Model

**Baseline:** 2026-09-20

This document records verified architectural intent and permanent security boundaries. Where live configuration has not been independently checked, it must be treated as unverified rather than assumed.

## Trust boundaries
### Browser
The browser uses the public Supabase URL/anon key and persisted user sessions. Browser code must operate with least privilege and must not receive service-role credentials.

### Authenticated server
Server-side Supabase SSR clients use the user's session and are subject to the permissions/RLS applicable to that user.

### Privileged server
Service-role clients are privileged and can bypass ordinary browser RLS boundaries. Any use of `supabaseService()` / `appCoreDb()` or equivalent is security-sensitive and requires careful authorization before the privileged operation.

### app_core
The production migration evidence defines `app_core` as server-only: schema usage is revoked from public/anon/authenticated roles, RLS is enabled and specific service-role access is granted. Do not weaken this boundary for implementation convenience.

## Authentication and administration
Supabase Auth is the identity provider. Administrative authorization is based on the authenticated immutable Auth user ID being present in `app_core.admins`, rather than editable profile metadata. Admin routes must authenticate and then independently authorize.

Do not infer admin authority from email address, client-controlled metadata or UI visibility.

## Payments and bookings
Stripe Checkout is a high-consequence boundary. Checkout must validate server-side basket input, reserve/validate inventory atomically where designed, associate payment state with the correct pending order and recover safely from setup failures.

Webhook handling must authenticate Stripe signatures, be idempotent/replay-safe and avoid duplicate fulfilment. Refunds require authorization, auditable state transitions and human-controlled release policy.

## Customer data
Customer identity, bookings, orders, payment references and communication details are sensitive application data. Access should be purpose-limited. Do not transfer production customer data to external services or staging without explicit approval and a documented need.

Production data is authoritative. Never overwrite production with staging data.

## External services
- **Stripe:** payment checkout, payment events and refunds.
- **Resend:** transactional email.
- **Beehiiv:** newsletter/marketing integration.
- **Cloudinary:** image/media handling.
- **OpenAI SDK:** dependency observed; active production purpose is unverified at baseline.

Each integration must receive only the data required for its function. Secrets belong in managed environment configuration, never source control or logs.

## Database changes
Prefer additive, reversible migrations. Destructive migrations, permission/RLS changes and production data corrections require explicit human approval, pre-change verification and a rollback/recovery plan. Migrations should fail rather than guess when relationship assumptions are violated.

## Event time integrity
Stored event timestamps represent instants. UK display conversion belongs in application presentation using `Europe/London`. Do not alter stored timestamps solely to compensate for BST/GMT display bugs.

## Logging and diagnostics
Do not log secrets, tokens, full payment payloads or unnecessary personal data. Diagnostic endpoints must be admin-protected and should expose the minimum information required.

## Human approval gates
Retain explicit human approval for:
- production migrations and destructive data operations;
- material authentication/authorization or permission changes;
- payment/refund policy or consequential payment actions;
- customer communications sent at scale or automatically;
- external transfers of production customer data;
- secret rotation and production infrastructure/config changes;
- consequential automation.

## Baseline verification status
Repository-level security migrations and code boundaries were inspected during discovery. On 2026-09-20 the correct production Supabase and Vercel projects became visible to the connected tools, but this bootstrap does not mutate or comprehensively re-audit their live configuration. Any future claim about live RLS policies, environment variables, webhook settings, branch protection or platform permissions should be verified at the time it matters.
