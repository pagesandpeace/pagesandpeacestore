alter table public.menu_items add column if not exists is_visible boolean not null default true;

update public.menu_items set is_visible = false where name = 'Brownie (NGC) (V) - Small';

update public.menu_categories
set position = position + 1
where name in ('Alt Milk', 'Syrups', 'Extras') and position >= 3;

insert into public.menu_categories (name, position)
select 'Milkshakes', 3 where not exists (select 1 from public.menu_categories where name = 'Milkshakes');
insert into public.menu_categories (name, position)
select 'Jacket Potatoes', 121 where not exists (select 1 from public.menu_categories where name = 'Jacket Potatoes');
insert into public.menu_categories (name, position)
select 'Filled Croissants', 122 where not exists (select 1 from public.menu_categories where name = 'Filled Croissants');

insert into public.menu_items (category_id, name, price, position, note)
select c.id, v.name, v.price, v.position, v.note
from public.menu_categories c cross join (values ('Red Bull', 2.20::numeric, 5, null::text)) as v(name, price, position, note)
where c.name = 'Cold Drinks' and not exists (select 1 from public.menu_items i where i.category_id = c.id and i.name = v.name);

insert into public.menu_items (category_id, name, price, position, note)
select c.id, v.name, v.price, v.position, v.note
from public.menu_categories c cross join (values
  ('Biscoff', 4.75::numeric, 1, null::text),
  ('Kinder Bueno', 4.75::numeric, 2, null::text),
  ('Oreo', 4.75::numeric, 3, null::text)
) as v(name, price, position, note)
where c.name = 'Milkshakes' and not exists (select 1 from public.menu_items i where i.category_id = c.id and i.name = v.name);

insert into public.menu_items (category_id, name, price, position, note)
select c.id, v.name, v.price, v.position, v.note
from public.menu_categories c cross join (values
  ('Jacket potato with cheese', 8.00::numeric, 1, null::text),
  ('Jacket potato with cheese & beans', 8.00::numeric, 2, null::text),
  ('Jacket potato with tuna mayonnaise', 8.00::numeric, 3, null::text),
  ('Add coleslaw', 0.50::numeric, 4, null::text),
  ('Add crisps', 0.50::numeric, 5, null::text),
  ('Add salad', 0.50::numeric, 6, null::text)
) as v(name, price, position, note)
where c.name = 'Jacket Potatoes' and not exists (select 1 from public.menu_items i where i.category_id = c.id and i.name = v.name);

insert into public.menu_items (category_id, name, price, position, note)
select c.id, v.name, v.price, v.position, v.note
from public.menu_categories c cross join (values
  ('Strawberry & chocolate spread croissant', 4.00::numeric, 1, null::text),
  ('Ham & cheese croissant', 4.75::numeric, 2, null::text)
) as v(name, price, position, note)
where c.name = 'Filled Croissants' and not exists (select 1 from public.menu_items i where i.category_id = c.id and i.name = v.name);
