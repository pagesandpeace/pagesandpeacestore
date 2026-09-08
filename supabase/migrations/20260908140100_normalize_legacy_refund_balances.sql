-- Preserve legacy order-level refund fields, then normalize canonical refund
-- balances from line-level refund data. This prevents historical orders whose
-- legacy order.refunded_total was stale from being refundable again.
begin;

alter table app_core.orders add column if not exists legacy_refund_status text;
alter table app_core.orders add column if not exists legacy_refunded_total_pence integer;

update app_core.orders ao
set legacy_refund_status = o.refund_status,
    legacy_refunded_total_pence = round(coalesce(o.refunded_total,0)*100)::integer
from public.orders o
where ao.legacy_order_id = o.id
  and not coalesce(o.is_test,false);

with line_refunds as (
  select order_id,
         coalesce(sum(refunded_amount_pence),0)::integer as refunded_pence
  from app_core.order_lines
  where legacy_order_item_id is not null
  group by order_id
)
update app_core.orders ao
set refunded_total_pence = lr.refunded_pence,
    refund_status = case
      when lr.refunded_pence <= 0 then 'none'
      when lr.refunded_pence >= ao.total_pence then 'full'
      else 'partial'
    end,
    status = case
      when lr.refunded_pence <= 0 then ao.status
      when lr.refunded_pence >= ao.total_pence then 'refunded'
      else 'partially_refunded'
    end
from line_refunds lr
where ao.id = lr.order_id
  and ao.legacy_order_id is not null;

do $$
declare
  v_over bigint;
  v_source bigint;
  v_target bigint;
begin
  select count(*) into v_over
  from app_core.orders
  where legacy_order_id is not null
    and refunded_total_pence > total_pence;

  select coalesce(sum(round(coalesce(oi.refunded_amount,0)*100)::bigint),0)
  into v_source
  from public.order_items oi
  join public.orders o on o.id=oi.order_id
  where not coalesce(o.is_test,false);

  select coalesce(sum(ao.refunded_total_pence),0)
  into v_target
  from app_core.orders ao
  where ao.legacy_order_id is not null;

  if v_over <> 0 or v_source <> v_target then
    raise exception 'LEGACY_REFUND_NORMALIZATION_FAILED source % target % over_refunded %', v_source, v_target, v_over;
  end if;
end;
$$;

commit;
