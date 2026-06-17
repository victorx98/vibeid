-- Rename legacy billing product tier `resume` to `premium`.
alter table billing.orders
  drop constraint if exists orders_product_tier_check;

alter table billing.entitlements
  drop constraint if exists entitlements_product_tier_check;

update billing.orders
set product_tier = 'premium'
where product_tier = 'resume';

update billing.entitlements
set product_tier = 'premium'
where product_tier = 'resume';

alter table billing.orders
  add constraint orders_product_tier_check
  check (product_tier in ('basic', 'premium'));

alter table billing.entitlements
  add constraint entitlements_product_tier_check
  check (product_tier in ('basic', 'premium'));
