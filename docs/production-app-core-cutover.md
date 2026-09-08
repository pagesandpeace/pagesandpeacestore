# Production app-core cutover

## Safety contract

The production project (`pigyhsjzcoofaajguzhr`) is the sole source of
production data. This cutover must never import users, events, orders,
bookings, refunds, or menu data from Staging.

The release is additive: it creates the `app_core` schema beside the legacy
`public` schema. It does not delete, truncate, rename, or update any legacy
production row.

## Verified production baseline

Captured 2026-09-08 before any production write:

| Record | Count |
| --- | ---: |
| Auth users | 397 |
| Legacy customer profiles | 378 |
| Legacy orders | 483 |
| Legacy event bookings | 599 |
| Future published events | 39 |
| Active future ticket types | 39 |
| Active future bookings | 23 |
| Active future ticket quantity | 23 |

The 23 active future bookings all have a valid production Auth/profile,
order-item, and ticket-type relationship. There are 23 Auth users without a
legacy profile and 4 profiles without a current Auth user; neither group is
silently backfilled.

## Release phases

1. **Schema only** — create `app_core` tables, constraints, indexes,
   server-only grants, checkout functions, refund audit structures, rate-limit
   structures, and RLS. No data copy.
2. **Production-native event continuity** — copy only Production's 39 future
   published events, their active ticket types, and the 23 active future
   bookings. Preserve legacy IDs in the app-core `legacy_*` columns.
3. **Reconciliation** — compare the counts above, per-event capacity, and
   every migrated booking. Abort on any mismatch.
4. **Configuration verification** — validate Production Supabase Auth,
   Vercel variables, Stripe live webhook, Resend, Beehiiv, and admin access.
5. **Explicitly approved live smoke test** — the first real payment/refund.

## Non-negotiable migration assertions

The production-native import must fail rather than guess when:

- a future booking lacks an authenticated customer profile;
- a future booking lacks an order item or ticket type;
- an event has no active ticket type;
- the post-import event, ticket, booking, or ticket-quantity counts differ
  from the preflight values;
- a legacy ID would map to more than one app-core row.

## Legacy history

Legacy `public.orders`, `public.order_items`, `public.events`, and
`public.event_bookings` remain in place. Historical orders are not deleted or
rewritten. The initial app-core import covers future capacity and continuity;
historical event-order display is a separately reconciled read-only migration.

## Security boundary

`app_core` is server-only. `anon` and `authenticated` receive no table or
function access. Service-role access is granted only to the exact tables and
functions needed by server routes. Every app-core table has RLS enabled as
defence in depth.
