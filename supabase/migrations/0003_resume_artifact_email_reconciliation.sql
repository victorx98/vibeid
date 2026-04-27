alter table public.resume_artifacts
  add column if not exists candidate_email text,
  add column if not exists confirmed_email text,
  add column if not exists email_confirmed_at timestamptz;

create index if not exists resume_artifacts_confirmed_email_idx
  on public.resume_artifacts(confirmed_email)
  where confirmed_email is not null;
