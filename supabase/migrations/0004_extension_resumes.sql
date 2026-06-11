-- Per-user resume storage for the Edaix browser extension.
-- Distinct from public.resume_artifacts (which is tied to the analyze/optimize
-- AI funnel); this table is the user's reusable "master" resume(s).

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text,
  resume_text text not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resumes_user_id_idx on public.resumes(user_id);

-- At most one current resume per user.
create unique index if not exists resumes_one_current_per_user
  on public.resumes(user_id)
  where is_current;

drop trigger if exists set_resumes_updated_at on public.resumes;
create trigger set_resumes_updated_at
before update on public.resumes
for each row execute function public.set_updated_at();

alter table public.resumes enable row level security;

drop policy if exists "resumes_select_own" on public.resumes;
create policy "resumes_select_own"
on public.resumes
for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on table public.resumes to authenticated;
