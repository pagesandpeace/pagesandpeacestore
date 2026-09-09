grant usage on schema app_core to service_role;
grant select, insert, update on table app_core.customers to service_role;
revoke delete on table app_core.customers from service_role;
revoke all on schema app_core from anon, authenticated;
revoke all on table app_core.customers from anon, authenticated;
