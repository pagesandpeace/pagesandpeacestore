-- Full Production history cutover into app_core.
-- Production public/auth data is the only source of truth.
-- Excludes public.orders.is_test = true.
-- Preserves legacy records; this migration never updates or deletes public legacy rows.
begin;
set transaction isolation level repeatable read;

-- Preserve historical identifiers and payment/customer snapshots that are not
-- required by the live checkout path but are required for audit fidelity.
alter table app_core.customers add column if not exists legacy_user_id text unique;
alter table app_core.events add column if not exists legacy_slug text;
alter table app_core.orders alter column auth_user_id drop not null;
alter table app_core.orders add column if not exists legacy_user_id text;
alter table app_core.orders add column if not exists legacy_status text;
alter table app_core.orders add column if not exists customer_name text;
alter table app_core.orders add column if not exists customer_email text;
alter table app_core.orders add column if not exists stripe_receipt_url text;
alter table app_core.orders add column if not exists stripe_card_brand text;
alter table app_core.orders add column if not exists stripe_last4 text;
alter table app_core.order_lines add column if not exists legacy_product_id uuid;
alter table app_core.bookings add column if not exists stripe_checkout_session_id text;
alter table app_core.bookings add column if not exists stripe_payment_intent_id text;
alter table app_core.bookings add column if not exists stripe_refund_id text;
alter table app_core.bookings add column if not exists refund_processed_at timestamp;
alter table app_core.bookings add column if not exists customer_name text;
alter table app_core.bookings add column if not exists customer_email text;
alter table app_core.refund_audit_logs add column if not exists legacy_refund_audit_id uuid unique;
alter table app_core.refund_audit_logs add column if not exists legacy_refund_scope text;
alter table app_core.refund_audit_logs add column if not exists stripe_payment_intent_id text;

create index if not exists app_core_order_lines_order_id_idx on app_core.order_lines(order_id);
create index if not exists app_core_order_lines_ticket_type_id_idx on app_core.order_lines(ticket_type_id);
create index if not exists app_core_bookings_order_line_id_idx on app_core.bookings(order_line_id);
create index if not exists app_core_bookings_ticket_type_id_idx on app_core.bookings(ticket_type_id);
create index if not exists app_core_payment_events_order_id_idx on app_core.payment_events(order_id);

-- Abort before writes if any genuine Production event booking cannot map to
-- its order, user/Auth identity, event or ticket type.
do $$
declare
  v_bad_bookings integer;
  v_bad_items integer;
  v_duplicate_checkout integer;
  v_duplicate_pi integer;
begin
  select count(*) into v_bad_bookings
  from public.event_bookings b
  join public.order_items oi on oi.id = b.order_item_id
  join public.orders o on o.id = oi.order_id
  left join public.users u on u.id = b.user_id
  left join auth.users a on a.id = u.auth_user_id
  left join public.events e on e.id = b.event_id
  left join public.event_ticket_types tt on tt.id = b.event_ticket_type_id
  where not coalesce(o.is_test, false)
    and (oi.kind <> 'event' or u.id is null or a.id is null or e.id is null or tt.id is null
      or b.quantity is null or b.quantity < 1);

  select count(*) into v_bad_items
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where not coalesce(o.is_test, false)
    and (oi.quantity is null or oi.quantity < 1 or oi.price is null or oi.price < 0
      or oi.kind not in ('event','product'));

  select count(*) into v_duplicate_checkout from (
    select stripe_checkout_session_id from public.orders
    where not coalesce(is_test,false)
    group by stripe_checkout_session_id having count(*) > 1
  ) x;

  select count(*) into v_duplicate_pi from (
    select stripe_payment_intent_id from public.orders
    where not coalesce(is_test,false)
    group by stripe_payment_intent_id having count(*) > 1
  ) x;

  if v_bad_bookings <> 0 then
    raise exception 'HISTORY_CUTOVER_PRECHECK_FAILED: genuine event booking relationships are incomplete';
  end if;
  if v_bad_items <> 0 then
    raise exception 'HISTORY_CUTOVER_PRECHECK_FAILED: genuine order item values are invalid';
  end if;
  if v_duplicate_checkout <> 0 or v_duplicate_pi <> 0 then
    raise exception 'HISTORY_CUTOVER_PRECHECK_FAILED: duplicate genuine Stripe order identifiers';
  end if;
end;
$$;

-- Every legacy user that still has a real Auth identity becomes an app_core
-- customer. Deleted identities are not recreated.
insert into app_core.customers (auth_user_id, legacy_user_id, display_name, email, created_at, updated_at)
select u.auth_user_id, u.id, u.name, lower(u.email), u.created_at, u.updated_at
from public.users u
join auth.users a on a.id = u.auth_user_id
on conflict (auth_user_id) do update
set legacy_user_id = excluded.legacy_user_id,
    display_name = excluded.display_name,
    email = excluded.email,
    created_at = least(app_core.customers.created_at, excluded.created_at),
    updated_at = greatest(app_core.customers.updated_at, excluded.updated_at);

-- Import every event referenced by a genuine historical order/booking.
with referenced_events as (
  select distinct oi.event_id
  from public.order_items oi join public.orders o on o.id=oi.order_id
  where oi.kind='event' and not coalesce(o.is_test,false) and oi.event_id is not null
  union
  select distinct b.event_id
  from public.event_bookings b
  join public.order_items oi on oi.id=b.order_item_id
  join public.orders o on o.id=oi.order_id
  where not coalesce(o.is_test,false)
), legacy as (
  select e.*,
    case
      when nullif(btrim(e.slug),'') is not null
       and count(*) over (partition by e.slug) = 1
       and not exists (select 1 from app_core.events ae where ae.slug=e.slug and ae.legacy_event_id is distinct from e.id)
      then e.slug
      else 'legacy-' || e.id::text
    end as cutover_slug
  from public.events e join referenced_events r on r.event_id=e.id
)
insert into app_core.events (
  legacy_event_id, legacy_slug, slug, title, subtitle, short_description, description,
  starts_at, capacity, image_url, status, created_at, updated_at
)
select id, slug, cutover_slug, title, subtitle, short_description, coalesce(description,''),
  date at time zone 'Europe/London', capacity, image_url,
  case when published then 'published' else 'archived' end,
  created_at at time zone 'Europe/London', updated_at at time zone 'Europe/London'
from legacy
on conflict (legacy_event_id) do update
set legacy_slug=excluded.legacy_slug,
    title=excluded.title, subtitle=excluded.subtitle,
    short_description=excluded.short_description, description=excluded.description,
    starts_at=excluded.starts_at, capacity=excluded.capacity, image_url=excluded.image_url,
    updated_at=excluded.updated_at;

-- Import all ticket types referenced by genuine orders/bookings.
with refs as (
  select distinct oi.event_ticket_type_id
  from public.order_items oi join public.orders o on o.id=oi.order_id
  where oi.kind='event' and not coalesce(o.is_test,false) and oi.event_ticket_type_id is not null
  union
  select distinct b.event_ticket_type_id
  from public.event_bookings b
  join public.order_items oi on oi.id=b.order_item_id
  join public.orders o on o.id=oi.order_id
  where not coalesce(o.is_test,false) and b.event_ticket_type_id is not null
)
insert into app_core.ticket_types (
  legacy_ticket_type_id, event_id, name, description, price_pence, capacity,
  is_active, created_at, updated_at
)
select tt.id, ae.id, tt.name, tt.description, tt.price_pence, null,
  tt.is_active, tt.created_at, tt.created_at
from refs r
join public.event_ticket_types tt on tt.id=r.event_ticket_type_id
join app_core.events ae on ae.legacy_event_id=tt.event_id
on conflict (legacy_ticket_type_id) do update
set event_id=excluded.event_id, name=excluded.name, description=excluded.description,
    price_pence=excluded.price_pence, is_active=excluded.is_active;

-- All genuine Production orders, preserving Stripe/payment and customer snapshot data.
insert into app_core.orders (
  legacy_order_id, legacy_user_id, auth_user_id, legacy_status, status,
  total_pence, currency, stripe_checkout_session_id, stripe_payment_intent_id,
  stripe_receipt_url, stripe_card_brand, stripe_last4,
  customer_name, customer_email, paid_at, created_at,
  refund_status, refunded_total_pence
)
select o.id, o.user_id,
  case when a.id is not null then u.auth_user_id else null end,
  o.status,
  case o.status when 'completed' then 'paid' when 'partially_refunded' then 'partially_refunded'
       when 'refunded' then 'refunded' else 'paid' end,
  round(o.total*100)::integer, 'gbp', o.stripe_checkout_session_id, o.stripe_payment_intent_id,
  o.stripe_receipt_url, o.stripe_card_brand, o.stripe_last4,
  o.customer_name, lower(o.customer_email), o.paid_at, o.created_at,
  coalesce(o.refund_status,'none'), round(coalesce(o.refunded_total,0)*100)::integer
from public.orders o
left join public.users u on u.id=o.user_id
left join auth.users a on a.id=u.auth_user_id
where not coalesce(o.is_test,false)
on conflict (legacy_order_id) do update
set legacy_user_id=excluded.legacy_user_id,
    auth_user_id=excluded.auth_user_id,
    legacy_status=excluded.legacy_status,
    status=excluded.status,
    total_pence=excluded.total_pence,
    stripe_checkout_session_id=excluded.stripe_checkout_session_id,
    stripe_payment_intent_id=excluded.stripe_payment_intent_id,
    stripe_receipt_url=excluded.stripe_receipt_url,
    stripe_card_brand=excluded.stripe_card_brand,
    stripe_last4=excluded.stripe_last4,
    customer_name=excluded.customer_name,
    customer_email=excluded.customer_email,
    paid_at=excluded.paid_at,
    refund_status=excluded.refund_status,
    refunded_total_pence=excluded.refunded_total_pence;

-- All genuine order lines. Product lines are retained as historical
-- future_product lines with their original legacy product ID.
insert into app_core.order_lines (
  legacy_order_item_id, legacy_product_id, order_id, item_type, ticket_type_id,
  item_name, quantity, unit_amount_pence, created_at,
  refunded_quantity, refunded_amount_pence
)
select oi.id, oi.product_id, ao.id,
  case when oi.kind='event' then 'event_ticket' else 'future_product' end,
  case when oi.kind='event' then att.id else null end,
  coalesce(nullif(oi.name,''), case when oi.kind='event' then 'Event ticket' else 'Product' end),
  oi.quantity, round(oi.price*100)::integer, o.created_at,
  coalesce(oi.refunded_quantity,0), round(coalesce(oi.refunded_amount,0)*100)::integer
from public.order_items oi
join public.orders o on o.id=oi.order_id and not coalesce(o.is_test,false)
join app_core.orders ao on ao.legacy_order_id=o.id
left join app_core.ticket_types att on att.legacy_ticket_type_id=oi.event_ticket_type_id
on conflict (legacy_order_item_id) do update
set legacy_product_id=excluded.legacy_product_id,
    order_id=excluded.order_id, item_type=excluded.item_type,
    ticket_type_id=excluded.ticket_type_id, item_name=excluded.item_name,
    quantity=excluded.quantity, unit_amount_pence=excluded.unit_amount_pence,
    refunded_quantity=excluded.refunded_quantity,
    refunded_amount_pence=excluded.refunded_amount_pence;

-- Genuine event bookings. The only legacy booking without order_item_id belongs
-- to the explicit Production test order and is therefore intentionally excluded.
insert into app_core.bookings (
  legacy_booking_id, order_line_id, event_id, ticket_type_id, auth_user_id,
  quantity, status, created_at, updated_at,
  stripe_checkout_session_id, stripe_payment_intent_id, stripe_refund_id,
  refund_processed_at, customer_name, customer_email
)
select b.id, aol.id, ae.id, att.id, u.auth_user_id,
  b.quantity,
  case when coalesce(b.refunded,false) then 'refunded'
       when coalesce(b.cancelled,false) then 'cancelled'
       when b.paid then 'confirmed' else 'pending' end,
  b.created_at, b.created_at,
  b.stripe_checkout_session_id, b.stripe_payment_intent_id, b.stripe_refund_id,
  b.refund_processed_at, b.name, lower(b.email)
from public.event_bookings b
join public.order_items oi on oi.id=b.order_item_id
join public.orders o on o.id=oi.order_id and not coalesce(o.is_test,false)
join public.users u on u.id=b.user_id
join auth.users a on a.id=u.auth_user_id
join app_core.events ae on ae.legacy_event_id=b.event_id
join app_core.ticket_types att on att.legacy_ticket_type_id=b.event_ticket_type_id
join app_core.order_lines aol on aol.legacy_order_item_id=b.order_item_id
on conflict (legacy_booking_id) do update
set order_line_id=excluded.order_line_id, event_id=excluded.event_id,
    ticket_type_id=excluded.ticket_type_id, auth_user_id=excluded.auth_user_id,
    quantity=excluded.quantity, status=excluded.status,
    stripe_checkout_session_id=excluded.stripe_checkout_session_id,
    stripe_payment_intent_id=excluded.stripe_payment_intent_id,
    stripe_refund_id=excluded.stripe_refund_id,
    refund_processed_at=excluded.refund_processed_at,
    customer_name=excluded.customer_name, customer_email=excluded.customer_email;

-- Preserve legacy refund audit records. Legacy booking-level refunds map to the
-- corresponding order line while retaining their original scope explicitly.
insert into app_core.refund_audit_logs (
  legacy_refund_audit_id, legacy_refund_scope, order_id, order_line_id, scope,
  amount_pence, reason, notes, stripe_payment_intent_id, stripe_refund_id,
  status, initiated_by_auth_user_id, initiated_by_email,
  customer_email, customer_name, created_at, updated_at
)
select r.id, r.refund_scope, ao.id, aol.id,
  case when r.order_item_id is not null or r.event_booking_id is not null then 'order_line' else 'order' end,
  round(r.amount*100)::integer, r.reason, r.notes, r.stripe_payment_intent_id, r.stripe_refund_id,
  case when r.status='succeeded' then 'succeeded' when r.status='failed' then 'failed' else 'initiated' end,
  r.initiated_by_auth_user_id, r.initiated_by_email,
  lower(r.customer_email), r.customer_name, r.created_at, r.created_at
from public.refund_audit_logs r
left join app_core.orders ao on ao.legacy_order_id=r.order_id
left join public.event_bookings b on b.id=r.event_booking_id
left join app_core.order_lines aol on aol.legacy_order_item_id=coalesce(r.order_item_id,b.order_item_id)
where ao.id is not null
on conflict (legacy_refund_audit_id) do update
set legacy_refund_scope=excluded.legacy_refund_scope,
    order_id=excluded.order_id, order_line_id=excluded.order_line_id,
    scope=excluded.scope, amount_pence=excluded.amount_pence,
    reason=excluded.reason, notes=excluded.notes,
    stripe_payment_intent_id=excluded.stripe_payment_intent_id,
    stripe_refund_id=excluded.stripe_refund_id,
    status=excluded.status, initiated_by_auth_user_id=excluded.initiated_by_auth_user_id,
    initiated_by_email=excluded.initiated_by_email,
    customer_email=excluded.customer_email, customer_name=excluded.customer_name;

-- Hard reconciliation: transaction aborts if counts or money differ.
do $$
declare
  s_orders bigint; t_orders bigint;
  s_lines bigint; t_lines bigint;
  s_bookings bigint; t_bookings bigint;
  s_booking_qty bigint; t_booking_qty bigint;
  s_total bigint; t_total bigint;
  s_refunded bigint; t_refunded bigint;
  s_line_gross bigint; t_line_gross bigint;
  s_line_refunded bigint; t_line_refunded bigint;
begin
  select count(*), coalesce(sum(round(total*100)::bigint),0), coalesce(sum(round(coalesce(refunded_total,0)*100)::bigint),0)
    into s_orders,s_total,s_refunded
  from public.orders where not coalesce(is_test,false);
  select count(*), coalesce(sum(total_pence),0), coalesce(sum(refunded_total_pence),0)
    into t_orders,t_total,t_refunded
  from app_core.orders where legacy_order_id is not null;

  select count(*), coalesce(sum(round(price*quantity*100)::bigint),0), coalesce(sum(round(coalesce(refunded_amount,0)*100)::bigint),0)
    into s_lines,s_line_gross,s_line_refunded
  from public.order_items oi join public.orders o on o.id=oi.order_id where not coalesce(o.is_test,false);
  select count(*), coalesce(sum(unit_amount_pence*quantity),0), coalesce(sum(refunded_amount_pence),0)
    into t_lines,t_line_gross,t_line_refunded
  from app_core.order_lines where legacy_order_item_id is not null;

  select count(*), coalesce(sum(b.quantity),0)
    into s_bookings,s_booking_qty
  from public.event_bookings b join public.order_items oi on oi.id=b.order_item_id
  join public.orders o on o.id=oi.order_id where not coalesce(o.is_test,false);
  select count(*), coalesce(sum(quantity),0)
    into t_bookings,t_booking_qty
  from app_core.bookings where legacy_booking_id is not null;

  if s_orders<>t_orders or s_lines<>t_lines or s_bookings<>t_bookings
     or s_booking_qty<>t_booking_qty or s_total<>t_total or s_refunded<>t_refunded
     or s_line_gross<>t_line_gross or s_line_refunded<>t_line_refunded then
    raise exception 'HISTORY_CUTOVER_RECONCILIATION_FAILED source %,%,%,%,%,%,%,% target %,%,%,%,%,%,%,%',
      s_orders,s_lines,s_bookings,s_booking_qty,s_total,s_refunded,s_line_gross,s_line_refunded,
      t_orders,t_lines,t_bookings,t_booking_qty,t_total,t_refunded,t_line_gross,t_line_refunded;
  end if;
end;
$$;

commit;
