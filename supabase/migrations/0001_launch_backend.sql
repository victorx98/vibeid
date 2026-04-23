create extension if not exists pgcrypto;

create schema if not exists billing;
create schema if not exists ai;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.resume_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_text text not null,
  target_role text not null,
  job_description text,
  ats_result jsonb,
  competition jsonb,
  mentor_advice jsonb,
  analysis_result jsonb,
  optimized_resume text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_resume_artifacts_updated_at on public.resume_artifacts;
create trigger set_resume_artifacts_updated_at
before update on public.resume_artifacts
for each row execute function public.set_updated_at();

alter table public.resume_artifacts enable row level security;

drop policy if exists "resume_artifacts_select_own" on public.resume_artifacts;
create policy "resume_artifacts_select_own"
on public.resume_artifacts
for select
to authenticated
using ((select auth.uid()) = user_id);

create table if not exists billing.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artifact_id uuid references public.resume_artifacts(id) on delete set null,
  product_tier text not null check (product_tier in ('basic', 'resume')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  status text not null default 'pending',
  amount integer,
  currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_orders_updated_at on billing.orders;
create trigger set_orders_updated_at
before update on billing.orders
for each row execute function public.set_updated_at();

alter table billing.orders enable row level security;

drop policy if exists "orders_select_own" on billing.orders;
create policy "orders_select_own"
on billing.orders
for select
to authenticated
using ((select auth.uid()) = user_id);

create table if not exists billing.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_tier text not null check (product_tier in ('basic', 'resume')),
  source_order_id uuid references billing.orders(id) on delete set null,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_order_id, product_tier)
);

drop trigger if exists set_entitlements_updated_at on billing.entitlements;
create trigger set_entitlements_updated_at
before update on billing.entitlements
for each row execute function public.set_updated_at();

alter table billing.entitlements enable row level security;

drop policy if exists "entitlements_select_own" on billing.entitlements;
create policy "entitlements_select_own"
on billing.entitlements
for select
to authenticated
using ((select auth.uid()) = user_id);

create table if not exists billing.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists ai.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artifact_id uuid references public.resume_artifacts(id) on delete cascade,
  kind text not null check (kind in ('analyze', 'optimize')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  progress_stage text,
  input_hash text not null,
  input_payload jsonb,
  result jsonb,
  error_code text,
  error_message text,
  heartbeat_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_user_id_idx on ai.jobs(user_id);
create index if not exists jobs_artifact_id_idx on ai.jobs(artifact_id);
create index if not exists jobs_status_heartbeat_idx on ai.jobs(status, heartbeat_at);

drop trigger if exists set_jobs_updated_at on ai.jobs;
create trigger set_jobs_updated_at
before update on ai.jobs
for each row execute function public.set_updated_at();

alter table ai.jobs enable row level security;

drop policy if exists "jobs_select_own" on ai.jobs;
create policy "jobs_select_own"
on ai.jobs
for select
to authenticated
using ((select auth.uid()) = user_id);

grant usage on schema billing, ai to authenticated;
grant select on table public.resume_artifacts to authenticated;
grant select on table billing.orders, billing.entitlements to authenticated;
grant select on table ai.jobs to authenticated;
