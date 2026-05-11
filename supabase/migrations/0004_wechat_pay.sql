alter table billing.orders
  add column if not exists payment_provider text,
  add column if not exists provider_channel text,
  add column if not exists provider_order_id text,
  add column if not exists provider_payment_id text,
  add column if not exists provider_payload jsonb;

update billing.orders
set payment_provider = 'stripe',
    provider_channel = coalesce(provider_channel, 'checkout'),
    provider_order_id = coalesce(provider_order_id, stripe_checkout_session_id),
    provider_payment_id = coalesce(provider_payment_id, stripe_payment_intent_id)
where payment_provider is null
  and stripe_checkout_session_id is not null;

update billing.orders
set payment_provider = coalesce(payment_provider, 'stripe'),
    provider_channel = coalesce(provider_channel, 'checkout')
where payment_provider is null;

alter table billing.orders
  alter column payment_provider set default 'stripe',
  alter column payment_provider set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_payment_provider_check'
      and conrelid = 'billing.orders'::regclass
  ) then
    alter table billing.orders
      add constraint orders_payment_provider_check
      check (payment_provider in ('stripe', 'wechat'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_provider_channel_check'
      and conrelid = 'billing.orders'::regclass
  ) then
    alter table billing.orders
      add constraint orders_provider_channel_check
      check (
        provider_channel is null
        or provider_channel in ('checkout', 'native', 'h5', 'jsapi')
      );
  end if;
end $$;

create unique index if not exists orders_provider_order_id_unique
  on billing.orders(payment_provider, provider_order_id)
  where provider_order_id is not null;

create unique index if not exists orders_provider_payment_id_unique
  on billing.orders(payment_provider, provider_payment_id)
  where provider_payment_id is not null;

create table if not exists billing.wechat_events (
  id text primary key,
  type text not null,
  provider_order_id text,
  provider_payment_id text,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists billing.wechat_payers (
  user_id uuid not null references auth.users(id) on delete cascade,
  appid text not null,
  openid text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, appid)
);

drop trigger if exists set_wechat_payers_updated_at on billing.wechat_payers;
create trigger set_wechat_payers_updated_at
before update on billing.wechat_payers
for each row execute function public.set_updated_at();

alter table billing.wechat_events enable row level security;
alter table billing.wechat_payers enable row level security;
