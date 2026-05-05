-- KB context enrichment: enriched source_students, session job context, segment metadata
-- Enables advice retrieval based on student background + target role + resume issue type

alter table vibeid.source_students
  add column if not exists target_job_title    text,
  add column if not exists target_industry     text,
  add column if not exists target_company_type text,
  add column if not exists education_level     text,
  add column if not exists years_experience    text,
  add column if not exists key_skills          text,
  add column if not exists weakness_tags       text,
  add column if not exists visa_status         text;

alter table vibeid.sessions
  add column if not exists target_job_title text,
  add column if not exists seniority_level  text;

alter table vibeid.segments
  add column if not exists target_job_title        text,
  add column if not exists target_seniority        text,
  add column if not exists student_background_tags text,
  add column if not exists issue_tags              text,
  add column if not exists outcome_quality         text;

alter table vibeid.segments drop column if exists "P_student";

create index if not exists vibeid_segments_target_job_idx on vibeid.segments(target_job_title);
create index if not exists vibeid_segments_issue_tags_idx on vibeid.segments(issue_tags);
create index if not exists vibeid_sessions_target_job_idx on vibeid.sessions(target_job_title);
