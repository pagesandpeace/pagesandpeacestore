alter table app_core.customers
  add column if not exists profile_image text,
  add column if not exists email_verified boolean not null default false,
  add column if not exists signup_status text not null default 'active',
  add column if not exists auth_provider text,
  add column if not exists marketing_consent boolean,
  add column if not exists marketing_consent_at timestamp with time zone,
  add column if not exists beehiiv_subscribed boolean not null default false,
  add column if not exists beehiiv_subscribed_at timestamp with time zone,
  add column if not exists first_magic_link_sent_at timestamp with time zone,
  add column if not exists last_magic_link_sent_at timestamp with time zone,
  add column if not exists magic_link_send_count integer not null default 0,
  add column if not exists first_login_at timestamp with time zone,
  add column if not exists last_login_at timestamp with time zone,
  add column if not exists last_seen_at timestamp with time zone,
  add column if not exists last_magic_link_clicked_at timestamp with time zone,
  add column if not exists has_logged_in boolean not null default false;

update app_core.customers c
set display_name = u.name,
    email = lower(u.email),
    profile_image = u.image,
    email_verified = u.email_verified,
    signup_status = u.signup_status,
    auth_provider = u.auth_provider,
    marketing_consent = u.marketing_consent,
    marketing_consent_at = u.marketing_consent_at at time zone 'UTC',
    beehiiv_subscribed = coalesce(u.beehiiv_subscribed, false),
    beehiiv_subscribed_at = u.beehiiv_subscribed_at,
    first_magic_link_sent_at = u.first_magic_link_sent_at,
    last_magic_link_sent_at = u.last_magic_link_sent_at,
    magic_link_send_count = coalesce(u.magic_link_send_count, 0),
    first_login_at = u.first_login_at,
    last_login_at = u.last_login_at,
    last_seen_at = u.last_seen_at,
    last_magic_link_clicked_at = u.last_magic_link_clicked_at,
    has_logged_in = coalesce(u.has_logged_in, false),
    updated_at = greatest(c.updated_at, u.updated_at)
from public.users u
where c.auth_user_id = u.auth_user_id;

create table if not exists app_core.admins (
  auth_user_id uuid primary key,
  created_at timestamp with time zone not null default now()
);

insert into app_core.admins (auth_user_id, created_at)
select auth_user_id, created_at from public.admin_users
on conflict (auth_user_id) do update set created_at = excluded.created_at;

alter table app_core.admins enable row level security;
revoke all on table app_core.admins from anon, authenticated, public;
grant select, insert, update, delete on table app_core.admins to service_role;

comment on table app_core.admins is 'Server-only immutable Auth UUID allow-list for application administrators.';
