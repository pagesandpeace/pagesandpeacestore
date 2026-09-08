-- Hide retired traybakes from the public menu while retaining legacy product history.
update public.menu_items i
set is_visible = false
from public.menu_categories c
where i.category_id = c.id
  and c.name = 'Traybakes'
  and i.name in (
    'Rocky Road',
    'Vegan Cookie Choc & Peanut Butter',
    'Biscoff Crunch Bar',
    'Dark Chocolate Christmas Brownie',
    'Oreo crunch',
    'Vegan Chocolate & Peanut Cookie'
  );
