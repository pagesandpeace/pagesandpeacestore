grant insert, update on table app_core.customers to service_role;

revoke all on table app_core.customers from anon, authenticated;
revoke all on table app_core.admins from anon, authenticated;

grant select on table app_core.admins to service_role;
