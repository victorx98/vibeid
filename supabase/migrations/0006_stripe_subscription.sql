alter table billing.orders
  add column if not exists stripe_subscription_id text unique;
