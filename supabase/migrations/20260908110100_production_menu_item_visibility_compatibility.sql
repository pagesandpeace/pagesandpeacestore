-- Compatibility column required by the hardened public menu reader.
alter table public.menu_items
  add column if not exists is_visible boolean not null default true;
