-- Production launch: additive rebuilt-event schema.
-- Deliberately contains no staging data and does not alter public legacy rows.
begin;

create schema if not exists app_core;
revoke all on schema app_core from public, anon, authenticated;
grant usage on schema app_core to service_role;

create table if not exists app_core.customers (
  auth_user_id uuid primary key references auth.users(id) on delete restrict,
  display_name text,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_core.events (
  id uuid primary key default gen_random_uuid(),
  legacy_event_id uuid unique,
  slug text not null unique,
  title text not null,
  subtitle text,
  short_description text,
  description text not null,
  starts_at timestamptz not null,
  capacity integer not null check (capacity >= 0),
  image_url text,
  status text not null default 'draft' check (status in ('draft','published','cancelled','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  series_name text
);

create table if not exists app_core.ticket_types (
  id uuid primary key default gen_random_uuid(),
  legacy_ticket_type_id uuid unique,
  event_id uuid not null references app_core.events(id) on delete restrict,
  name text not null,
  description text,
  price_pence integer not null check (price_pence >= 0),
  capacity integer check (capacity is null or capacity >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_core.orders (
  id uuid primary key default gen_random_uuid(),
  legacy_order_id uuid unique,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','paid','cancelled','refunded','partially_refunded','failed')),
  total_pence integer not null check (total_pence >= 0),
  currency text not null default 'gbp' check (currency = lower(currency)),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  reservation_expires_at timestamptz,
  refund_status text not null default 'none',
  refunded_total_pence integer not null default 0
);

create table if not exists app_core.order_lines (
  id uuid primary key default gen_random_uuid(),
  legacy_order_item_id uuid unique,
  order_id uuid not null references app_core.orders(id) on delete restrict,
  item_type text not null default 'event_ticket' check (item_type in ('event_ticket','future_product')),
  ticket_type_id uuid references app_core.ticket_types(id) on delete restrict,
  item_name text not null,
  quantity integer not null check (quantity > 0),
  unit_amount_pence integer not null check (unit_amount_pence >= 0),
  created_at timestamptz not null default now(),
  refunded_quantity integer not null default 0 check (refunded_quantity >= 0 and refunded_quantity <= quantity),
  refunded_amount_pence integer not null default 0 check (refunded_amount_pence >= 0),
  check ((item_type = 'event_ticket' and ticket_type_id is not null) or item_type = 'future_product')
);

create table if not exists app_core.bookings (
  id uuid primary key default gen_random_uuid(),
  legacy_booking_id uuid unique,
  order_line_id uuid not null references app_core.order_lines(id) on delete restrict,
  event_id uuid not null references app_core.events(id) on delete restrict,
  ticket_type_id uuid not null references app_core.ticket_types(id) on delete restrict,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  status text not null default 'confirmed' check (status in ('pending','confirmed','cancelled','refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_core.payment_events (
  stripe_event_id text primary key,
  order_id uuid references app_core.orders(id) on delete restrict,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload jsonb not null,
  processing_error text
);

create table if not exists app_core.email_deliveries (
  order_id uuid primary key references app_core.orders(id) on delete restrict,
  kind text not null check (kind in ('booking_confirmation')),
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists app_core.refund_audit_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references app_core.orders(id) on delete cascade,
  order_line_id uuid references app_core.order_lines(id) on delete set null,
  scope text not null check (scope in ('order','order_line')),
  amount_pence integer not null check (amount_pence > 0),
  reason text,
  notes text,
  stripe_refund_id text,
  status text not null default 'initiated' check (status in ('initiated','stripe_succeeded_syncing','stripe_succeeded_sync_failed','succeeded','failed')),
  initiated_by_auth_user_id uuid,
  initiated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  customer_email text,
  customer_name text,
  email_status text not null default 'not_attempted',
  resend_email_id text,
  email_error text,
  refunded_quantity integer
);

create table if not exists app_core.auth_rate_limits (
  bucket text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists app_core.webhook_receipts (
  id text primary key,
  source text not null,
  received_at timestamptz not null default now()
);

create index if not exists app_core_events_starts_at_idx on app_core.events(starts_at);
create index if not exists app_core_ticket_types_event_id_idx on app_core.ticket_types(event_id);
create index if not exists app_core_orders_auth_user_id_idx on app_core.orders(auth_user_id);
create index if not exists app_core_bookings_auth_user_id_idx on app_core.bookings(auth_user_id);
create index if not exists app_core_bookings_event_id_idx on app_core.bookings(event_id);
create index if not exists bookings_event_status_idx on app_core.bookings(event_id, status);
create index if not exists orders_pending_expiry_idx on app_core.orders(reservation_expires_at) where status = 'pending';
create index if not exists app_core_refund_audit_order_idx on app_core.refund_audit_logs(order_id);
create index if not exists app_core_refund_audit_line_idx on app_core.refund_audit_logs(order_line_id);

alter table app_core.customers enable row level security;
alter table app_core.events enable row level security;
alter table app_core.ticket_types enable row level security;
alter table app_core.orders enable row level security;
alter table app_core.order_lines enable row level security;
alter table app_core.bookings enable row level security;
alter table app_core.payment_events enable row level security;
alter table app_core.email_deliveries enable row level security;
alter table app_core.refund_audit_logs enable row level security;
alter table app_core.auth_rate_limits enable row level security;
alter table app_core.webhook_receipts enable row level security;

revoke all on all tables in schema app_core from public, anon, authenticated;
grant select on app_core.customers to service_role;
grant select, insert, update on app_core.events, app_core.ticket_types, app_core.orders,
  app_core.order_lines, app_core.bookings, app_core.payment_events,
  app_core.email_deliveries, app_core.refund_audit_logs to service_role;

commit;
