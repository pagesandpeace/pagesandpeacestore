# Mobile Account UX Polish

**Status:** Approved and implemented on 2026-09-20.

## Outcome
Make the public mobile navigation and authenticated customer account feel like one coherent, app-like Pages & Peace experience without changing authentication, commerce or data behaviour.

## Changes
- Public mobile navigation is a full-height slide-in sheet with independent scrolling, safe-area support, active-state styling and explicit account action.
- Customer "My Account" links route directly to `/dashboard/account`; admins continue to route to `/admin`.
- Public event basket uses the same ticket icon language as the dashboard.
- Dashboard mobile sidebar scrolls independently and locks background scrolling while open.
- Dashboard footer is removed so authenticated account routes behave as a contained app shell.
- Sidebar profile area becomes a direct account destination rather than opening a nested account popover.
- Account page respects the client auth loading state instead of briefly showing a false signed-out message.
- Profile photo/name mutations surface persistent-enough success/error feedback.
- Dashboard/account mobile padding is reduced to avoid cramped double gutters and unnecessary scrolling.

## Product principle
Mobile account UX should minimise nested navigation, false loading states and page-length chrome. Primary destinations should be reachable in one action, controls should meet comfortable touch sizes, and overlays should manage their own scrolling without moving the page underneath.

## Non-goals
No auth model, database schema, payment flow, booking behaviour or customer data model changes are part of this slice.
