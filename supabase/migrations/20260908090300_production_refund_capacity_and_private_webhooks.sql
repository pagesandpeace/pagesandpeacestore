-- Finalise only the rebuilt app_core path. This migration does not alter
-- legacy public data, legacy functions, Auth users, orders, or bookings.

create table if not exists app_core.auth_rate_limits (
  bucket text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table app_core.auth_rate_limits enable row level security;
revoke all on table app_core.auth_rate_limits from public, anon, authenticated;
grant select, insert, update on table app_core.auth_rate_limits to service_role;

create or replace function app_core.consume_auth_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security invoker
set search_path = app_core, pg_temp
as $$
declare
  allowed boolean;
begin
  if p_limit < 1 or p_window_seconds < 1 then return false; end if;
  insert into app_core.auth_rate_limits as rate (bucket, window_started_at, request_count, updated_at)
  values (p_bucket, now(), 1, now())
  on conflict (bucket) do update
  set request_count = case when rate.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1 else rate.request_count + 1 end,
      window_started_at = case when rate.window_started_at <= now() - make_interval(secs => p_window_seconds) then now() else rate.window_started_at end,
      updated_at = now()
  returning request_count <= p_limit into allowed;
  return coalesce(allowed, false);
end;
$$;
revoke all on function app_core.consume_auth_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function app_core.consume_auth_rate_limit(text, integer, integer) to service_role;

create table if not exists app_core.webhook_receipts (
  id text primary key,
  source text not null,
  received_at timestamptz not null default now()
);

alter table app_core.webhook_receipts enable row level security;
revoke all on table app_core.webhook_receipts from public, anon, authenticated;
grant select, insert on table app_core.webhook_receipts to service_role;

create or replace function app_core.reserve_event_checkout(p_auth_user_id uuid, p_items jsonb)
returns table(order_id uuid, total_pence integer, line_items jsonb)
language plpgsql
security invoker
set search_path to ''
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
  if p_auth_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = '22023'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'INVALID_ITEMS' using errcode = '22023';
  end if;

  update app_core.bookings b set status = 'cancelled', updated_at = now()
  from app_core.order_lines ol join app_core.orders o on o.id = ol.order_id
  where b.order_line_id = ol.id and b.status = 'pending' and o.status = 'pending' and o.reservation_expires_at < now();
  update app_core.orders set status = 'cancelled' where status = 'pending' and reservation_expires_at < now();

  for v_item in
    select (entry->>'ticketTypeId')::uuid as ticket_type_id, sum((entry->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as entry group by (entry->>'ticketTypeId')::uuid
  loop
    if v_item.quantity < 1 or v_item.quantity > 10 then raise exception 'INVALID_QUANTITY' using errcode = '22023'; end if;
    select e.* into v_event from app_core.ticket_types tt join app_core.events e on e.id = tt.event_id
      where tt.id = v_item.ticket_type_id for update of e;
    select * into v_ticket from app_core.ticket_types where id = v_item.ticket_type_id;
    if not found or v_event.id is null or v_event.status <> 'published' or v_event.starts_at <= now() or not v_ticket.is_active then
      raise exception 'TICKET_UNAVAILABLE' using errcode = '22023';
    end if;

    select coalesce(sum(case when b.status = 'pending' then b.quantity when b.status = 'confirmed' then greatest(0, b.quantity - coalesce(ol.refunded_quantity, 0)) else 0 end), 0)::integer
      into v_event_reserved
      from app_core.bookings b join app_core.order_lines ol on ol.id = b.order_line_id
      where b.event_id = v_event.id and b.status in ('pending', 'confirmed');
    select coalesce(sum(case when b.status = 'pending' then b.quantity when b.status = 'confirmed' then greatest(0, b.quantity - coalesce(ol.refunded_quantity, 0)) else 0 end), 0)::integer
      into v_ticket_reserved
      from app_core.bookings b join app_core.order_lines ol on ol.id = b.order_line_id
      where b.ticket_type_id = v_ticket.id and b.status in ('pending', 'confirmed');
    if v_event_reserved + v_item.quantity > v_event.capacity or (v_ticket.capacity is not null and v_ticket_reserved + v_item.quantity > v_ticket.capacity) then
      raise exception 'NOT_ENOUGH_SEATS' using errcode = '22023';
    end if;
    v_total := v_total + (v_ticket.price_pence * v_item.quantity);
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('event_id', v_event.id, 'ticket_type_id', v_ticket.id, 'item_name', v_event.title || ' — ' || v_ticket.name, 'quantity', v_item.quantity, 'unit_amount_pence', v_ticket.price_pence));
  end loop;

  insert into app_core.orders (auth_user_id, status, total_pence, currency, reservation_expires_at)
  values (p_auth_user_id, 'pending', v_total, 'gbp', now() + interval '30 minutes') returning id into v_order_id;
  for v_item in select * from jsonb_to_recordset(v_lines) as x(event_id uuid, ticket_type_id uuid, item_name text, quantity integer, unit_amount_pence integer)
  loop
    insert into app_core.order_lines (order_id, item_type, ticket_type_id, item_name, quantity, unit_amount_pence)
    values (v_order_id, 'event_ticket', v_item.ticket_type_id, v_item.item_name, v_item.quantity, v_item.unit_amount_pence) returning id into v_line_id;
    insert into app_core.bookings (order_line_id, event_id, ticket_type_id, auth_user_id, quantity, status)
    values (v_line_id, v_item.event_id, v_item.ticket_type_id, p_auth_user_id, v_item.quantity, 'pending');
  end loop;
  return query select v_order_id, v_total, v_lines;
end;
$$;

revoke all on function app_core.reserve_event_checkout(uuid, jsonb) from public, anon, authenticated;
grant execute on function app_core.reserve_event_checkout(uuid, jsonb) to service_role;
