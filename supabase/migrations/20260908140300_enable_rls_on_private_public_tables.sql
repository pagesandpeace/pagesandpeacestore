begin;

alter table public.bom_components enable row level security;
alter table public.event_attendance enable row level security;
alter table public.event_interest enable row level security;
alter table public.food_sales_imports enable row level security;
alter table public.food_sales_items enable row level security;
alter table public.menu_items_backup enable row level security;
alter table public.product_boms enable row level security;
alter table public.product_suppliers enable row level security;
alter table public.stripe_events enable row level security;
alter table public.supplier_invoices enable row level security;

commit;
