# Product Launch Hardening Plan — v2

## Why v2
v1 (`launch-hardening-plan.md`) correctly diagnoses the foundational rewrites needed to go from the current prototype to production: Supabase-backed auth/storage/RLS, async worker-based AI jobs, server-owned billing with webhook-driven entitlements, and an ops baseline. This v2 keeps that direction intact and folds in the critical issues that v1 either missed, underspecified, or got risky about for the stated market (US + overseas Chinese, one-time Stripe + Stripe WeChat Pay).

Everything in v1 that isn't restated below still stands. v2 is the source of truth where the two conflict.

---

## 1. Current-State Ground Truth
Anchored in the repo as it exists today, not aspirational:

- **Auth:** none. Gating is `sessionStorage.unlockedTiers` read in `app/sales/page.tsx:28-36` and `lib/session.ts:5-22`. No middleware, no cookies.
- **Payments:** fully simulated. `components/shared/PaymentModal.tsx:26-38` is a 1500ms fake success; `app/sales/page.tsx:26-30` just writes `unlockedTiers: ['basic']` to client storage. No Stripe/WeChat code anywhere.
- **Persistence:** none beyond a read-only SQLite KB opened at `app/api/analyze/route.ts:270-339`. No `INSERT`/`UPDATE` in any route.
- **Hardcoded dev path:** `app/api/analyze/route.ts:8` still falls back to `C:/Users/Eric/myproject/resume_material_library.db`.
- **Public browser-callable Claude sample:** `public/vibe-id-sample/assets/js/chat.js` reads `window.ANTHROPIC_API_KEY` and issues direct browser calls with `anthropic-dangerous-direct-browser-access: true`. Served as a public static asset under the Next app.
- **AI calls:** synchronous, no timeouts, no retries, no rate limits, no per-user quotas. `lib/claude.ts` has no `AbortController`.
- **Input safety:** API routes cast request bodies with `as` (no runtime schema). `POST /api/parse-resume` reads the entire upload into memory before any size check (`parse-resume/route.ts:11`). Error responses include `detail: String(error)` leaking stack info.
- **Ops baseline:** no `.env.example`, no `.github/workflows`, no Sentry, no logger, no test framework, no migration tool, no `typecheck`/`test` script, no `engines` field. `next.config.ts` has zero security headers and no CSP.

---

## 2. Critical Issues v1 Missed (Launch Blockers)

### 2.1 Mainland-China accessibility of Stripe Checkout is not validated
A non-trivial slice of the paying audience will hit checkout from inside mainland China, often inside the **WeChat in-app browser**, which has aggressive CSP/CORS behavior and may block Stripe's iframe/redirect flow. Stripe's own domains can be slow or unreachable from mainland without a VPN.
- Pre-launch connectivity matrix: WeChat in-app browser on mainland mobile, mainland desktop, overseas cellular, overseas desktop.
- Explicit fallback: if Stripe Checkout fails to load within N seconds (or detected-environment is WeChat in-app on mainland), route user to a WeChat-native redirect flow.
- Make WeChat Pay the **default** mainland path, not a secondary option.

### 2.2 ICP filing and China-reachable CDN
The production domain plus all static assets (JS, fonts, images, webfonts, analytics beacons) must be reachable from mainland China. If assets live on a China-throttled CDN, the funnel dies before login.
- Decide: ICP-filed `.cn` (or ICP-filed `.com`) for the paid funnel, or overseas-only launch.
- Pick a CDN with genuine China performance (Cloudflare China Network, Alibaba Cloud CDN, or similar) — **not** a generic US-edged CDN.
- Remove any Google Fonts / Google Analytics / reCAPTCHA dependencies (all throttled in China). Use Cloudflare Turnstile for CAPTCHA.

### 2.3 Stripe WeChat Pay constraints the plan glossed over
Stripe WeChat Pay is **one-time only, asynchronous refund, account-activation gated**.
- Confirm the US Stripe account is already activated for WeChat Pay (multi-week lead time if not).
- Document accepted currencies and FX impact on a CNY-feeling audience paying in USD.
- Refund state machine must model `pending_provider` → `completed_provider` distinctly from card refunds (card refunds are synchronous; WeChat refunds complete via a later webhook).
- No recurring / no saved payment method — upsells must re-checkout each time.

### 2.4 Prompt-injection via user uploads
The product ingests user-controlled PDF/DOC/DOCX text and feeds it into multiple Claude prompts. A malicious resume can embed "ignore prior instructions" attacks or attempt exfiltration of the system prompt or KB content.
- Strict prompt structure with explicit `<user_resume>` fencing, and system instructions that forbid acting on instructions inside user content.
- Moderation pass (Claude moderation or cheap classifier) on **both** inputs and outputs.
- Defined refusal policy (self-harm, hate, competitor exfiltration attempts).
- Red-team suite: a set of adversarial PDFs runs on every prompt/model version bump.

### 2.5 LLM cost caps and budget circuit breaker
v1 tracks cost in `ai.provider_calls` but defines no spend guard. The free guest trial is exploitable at 5+ Claude calls per analyze.
- Per-IP and per-user daily job quotas (already named).
- Per-user cumulative USD cap with clean refusal.
- Global kill-switch env var that halts all new job enqueues when exceeded.
- Alert on per-hour cost > threshold (PagerDuty / email).

### 2.6 Worker platform and queue technology
v1 leaves this undefined, which invites late re-architecture.
- **Default choice:** `pg-boss` on the same Supabase Postgres. Reuses the DB, `SELECT … FOR UPDATE SKIP LOCKED` job claiming, retries/scheduling/archival built-in, single infra component.
- Worker runs as a Node process on Railway / Fly / Render.
- Sized against the Supabase pooler connection ceiling (use direct connection for the worker, not the transaction pooler, given long-lived listen connections).

### 2.7 Supabase Realtime is enhancement, not primary
Realtime behind a pooler for user-scoped filtered subscriptions has failure modes (RLS on publications, connection ceilings, reconnect storms).
- **Primary progress mechanism:** polling `GET /api/jobs/:id` every 2s.
- **Enhancement:** Realtime subscription that the client accepts opportunistically and discards on disconnect without blocking the poll loop.
- The client never deadlocks if Realtime silently drops.

### 2.8 Cutover away from `better-sqlite3`
v1 migrates the KB to a Postgres `kb` schema but doesn't deprecate the old sync driver path.
- Explicit cutover step: delete `data/*.db`, remove `better-sqlite3` + `@types/better-sqlite3`, drop the `serverExternalPackages` entry in `next.config.ts`, gated on KB-in-Postgres passing a parity test against the existing SQLite queries.

### 2.9 `public/vibe-id-sample/assets/js/chat.js` must be removed or gated
Publicly-served script that calls Anthropic directly from the browser using `window.ANTHROPIC_API_KEY` with `anthropic-dangerous-direct-browser-access: true`. A footgun regardless of whether the key is set in prod today.
- Delete `public/vibe-id-sample/`, or move behind a staging-only route.
- CI grep that fails the build if `x-api-key` or `anthropic-dangerous-direct-browser-access` or `window.ANTHROPIC_API_KEY` appears in shipped client bundles.

### 2.10 PII scrubbing in Sentry / structured logs
v1 says "Sentry + structured logs." Resume text, emails, JD content will land in error payloads unless explicitly scrubbed. `parse-resume/route.ts:19` already logs user parse details to stdout.
- Sentry `beforeSend` hook with a **strict allow-list** of safe fields; free-form strings dropped.
- Logger redaction rules for the same set.
- Automated test: a deliberately triggered error carrying a resume payload produces a Sentry event with no resume text, email, or JD.

### 2.11 Signed-URL TTL, revocation, object key shape
v1 mentions signed URLs for Vibe pages but never sets a TTL or revocation model.
- Share-link TTL ≤ 7 days default; renewable on share.
- User delete = break all existing URLs (rotate storage token or delete object).
- Object keys are `{user_uuid}/{artifact_uuid}.ext` — never sequential, never email-derived.

### 2.12 Idempotency scheme — concrete
- Server-generated UUID v7 idempotency key on job insert.
- Dedupe via unique index `(user_id, resume_sha256, target_role, jd_sha256, prompt_version)` in `ai.jobs`; conflict returns the existing `job_id`.
- Dedupe is **per-user**, never global (global would leak outputs across users).
- `resume_sha256` is SHA-256 over extracted-and-normalized text (not raw bytes — bytes would miss "same resume, different upload").

### 2.13 Consent model is two flags, not one
v1's "consent events" conflates two different postures.
- **Flag A — session-scoped use:** allow this resume to be analyzed and optimized within my session. Default on (implicit at upload).
- **Flag B — internal reuse:** allow de-identified content to be added to KB/eval/training corpus. **Default off.** Separate opt-in UI, recorded with prompt/model version so the grant is reconstructible.
- User delete respects both; revoking B triggers removal of derived KB rows.

### 2.14 Age gating
PIPL, COPPA, and GDPR each impose extra duties for minors.
- 16+ self-attestation on account creation.
- Hard-block payment routes if unchecked.

### 2.15 Invoice / receipt / tax
v1 has orders and entitlements but no receipt template, no tax handling, no 发票抬头 capture.
- Decide Stripe Tax on/off for launch (recommend on, even if rates are simple).
- Emailed receipt on webhook success.
- Optional `tax_id` / 发票抬头 capture at checkout for Chinese business buyers.

### 2.16 KB licensing and mentor consent
v1 migrates the mentor corpus but says nothing about whether the mentors consented to AI-generated rewrites sold back to users.
- `kb.mentors.consent_source` and `consent_scope` columns.
- Written record of each mentor's opt-in.
- Opt-out path marks segments inactive and triggers a KB rebuild.

### 2.17 Transactional email and support
Magic-link login requires deliverability, including to Chinese inboxes (QQ, 163, 126 frequently flag foreign domains).
- Pick vendor (Resend / Postmark / SES) with SPF/DKIM/DMARC configured on a warmed-up domain.
- Magic link has a fallback: Google OAuth (overseas) and a 6-digit OTP via email (mainland, for deliverability).
- Support channel: email plus a WeChat service account for mainland users.

### 2.18 Deploy, rollback, feature flags
v1 has staging and backup drills but no staged rollout.
- `BILLING_ENABLED` and `WECHAT_PAY_ENABLED` independent feature flags.
- Blue-green or host-based canary for the billing cutover.
- Migration policy: every migration has a `down`, or is explicitly marked `non_reversible — pre_migration_backup_required`.

---

## 3. Underspecified Items In v1 That Need To Be Concrete

| Item in v1 | Make concrete |
|---|---|
| "Access only from verified webhook outcomes" | Grant entitlement on `payment_intent.succeeded` / `charge.succeeded`, **not** `checkout.session.completed` alone. Model webhook arrival order as arbitrary; use a state machine, not a sequence. |
| "Rate limiting" | Dimensions: IP, user, session, endpoint. Limits: upload 10/min/IP, analyze 5/hour/user (guest) / 20/hour/user (auth), optimize 10/hour/user, checkout create 10/hour/user. Edge layer (Cloudflare) + app layer (Upstash / pg-based). |
| "CAPTCHA on upload/payment endpoints" | Cloudflare Turnstile (Google-free, China-OK). Not reCAPTCHA. |
| "Delete/export flows" | Include Storage objects, Sentry events (`user.id` deletion API), webhook payload rows, and KB-derived artifacts (Flag B). v1 didn't mention the Sentry/webhook/backup side. |
| "Stuck-job reaper" | Add `heartbeat_at` column to `ai.jobs`. Reaper: jobs in `running` with `heartbeat_at < now() - interval '5 minutes'` → `failed_retryable`. Workers refresh heartbeat every 30s. |
| "Retry only on retryable failures" | Retryable taxonomy: Anthropic 429, 5xx, network timeout, DB transient. Non-retryable: 4xx (bad input), moderation refusal, quota exceeded. |
| "Timeout budgets per step" | Concrete: parse-and-upload ≤ 15s, analyze pipeline ≤ 120s total (per-Claude-call ≤ 60s), optimize ≤ 180s. Fail fast inside these budgets. |
| "Idempotency keys" | See 2.12. |
| "Dedupe by file hash" | See 2.12 — SHA-256 over **normalized text**, not raw bytes. |

---

## 4. Code-Level Debt To Track As Launch Tasks

Concrete, not hand-wavy:

1. `app/api/analyze/route.ts:8` — delete the `C:/Users/Eric/...` fallback; boot-time assertion if KB path is missing.
2. Delete or staging-gate `public/vibe-id-sample/`.
3. Replace `as` casts on API inputs with Zod (or valibot) runtime validation across all four routes in `app/api/*`.
4. Add `AbortController` + 60s per-call timeout to every `callClaude` invocation in `lib/claude.ts`.
5. Enforce `Content-Length` + MIME sniff before `await file.arrayBuffer()` in `app/api/parse-resume/route.ts:11`. Cap at 10 MB.
6. Strip `detail: String(error)` from client-facing responses; move to server-only structured logger.
7. `package.json` — add `typecheck` (`tsc --noEmit`), `test`, `format`, `ci` scripts; add `"engines": { "node": ">=20" }`; switch to `npm ci` in CI with lockfile integrity check.
8. `next.config.ts` — add `Content-Security-Policy`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Strict-Transport-Security`.
9. Replace `console.log` of parsed-PDF stats in `app/api/parse-resume/route.ts:19` with a structured logger that redacts.
10. CI grep that fails on `x-api-key`, `anthropic-dangerous-direct-browser-access`, or `window.ANTHROPIC_API_KEY` in the compiled client bundle.
11. Pin dependency upgrade policy (Renovate or Dependabot, grouped PRs, weekly cadence).

---

## 5. Critical Files To Modify

- `app/api/analyze/route.ts` — async job enqueue; remove hardcoded DB path; switch KB read to Postgres.
- `app/api/optimize-resume/route.ts`, `app/api/preview-optimize/route.ts` — async pattern, timeouts, Zod validation.
- `app/api/parse-resume/route.ts` — size + MIME validation, Supabase Storage upload, virus-scan hook (ClamAV or equivalent), structured logging.
- `lib/session.ts` — delete in favor of server-issued session tied to Supabase Auth JWT; artifacts read from DB by id.
- `lib/claude.ts` — `AbortController`, retry-on-retryable with jitter, provider-call logging, cost accounting.
- `components/shared/PaymentModal.tsx`, `app/sales/page.tsx`, `app/upsale/page.tsx`, `app/vibe-id/page.tsx` — replace fake pay with `POST /api/checkout/session` and server-entitled reads (never `unlockedTiers` from client state).
- `middleware.ts` (new) — auth guard on paid routes, CSRF/origin check, rate limit, CAPTCHA verify.
- `next.config.ts` — security headers, CSP, image `remotePatterns` audit.
- `public/vibe-id-sample/assets/js/chat.js` — remove or gate.
- New: `lib/db.ts` (Supabase server client), `lib/jobs.ts` (enqueue/claim), `lib/logger.ts` (redacting logger), worker repo (separate deploy target).

---

## 6. Verification (End-to-End)

- **Connectivity matrix**: before enabling billing, verify Stripe Checkout loads from (a) WeChat in-app browser on mainland mobile, (b) mainland desktop, (c) overseas Safari/Chrome. Capture timings and attach to the launch checklist.
- **Access control**: automated test creates users A and B; A creates resumes + entitlement; every artifact/job/billing endpoint called as B returns 403/404 (never 200). Repeat against Storage signed URLs.
- **Payments**: on a Stripe test account — success, failed card, canceled checkout, webhook replay (duplicate `payment_intent.succeeded`), refund (card, synchronous), refund (WeChat, async two-phase). DB state transitions match expectations every time.
- **Jobs**: kill worker mid-job → restart → job resumes or is marked retryable and reclaimed. Submit the same resume twice within the idempotency window → one `ai.jobs` row. 20 concurrent analyze jobs from one user → quota refuses after N.
- **Prompt injection**: run the adversarial-PDF suite; confirm output is refused or sanitized; verify moderation logs.
- **Privacy**: trigger a deliberate error carrying a resume payload; Sentry event has no resume text, email, or JD. Invoke user delete; Storage objects, DB rows, Sentry events, and webhook payloads for that user are gone per retention policy.
- **Cost guard**: set per-user daily cap to $0.50 in staging; 2nd over-cap request refuses cleanly.
- **Rollback**: run a forward migration and its `down` on staging with real-shape data; roll-forward + roll-back + roll-forward leaves no data loss.
- **Smoke**: login → upload → analyze → pay → optimize → share. From a second device with the same account, confirm full history appears.

---

## 7. What Carries Over Unchanged From v1

Everything else in v1 — Supabase Auth + RLS posture, table shapes (`public.*`, `kb.*`, `ai.*`, `billing.*`), guest-session claim semantics, 7-day unclaimed expiry, provider-abstracted billing, internal admin console, Terms/Privacy/consent capture, staging environment + migrations + backups + restore drills, CAPTCHA on upload/payment, cross-device resume recovery after sign-in — remains in scope as specified in v1. v2 does not remove any of it.
