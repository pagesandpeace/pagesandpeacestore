-- Private, server-only controls for the rebuilt authentication and webhook flow.
create table if not exists app_core.auth_rate_limits (
  bucket text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table app_core.auth_rate_limits enable row level security;
revoke all on table app_core.auth_rate_limits from public, anon, authenticated;

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

create table if not exists app_core.webhook_receipts (
  id text primary key,
  source text not null,
  received_at timestamptz not null default now()
);

alter table app_core.webhook_receipts enable row level security;
revoke all on table app_core.webhook_receipts from public, anon, authenticated;

-- Legacy functions are not used by the rebuilt app. They must not remain public
-- RPC endpoints while the old public schema is retained for historical data.
revoke all on function public.get_admin_dashboard_metrics() from public, anon, authenticated;
revoke all on function public.get_food_reconciliation_day(date) from public, anon, authenticated;
revoke all on function public.get_low_stock_products(integer) from public, anon, authenticated;
revoke all on function public.handle_auth_user_upsert() from public, anon, authenticated;
revoke all on function public.reconcile_event_order(uuid, boolean) from public, anon, authenticated;

-- Preserve the view but make it honour the querying role's permissions.
alter view public.daily_food_flow set (security_invoker = true);
