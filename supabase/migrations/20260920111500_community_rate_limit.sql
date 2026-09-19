create or replace function app_core.consume_rate_limit(
  p_bucket text,
  p_window_seconds integer,
  p_max_requests integer
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  now_ts timestamptz := pg_catalog.now();
  current_count integer;
begin
  if p_bucket is null or p_window_seconds < 1 or p_max_requests < 1 then
    return false;
  end if;

  insert into app_core.auth_rate_limits (bucket, window_started_at, request_count, updated_at)
  values (p_bucket, now_ts, 1, now_ts)
  on conflict (bucket) do update
  set
    window_started_at = case
      when app_core.auth_rate_limits.window_started_at <= now_ts - pg_catalog.make_interval(secs => p_window_seconds)
        then now_ts
      else app_core.auth_rate_limits.window_started_at
    end,
    request_count = case
      when app_core.auth_rate_limits.window_started_at <= now_ts - pg_catalog.make_interval(secs => p_window_seconds)
        then 1
      else app_core.auth_rate_limits.request_count + 1
    end,
    updated_at = now_ts
  returning request_count into current_count;

  return current_count <= p_max_requests;
end;
$$;

revoke execute on function app_core.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function app_core.consume_rate_limit(text, integer, integer) to service_role;
