create schema if not exists vibeid;

create table if not exists vibeid.mentors (
  id integer primary key,
  name text not null,
  company text,
  title text,
  location text,
  industry_expertise text,
  coaching_positions text,
  tech_skills text,
  credibility_signal text,
  career_path text,
  insight_scope text,
  rating double precision,
  session_count integer,
  created_at timestamp without time zone default current_timestamp,
  active boolean not null default true,
  consent_status text not null default 'pending_review',
  consent_source text,
  consent_scope text,
  unique (name, company)
);

create table if not exists vibeid.source_students (
  id integer primary key,
  name_en text not null,
  name_zh text,
  email text,
  school text,
  major text,
  gpa text,
  graduation_year text,
  experience_level text,
  target_roles text,
  resume_strengths text,
  resume_weaknesses text,
  key_experiences text,
  background_summary text,
  created_at timestamp without time zone default current_timestamp,
  unique (name_en)
);

create table if not exists vibeid.sessions (
  id integer primary key,
  session_date text not null,
  mentor_id integer not null references vibeid.mentors(id),
  student_id integer not null references vibeid.source_students(id),
  source_file text,
  direction text,
  transcript_line_range text,
  notes text,
  created_at timestamp without time zone default current_timestamp
);

create table if not exists vibeid.segments (
  id integer primary key,
  session_id integer not null references vibeid.sessions(id),
  segment_id text not null,
  source_file text,
  source_line text,
  topic text,
  resume_section text,
  "L1" text,
  "L2" text,
  "L3" text,
  "P_student" text,
  "P_mentor" text,
  "L_logic" text,
  "A_action" text,
  "I_insight" text,
  "I_scope" text,
  "E_example" text,
  "H_hook" text,
  "F_formula" text,
  "HR_os" text,
  "T_experience" text,
  "T_industry" text,
  "T_role" text,
  confidence text check (confidence in ('high', 'medium', 'low')),
  generality text,
  created_at timestamp without time zone default current_timestamp,
  target_student_archetype text,
  resume_section_tag text,
  advice_type text,
  keyword_tags text,
  industry_fit integer,
  background_fit integer,
  level_fit integer,
  trigger_conditions text,
  unique (session_id, segment_id)
);

create table if not exists vibeid.before_after_pairs (
  id integer primary key,
  session_id integer not null references vibeid.sessions(id),
  pair_order integer,
  before_text text,
  after_text text,
  reason text,
  issue_tags text,
  "C_cta" text,
  freq_stat text,
  mentor_quote text,
  "L3_tag" text,
  source_segment text,
  notes text,
  created_at timestamp without time zone default current_timestamp
);

create table if not exists vibeid.migration_runs (
  id bigserial primary key,
  source_path text not null,
  source_sha256 text not null,
  mode text not null check (mode in ('dry-run', 'apply')),
  table_counts jsonb not null,
  table_checksums jsonb not null,
  expected_counts jsonb not null,
  inserted_at timestamptz not null default now()
);

create index if not exists vibeid_sessions_student_idx on vibeid.sessions(student_id);
create index if not exists vibeid_sessions_mentor_idx on vibeid.sessions(mentor_id);

create index if not exists vibeid_segments_session_idx on vibeid.segments(session_id);
create index if not exists vibeid_segments_l1_idx on vibeid.segments("L1");
create index if not exists vibeid_segments_l2_idx on vibeid.segments("L2");
create index if not exists vibeid_segments_confidence_idx on vibeid.segments(confidence);
create index if not exists vibeid_segments_generality_idx on vibeid.segments(generality);
create index if not exists vibeid_segments_t_role_idx on vibeid.segments("T_role");
create index if not exists vibeid_segments_fit_idx on vibeid.segments(industry_fit, background_fit, level_fit);
create index if not exists vibeid_segments_advice_type_idx on vibeid.segments(advice_type);

create index if not exists vibeid_before_after_session_idx on vibeid.before_after_pairs(session_id);

create index if not exists vibeid_mentors_active_idx on vibeid.mentors(active);
create index if not exists vibeid_mentors_company_idx on vibeid.mentors(company);

revoke all on schema vibeid from anon, authenticated, public;
revoke all on all tables in schema vibeid from anon, authenticated, public;
revoke all on all sequences in schema vibeid from anon, authenticated, public;

alter default privileges in schema vibeid revoke all on tables from anon, authenticated, public;
alter default privileges in schema vibeid revoke all on sequences from anon, authenticated, public;
