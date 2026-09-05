-- app_core multi-event checkout foundation
-- Staging verified against Supabase project ehbzvkynjcrewlzjgtkq.
begin;

alter table app_core.orders
  add column if not exists reservation_expires_at timestamptz;

create index if not exists orders_pending_expiry_idx
  on app_core.orders (reservation_expires_at)
  where status = 'pending';

create index if not exists bookings_event_status_idx
  on app_core.bookings (event_id, status);

create table if not exists app_core.email_deliveries (
  order_id uuid primary key references app_core.orders(id) on delete restrict,
  kind text not null check (kind in ('booking_confirmation')),
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table app_core.email_deliveries enable row level security;
revoke all on table app_core.email_deliveries from public, anon, authenticated;
grant select, insert, update on table app_core.email_deliveries to service_role;

create or replace function app_core.reserve_event_checkout(
  p_auth_user_id uuid,
  p_items jsonb
)
returns table (
  order_id uuid,
  total_pence integer,
  line_items jsonb
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item record;
  v_event app_core.events%rowtype;
  v_ticket app_core.ticket_types%rowtype;
  v_requested integer;
  v_event_reserved integer;
  v_ticket_reserved integer;
  v_total integer := 0;
  v_order_id uuid;
  v_line_id uuid;
  v_lines jsonb := '[]'::jsonb;
begin
  if p_auth_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'INVALID_ITEMS' using errcode = '22023';
  end if;

  update app_core.bookings b
  set status = 'cancelled', updated_at = now()
  from app_core.order_lines ol
  join app_core.orders o on o.id = ol.order_id
  where b.order_line_id = ol.id
    and b.status = 'pending'
    and o.status = 'pending'
    and o.reservation_expires_at < now();

  update app_core.orders
  set status = 'cancelled'
  where status = 'pending'
    and reservation_expires_at < now();

  for v_item in
    select (entry->>'ticketTypeId')::uuid as ticket_type_id,
           sum((entry->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as entry
    group by (entry->>'ticketTypeId')::uuid
  loop
    if v_item.quantity < 1 or v_item.quantity > 10 then
      raise exception 'INVALID_QUANTITY' using errcode = '22023';
    end if;

    select e.* into v_event
    from app_core.ticket_types tt
    join app_core.events e on e.id = tt.event_id
    where tt.id = v_item.ticket_type_id
    for update of e;

    select * into v_ticket
    from app_core.ticket_types
    where id = v_item.ticket_type_id;

    if not found or v_event.id is null or v_event.status <> 'published' or v_event.starts_at <= now() or not v_ticket.is_active then
      raise exception 'TICKET_UNAVAILABLE' using errcode = '22023';
    end if;

    select coalesce(sum(b.quantity), 0)::integer into v_event_reserved
    from app_core.bookings b
    where b.event_id = v_event.id
      and b.status in ('pending', 'confirmed');

    select coalesce(sum(b.quantity), 0)::integer into v_ticket_reserved
    from app_core.bookings b
    where b.ticket_type_id = v_ticket.id
      and b.status in ('pending', 'confirmed');

    if v_event_reserved + v_item.quantity > v_event.capacity
       or (v_ticket.capacity is not null and v_ticket_reserved + v_item.quantity > v_ticket.capacity) then
      raise exception 'NOT_ENOUGH_SEATS' using errcode = '22023';
    end if;

    v_total := v_total + (v_ticket.price_pence * v_item.quantity);
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'event_id', v_event.id,
      'ticket_type_id', v_ticket.id,
      'item_name', v_event.title || ' — ' || v_ticket.name,
      'quantity', v_item.quantity,
      'unit_amount_pence', v_ticket.price_pence
    ));
  end loop;

  insert into app_core.orders (auth_user_id, status, total_pence, currency, reservation_expires_at)
  values (p_auth_user_id, 'pending', v_total, 'gbp', now() + interval '30 minutes')
  returning id into v_order_id;

  for v_item in select * from jsonb_to_recordset(v_lines) as x(
    event_id uuid, ticket_type_id uuid, item_name text, quantity integer, unit_amount_pence integer
  )
  loop
    insert into app_core.order_lines (order_id, item_type, ticket_type_id, item_name, quantity, unit_amount_pence)
    values (v_order_id, 'event_ticket', v_item.ticket_type_id, v_item.item_name, v_item.quantity, v_item.unit_amount_pence)
    returning id into v_line_id;

    insert into app_core.bookings (order_line_id, event_id, ticket_type_id, auth_user_id, quantity, status)
    values (v_line_id, v_item.event_id, v_item.ticket_type_id, p_auth_user_id, v_item.quantity, 'pending');
  end loop;

  return query select v_order_id, v_total, v_lines;
end;
$$;

revoke all on function app_core.reserve_event_checkout(uuid, jsonb) from public, anon, authenticated;
grant execute on function app_core.reserve_event_checkout(uuid, jsonb) to service_role;

create or replace function app_core.confirm_event_checkout(
  p_stripe_event_id text,
  p_event_type text,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_payload jsonb
)
returns table (
  order_id uuid,
  should_send_confirmation boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order app_core.orders%rowtype;
  v_inserted boolean := false;
begin
  insert into app_core.payment_events (stripe_event_id, event_type, payload)
  values (p_stripe_event_id, p_event_type, p_payload)
  on conflict (stripe_event_id) do nothing;

  get diagnostics v_inserted = row_count;

  select * into v_order
  from app_core.orders
  where stripe_checkout_session_id = p_checkout_session_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = '22023';
  end if;

  update app_core.payment_events
  set order_id = v_order.id, processed_at = now()
  where stripe_event_id = p_stripe_event_id;

  if v_order.status = 'paid' then
    return query select v_order.id, false;
    return;
  end if;

  update app_core.orders
  set status = 'paid',
      stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
      paid_at = now(),
      reservation_expires_at = null
  where id = v_order.id and status = 'pending';

  if not found then
    raise exception 'ORDER_NOT_PAYABLE' using errcode = '22023';
  end if;

  update app_core.bookings b
  set status = 'confirmed', updated_at = now()
  from app_core.order_lines ol
  where b.order_line_id = ol.id and ol.order_id = v_order.id and b.status = 'pending';

  return query select v_order.id, true;
end;
$$;

revoke all on function app_core.confirm_event_checkout(text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function app_core.confirm_event_checkout(text, text, text, text, jsonb) to service_role;

grant select, insert, update on table app_core.events to service_role;
grant select, insert, update on table app_core.ticket_types to service_role;
grant select on table app_core.customers to service_role;
grant select, insert, update on table app_core.orders to service_role;
grant select, insert on table app_core.order_lines to service_role;
grant select, insert, update on table app_core.bookings to service_role;
grant select, insert, update on table app_core.payment_events to service_role;

commit;