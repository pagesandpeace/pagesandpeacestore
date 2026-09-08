-- Production compatibility for the hardened menu and opening-hours UI.
-- This preserves all existing Production menu items and maps categories only.

create table if not exists public.menu_sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  position integer not null default 0,
  display_mode text not null default 'menu_tab' check (display_mode in ('menu_tab', 'standalone')),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.menu_sections enable row level security;
grant select on public.menu_sections to anon, authenticated;
drop policy if exists "Public can read visible menu sections" on public.menu_sections;
create policy "Public can read visible menu sections"
  on public.menu_sections for select to anon, authenticated
  using (is_visible = true);

alter table public.menu_categories
  add column if not exists website_area text,
  add column if not exists section_id uuid;
alter table public.menu_categories
  drop constraint if exists menu_categories_website_area_check;
alter table public.menu_categories
  add constraint menu_categories_website_area_check
  check (website_area in ('drinks', 'food', 'snacks', 'merch'));
alter table public.menu_categories
  drop constraint if exists menu_categories_section_id_fkey;
alter table public.menu_categories
  add constraint menu_categories_section_id_fkey
  foreign key (section_id) references public.menu_sections(id) on delete set null;

insert into public.menu_sections (name, slug, position, display_mode, is_visible)
values
  ('Drinks', 'drinks', 1, 'menu_tab', true),
  ('Food', 'food', 2, 'menu_tab', true),
  ('Snacks', 'snacks', 3, 'menu_tab', true)
on conflict (slug) do update
set name = excluded.name, position = excluded.position, display_mode = excluded.display_mode, is_visible = excluded.is_visible, updated_at = now();

update public.menu_categories c
set website_area = case
  when c.name in ('Hot Drinks', 'Syrups', 'Cold Drinks', 'Extras', 'Smoothies', 'Milkshakes', 'Alt Milk') then 'drinks'
  else 'food'
end,
section_id = s.id
from public.menu_sections s
where s.slug = case
  when c.name in ('Hot Drinks', 'Syrups', 'Cold Drinks', 'Extras', 'Smoothies', 'Milkshakes', 'Alt Milk') then 'drinks'
  else 'food'
end;

create table if not exists public.opening_hours (
  day_of_week smallint primary key check (day_of_week between 1 and 7),
  day_name text not null,
  open_time time,
  close_time time,
  is_closed boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.opening_hours enable row level security;
grant select on public.opening_hours to anon, authenticated;
drop policy if exists "Public can read opening hours" on public.opening_hours;
create policy "Public can read opening hours"
  on public.opening_hours for select to anon, authenticated
  using (true);

insert into public.opening_hours (day_of_week, day_name, open_time, close_time, is_closed)
values
  (1, 'Monday', '09:00', '20:00', false),
  (2, 'Tuesday', '09:00', '20:00', false),
  (3, 'Wednesday', '09:00', '20:00', false),
  (4, 'Thursday', '09:00', '17:00', false),
  (5, 'Friday', '09:00', '17:00', false),
  (6, 'Saturday', '09:00', '17:00', false),
  (7, 'Sunday', '10:00', '16:00', false)
on conflict (day_of_week) do update
set day_name = excluded.day_name,
    open_time = excluded.open_time,
    close_time = excluded.close_time,
    is_closed = excluded.is_closed,
    updated_at = now();
