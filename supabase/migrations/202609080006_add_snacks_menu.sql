insert into public.menu_categories (name, position)
select 'Snacks', 130
where not exists (select 1 from public.menu_categories where name = 'Snacks');

insert into public.menu_items (category_id, name, price, position, note)
select c.id, v.name, v.price, v.position, null::text
from public.menu_categories c
cross join (values
  ('Walkers Biscuits', 1.20::numeric, 1),
  ('Campfire Pretzels', 3.95::numeric, 2),
  ('Chocolate Rice Cakes', 2.20::numeric, 3),
  ('Shortbread Fingers', 1.50::numeric, 4)
) as v(name, price, position)
where c.name='Snacks'
  and not exists (
    select 1 from public.menu_items i
    where i.category_id=c.id and i.name=v.name
  );
