  # Product Launch Hardening Plan

  ## Summary
  - Current launch blockers in the repo: access control is client-side only (`sessionStorage` / `localStorage`), user data is not recoverable across devices, the mentor KB is a local
  SQLite file with a hard-coded fallback path, payments are simulated in the UI, AI work is synchronous with no queue/retry/idempotency model, and there is no production-grade ops/
  observability layer.
  - Target production architecture: Next.js app for UI/BFF, Supabase for Auth/Postgres/Storage/Realtime, a dedicated background worker for long AI jobs, and a provider-abstracted
  billing layer with Stripe as the primary processor and WeChat support behind the same order/entitlement model.
  - Vendor constraints validated against official docs: Stripe WeChat Pay works for US Stripe accounts, supports one-time payments, has no recurring support, and uses async refund/
  webhook flows; Supabase Auth uses JWT + RLS; Supabase Storage is governed by RLS; Supabase Edge Functions are good for webhooks/light orchestration, but heavy long-running jobs
  should move to workers and paid plans still have a 400s wall-clock cap.

  ## Key Changes

  ### Auth and persistence
  - Replace browser-only gating with Supabase Auth plus server-checked entitlements.
  - Launch with guest sessions for trial use, require auth before payment, and block paid routes from reading client flags as a source of truth.
  - Add `public.profiles`, `public.user_roles`, `public.guest_sessions`, and `public.consent_events`.
  - Unclaimed guest sessions expire after 7 days; claimed user history remains indefinite.

  ### User artifacts and storage
  - Add `public.resumes`, `public.job_descriptions`, `public.analysis_reports`, `public.optimized_resumes`, and `public.vibe_pages`.
  - Treat analysis and optimization outputs as immutable snapshots linked to the source resume/JD pair; reruns create new rows.
  - Use private Supabase buckets for `resume-originals` and `resume-derived`.
  - Use a separate `vibe-public` bucket or signed-link flow for shareable Vibe pages.
  - Enforce access with RLS on `storage.objects` scoped by `auth.uid()``.
  - Never expose the service key to the browser.

  ### Knowledge base migration
  - Move the local SQLite corpus into a `kb` schema with `kb.import_batches`, `kb.mentors`, `kb.coaching_sessions`, `kb.segments`, and `kb.before_after_pairs`.
  - Keep it internal-only at launch with offline import tooling, versioned batches, soft-deactivation, and search-ready fields/tags.

  ### AI workflow hardening
  - Convert `analyze` and `optimize` from synchronous request/response endpoints into async job creation.
  - Add `ai.jobs`, `ai.job_events`, and `ai.provider_calls`.
  - Each job tracks state, progress, attempts, error code, prompt/model version, cost, and output artifact IDs.
  - Web app validates request, persists inputs, enqueues a job, and returns `202 + job_id`.
  - Use Supabase Realtime for progress with polling fallback.
  - Run the actual LLM pipeline in a dedicated worker service that claims jobs with locking, enforces concurrency, retries retryable failures, and marks terminal failures cleanly.
  - Add per-user and per-IP quotas, upload size/MIME validation, dedupe by file hash, idempotency keys, retry only on retryable failures, timeout budgets per step, stuck-job reaper,
  cancellation support, and structured error taxonomies.

  ### Payment system
  - Add `billing.products`, `billing.prices`, `billing.orders`, `billing.order_items`, `billing.payment_sessions`, `billing.payments`, `billing.refunds`, `billing.webhook_events`, and
  `billing.entitlements`.
  - Price lookup must be server-side only; the client never submits authoritative amounts or entitlements.
  - Use Stripe Checkout for launch for one-time packages.
  - Enable Stripe WeChat Pay where the Stripe account and business setup support it.
  - Keep a provider abstraction so a second WeChat-capable PSP can be added later without changing order/entitlement tables.
  - Grant access only from verified webhook outcomes, not client redirects.
  - Handle duplicate webhooks idempotently, store raw webhook payloads, reconcile payment state asynchronously, and support `active`, `revoked`, and `refunded` entitlements.

  ### Ops, security, and launch blockers
  - Ship a minimal internal console for users, artifacts, jobs, payments, refunds, and support notes.
  - Remove any browser-side pattern that could carry an Anthropic API key.
  - Keep all LLM calls server-side.
  - Add Terms/Privacy consent capture for internal artifact reuse.
  - Implement delete/export flows and audit all privileged support/admin actions.
  - Add Sentry, structured logs, product analytics, CI, migrations, staging environments, DB backups and restore drills, rate limiting, CAPTCHA on upload/payment endpoints, and cross-
  device resume recovery after sign-in.

  ## Public Interfaces and Behavior Changes
  - `POST /api/analyze` and `POST /api/optimize-resume` become async command endpoints returning `job_id`, not full payloads.
  - Add `GET /api/jobs/:id` plus a Supabase Realtime subscription channel for progress and status updates.
  - Add server-owned billing endpoints for order creation and checkout-session creation, plus provider webhook endpoints for Stripe and any secondary WeChat provider.
  - Paid pages must authorize against server-side `billing.entitlements` and artifact ownership, not `unlockedTiers` in browser storage.

  ## Test Plan
  - Guest upload -> analyze -> sign in -> claim artifacts -> pay -> revisit from a second device and recover the full history.
  - One user cannot read another user’s resumes, outputs, storage objects, jobs, or entitlements.
  - Concurrent analyze/optimize jobs run without request timeout.
  - Retries are idempotent.
  - Worker crash/restart does not lose jobs.
  - User-visible errors map to stable failure states.
  - Successful checkout grants entitlement exactly once.
  - Duplicate webhooks are harmless.
  - Expired or canceled checkout grants nothing.
  - Refund revokes or refunds correctly.
  - WeChat async refund completion updates entitlement state correctly.
  - Admin can inspect a user, job, or order, issue a refund, attach an internal note, and audit logs capture the action.
  - Rehearse staging-to-prod migration, KB import replay, backup restore, and smoke tests on login/upload/analyze/pay/optimize/share.

  ## Assumptions and Defaults
  - Launch market is US + overseas Chinese.
  - Billing model is one-time packages.
  - Guest trial is allowed but payment requires auth.
  - User history is indefinite after account claim.
  - Unclaimed guest work expires after 7 days.
  - Launch auth methods default to email magic link plus Google.
  - Phone auth and WeChat login are deferred.
  - Internal reuse of user artifacts is allowed, but it must be disclosed and recorded in consent events.
  - The KB remains internal and offline-imported at launch.
  - Heavy AI execution runs on a dedicated worker service, not solely on Supabase Edge Functions.

  ## References
  - Stripe WeChat Pay: https://docs.stripe.com/payments/wechat-pay
  - Supabase Auth: https://supabase.com/docs/guides/auth
  - Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
  - Supabase Edge Functions: https://supabase.com/docs/guides/functions
  - Supabase Background Tasks: https://supabase.com/docs/guides/functions/background-tasks
  - Supabase Function Limits: https://supabase.com/docs/guides/functions/limits

