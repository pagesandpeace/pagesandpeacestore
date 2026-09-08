-- Production launch: mirror Production's own future-event continuity data.
-- Run only after 20260908090100_production_app_core_schema.sql.
-- This does not delete or update any legacy public-schema record.
begin;
set transaction isolation level repeatable read;

do $$
declare
  v_future_events integer;
  v_future_tickets integer;
  v_active_bookings integer;
  v_bad_bookings integer;
  v_bad_order_item_shapes integer;
  v_bad_values integer;
begin
  select count(*) into v_future_events
  from public.events e
  where e.published is true and e.date at time zone 'Europe/London' > now();

  select count(*) into v_future_tickets
  from public.event_ticket_types tt
  join public.events e on e.id = tt.event_id
  where e.published is true and e.date at time zone 'Europe/London' > now()
    and tt.is_active is true;

  select count(*) into v_active_bookings
  from public.event_bookings b
  join public.events e on e.id = b.event_id
  where e.date at time zone 'Europe/London' > now()
    and b.paid is true and not coalesce(b.cancelled, false) and not coalesce(b.refunded, false);

  select count(*) into v_bad_bookings
  from public.event_bookings b
  join public.events e on e.id = b.event_id
  left join public.users u on u.id = b.user_id
  left join auth.users a on a.id = u.auth_user_id
  left join public.order_items oi on oi.id = b.order_item_id
  left join public.event_ticket_types tt on tt.id = b.event_ticket_type_id
  where e.date at time zone 'Europe/London' > now()
    and b.paid is true and not coalesce(b.cancelled, false) and not coalesce(b.refunded, false)
    and (a.id is null or oi.id is null or tt.id is null or b.quantity is null or b.quantity < 1);

  select count(*) into v_bad_order_item_shapes
  from (
    select b.order_item_id
    from public.event_bookings b
    join public.events e on e.id = b.event_id
    join public.order_items oi on oi.id = b.order_item_id
    where e.date at time zone 'Europe/London' > now()
      and b.paid is true and not coalesce(b.cancelled, false) and not coalesce(b.refunded, false)
    group by b.order_item_id, oi.quantity
    having count(distinct b.event_id) > 1
       or count(distinct b.event_ticket_type_id) > 1
       or sum(b.quantity) <> oi.quantity
  ) inconsistent_order_items;

  select count(*) into v_bad_values
  from public.events e
  where e.published is true and e.date at time zone 'Europe/London' > now()
    and (e.capacity is null or e.capacity < 0 or nullif(trim(e.slug), '') is null);

  if v_future_events = 0 or v_future_tickets <> v_future_events then
    raise exception 'CUTOVER_PRECHECK_FAILED: expected one active ticket type for every future published event';
  end if;
  if v_bad_bookings <> 0 or v_bad_order_item_shapes <> 0 or v_bad_values <> 0 then
    raise exception 'CUTOVER_PRECHECK_FAILED: legacy future-booking relationships are inconsistent';
  end if;
end;
$$;

-- Customers required by the current future bookings. Existing identities are
-- preserved through auth_user_id; no Auth user is created or changed.
insert into app_core.customers (auth_user_id, display_name, email, created_at, updated_at)
select distinct u.auth_user_id, u.name, lower(u.email), u.created_at, u.updated_at
from public.event_bookings b
join public.events e on e.id = b.event_id
join public.users u on u.id = b.user_id
where e.date at time zone 'Europe/London' > now()
  and b.paid is true and not coalesce(b.cancelled, false) and not coalesce(b.refunded, false)
on conflict (auth_user_id) do update
set display_name = excluded.display_name, email = excluded.email, updated_at = excluded.updated_at;

insert into app_core.events (
  legacy_event_id, slug, title, subtitle, short_description, description,
  starts_at, capacity, image_url, status, created_at, updated_at
)
select e.id, e.slug, e.title, e.subtitle, e.short_description, coalesce(e.description, ''),
  e.date at time zone 'Europe/London', e.capacity, e.image_url, 'published',
  e.created_at at time zone 'Europe/London', e.updated_at at time zone 'Europe/London'
from public.events e
where e.published is true and e.date at time zone 'Europe/London' > now()
on conflict (legacy_event_id) do update
set slug = excluded.slug, title = excluded.title, subtitle = excluded.subtitle,
  short_description = excluded.short_description, description = excluded.description,
  starts_at = excluded.starts_at, capacity = excluded.capacity, image_url = excluded.image_url,
  status = excluded.status, updated_at = excluded.updated_at;

-- Legacy inventory_count is not used as a ticket cap: it may already be a
-- remaining-stock value. Event capacity plus imported active bookings remains
-- the authoritative safe limit until ticket caps are explicitly audited.
insert into app_core.ticket_types (
  legacy_ticket_type_id, event_id, name, description, price_pence, capacity,
  is_active, created_at, updated_at
)
select tt.id, ae.id, tt.name, tt.description, tt.price_pence, null,
  tt.is_active, tt.created_at, tt.created_at
from public.event_ticket_types tt
join public.events e on e.id = tt.event_id
join app_core.events ae on ae.legacy_event_id = e.id
where e.published is true and e.date at time zone 'Europe/London' > now()
  and tt.is_active is true
on conflict (legacy_ticket_type_id) do update
set event_id = excluded.event_id, name = excluded.name, description = excluded.description,
  price_pence = excluded.price_pence, is_active = excluded.is_active, updated_at = excluded.updated_at;

insert into app_core.orders (
  legacy_order_id, auth_user_id, status, total_pence, currency,
  stripe_checkout_session_id, stripe_payment_intent_id, paid_at, created_at
)
select distinct o.id, u.auth_user_id, 'paid', round(o.total * 100)::integer, 'gbp',
  o.stripe_checkout_session_id, o.stripe_payment_intent_id, o.paid_at, o.created_at
from public.event_bookings b
join public.events e on e.id = b.event_id
join public.order_items oi on oi.id = b.order_item_id
join public.orders o on o.id = oi.order_id
join public.users u on u.id = b.user_id
where e.date at time zone 'Europe/London' > now()
  and b.paid is true and not coalesce(b.cancelled, false) and not coalesce(b.refunded, false)
on conflict (legacy_order_id) do nothing;

insert into app_core.order_lines (
  legacy_order_item_id, order_id, item_type, ticket_type_id, item_name,
  quantity, unit_amount_pence, created_at
)
select distinct on (oi.id)
  oi.id, ao.id, 'event_ticket', att.id, e.title || ' — ' || tt.name,
  oi.quantity, round(oi.price * 100)::integer, b.created_at
from public.event_bookings b
join public.events e on e.id = b.event_id
join public.event_ticket_types tt on tt.id = b.event_ticket_type_id
join public.order_items oi on oi.id = b.order_item_id
join public.orders o on o.id = oi.order_id
join app_core.orders ao on ao.legacy_order_id = o.id
join app_core.ticket_types att on att.legacy_ticket_type_id = tt.id
where e.date at time zone 'Europe/London' > now()
  and b.paid is true and not coalesce(b.cancelled, false) and not coalesce(b.refunded, false)
order by oi.id, b.created_at
on conflict (legacy_order_item_id) do nothing;

insert into app_core.bookings (
  legacy_booking_id, order_line_id, event_id, ticket_type_id, auth_user_id,
  quantity, status, created_at, updated_at
)
select b.id, aol.id, ae.id, att.id, u.auth_user_id,
  b.quantity, 'confirmed', b.created_at, b.created_at
from public.event_bookings b
join public.events e on e.id = b.event_id
join public.event_ticket_types tt on tt.id = b.event_ticket_type_id
join public.users u on u.id = b.user_id
join app_core.events ae on ae.legacy_event_id = e.id
join app_core.ticket_types att on att.legacy_ticket_type_id = tt.id
join app_core.order_lines aol on aol.legacy_order_item_id = b.order_item_id
where e.date at time zone 'Europe/London' > now()
  and b.paid is true and not coalesce(b.cancelled, false) and not coalesce(b.refunded, false)
on conflict (legacy_booking_id) do nothing;

do $$
declare
  v_source_events integer; v_source_tickets integer; v_source_bookings integer; v_source_quantity integer;
  v_target_events integer; v_target_tickets integer; v_target_bookings integer; v_target_quantity integer;
begin
  select count(*) into v_source_events from public.events e where e.published and e.date at time zone 'Europe/London' > now();
  select count(*) into v_source_tickets from public.event_ticket_types tt join public.events e on e.id=tt.event_id where e.published and e.date at time zone 'Europe/London' > now() and tt.is_active;
  select count(*), coalesce(sum(b.quantity),0) into v_source_bookings, v_source_quantity from public.event_bookings b join public.events e on e.id=b.event_id where e.date at time zone 'Europe/London' > now() and b.paid and not coalesce(b.cancelled,false) and not coalesce(b.refunded,false);
  select count(*) into v_target_events from app_core.events where legacy_event_id is not null;
  select count(*) into v_target_tickets from app_core.ticket_types where legacy_ticket_type_id is not null;
  select count(*), coalesce(sum(quantity),0) into v_target_bookings, v_target_quantity from app_core.bookings where legacy_booking_id is not null;
  if v_source_events <> v_target_events or v_source_tickets <> v_target_tickets or v_source_bookings <> v_target_bookings or v_source_quantity <> v_target_quantity then
    raise exception 'CUTOVER_RECONCILIATION_FAILED: source and app_core continuity counts differ';
  end if;
end;
$$;

commit;
