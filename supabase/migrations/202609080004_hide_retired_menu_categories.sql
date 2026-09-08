-- Hide retired menu categories without deleting linked legacy product records.
update public.menu_items i
set is_visible = false
from public.menu_categories c
where i.category_id = c.id
  and c.name in ('Cakes', 'Savoury', 'Viennoiserie');
