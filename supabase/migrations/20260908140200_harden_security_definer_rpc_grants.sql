begin;

-- Trigger functions and reconciliation helpers are never client-callable.
revoke execute on function public.handle_auth_user_upsert() from public, anon, authenticated;
revoke execute on function public.reconcile_event_order(uuid, boolean) from public, anon, authenticated;
grant execute on function public.reconcile_event_order(uuid, boolean) to service_role;

-- Admin metrics performs its own auth.uid()/admin-role check. Keep authenticated
-- admin access, but remove anonymous execution.
revoke execute on function public.get_admin_dashboard_metrics() from public, anon;
grant execute on function public.get_admin_dashboard_metrics() to authenticated, service_role;

-- Low-stock data is administrative. It is used by admin/server-side paths only.
revoke execute on function public.get_low_stock_products(integer) from public, anon;
grant execute on function public.get_low_stock_products(integer) to authenticated, service_role;

alter function public.get_low_stock_products(integer) set search_path = public, pg_temp;
alter function public.reconcile_event_order(uuid, boolean) set search_path = public, pg_temp;

commit;
