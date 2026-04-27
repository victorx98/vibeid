<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Goal and Architecture

This repo is a Chinese-language AI resume review product for MentorX / Vibe ID. The product takes a user's resume plus optional job description, analyzes fit for a target role, sells deeper mentor feedback, generates an optimized resume, and then upsells follow-on services and a Vibe ID page.

The actual user funnel is:
1. `/` is the landing page and upload entrypoint.
2. [`components/landing/UploadSection.tsx`](/home/victor/vibeid/components/landing/UploadSection.tsx) uploads a PDF/DOC/DOCX, calls `/api/parse-resume`, then calls `/api/analyze`.
3. `/sales` shows the initial report: ATS score, competition estimate, 1 unlocked mentor card, and 3 locked teasers.
4. `/result` unlocks the full mentor report and can call `/api/optimize-resume`.
5. `/upsale` shows the optimized resume, ATS recap, and service upsells.
6. `/vibe-id` shows the Vibe ID preview plus skill-gap driven AI project recommendations.

Technical shape:
- Next.js 16 App Router project using React 19.
- UI is mostly client components under `app/*` and `components/*`.
- Server logic is concentrated in App Router route handlers under `app/api/*`.
- Animation and presentation rely on Framer Motion plus Tailwind utilities, but many screens also use inline styles heavily.
- `README.md` documents install, env, migration, and verification basics; the code remains the source of truth for detailed behavior.

Operational note:
- Use `npm ci` before relying on local Next docs or running the app.

## DB Settings and Where Data Is Stored

The app now uses Supabase/Postgres for runtime storage plus a Postgres-hosted mentor knowledge base.

Database settings:
- Driver: `pg`
- Core config: [`lib/db.ts`](/home/victor/vibeid/lib/db.ts)
- Required env var for DB queries/workers/migration: `DATABASE_URL`
- Supabase browser key: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`)
- Supabase backend admin key: prefer `SUPABASE_SECRET_KEY` (`sb_secret_...`), with `SUPABASE_SERVICE_ROLE_KEY` only as a temporary legacy fallback

What the `vibeid` schema stores:
- A curated mentor/advice corpus migrated from `data/resume_material_library.db`
- Tables referenced by the app: `vibeid.mentors`, `vibeid.segments`, `vibeid.sessions`, `vibeid.before_after_pairs`
- Legacy SQLite `students` are migrated to `vibeid.source_students` as source-session records, not product users
- [`lib/kb-store.ts`](/home/victor/vibeid/lib/kb-store.ts) reads those tables to rank mentors, fetch reusable advice segments, and fetch before/after rewrite examples.

Where user data is stored:
- `public.resume_artifacts` stores uploaded resume text, target role, optional JD, analysis result, mentor advice, and optimized resume
- `ai.jobs` stores queued/running/completed analyze and optimize jobs
- `billing.orders`, `billing.entitlements`, and `billing.stripe_events` store payment state and unlocks
- `sessionStorage["current_resume_artifact_id"]` stores only the current artifact id for client navigation recovery
- `localStorage["user_feedbacks"]` and `localStorage["waitlist_emails"]` remain client-local UI feedback/waitlist helpers

## How AI Is Integrated

The main AI integration is Anthropic Claude on the server side.

Core wrapper:
- [`lib/claude.ts`](/home/victor/vibeid/lib/claude.ts) initializes `@anthropic-ai/sdk`
- Required env var: `ANTHROPIC_API_KEY`
- Default model: `claude-sonnet-4-20250514`
- Faster/lower-cost tasks use `claude-haiku-4-5-20251001`
- Some routes enable Anthropic ephemeral prompt caching for the system prompt

Route-level AI flow:
- [`app/api/parse-resume/route.ts`](/home/victor/vibeid/app/api/parse-resume/route.ts)
  - No LLM call here.
  - Extracts text from PDF using `unpdf` and from Word files using `mammoth`.
- [`app/api/analyze/route.ts`](/home/victor/vibeid/app/api/analyze/route.ts)
  - Calls Claude for ATS scoring.
  - Calls Claude for job-market competition estimation.
  - Reads Supabase/Postgres mentor knowledge from the `vibeid` schema in parallel.
  - Builds grounded mentor prompts from DB segments plus before/after examples.
  - Calls Claude again for 1 fully unlocked mentor report and 3 locked teaser mentors.
  - Returns ATS results, compensation framing, competition estimate, and mentor advice to the client.
- [`app/api/optimize-resume/route.ts`](/home/victor/vibeid/app/api/optimize-resume/route.ts)
  - Phase A: Claude converts raw resume text into normalized Markdown.
  - Phase B: Claude applies accepted mentor advice and optional JD keywords to rewrite only the targeted parts.
  - Post-processing normalizes `[[highlight]]` tags so the UI can show edits safely.
- [`app/api/preview-optimize/route.ts`](/home/victor/vibeid/app/api/preview-optimize/route.ts)
  - Uses Claude Haiku for a fast single-bullet rewrite preview.

Grounding strategy:
- The product does not rely on a generic free-form chat flow for its main analysis.
- Prompts are tightly structured and combine:
  - resume text
  - target role
  - optional JD text
  - ATS findings
  - mentor/advice examples from the `vibeid` KB schema

Separate static demo:
- [`public/vibe-id-sample/assets/js/chat.js`](/home/victor/vibeid/public/vibe-id-sample/assets/js/chat.js) is a separate front-end sample, not the main Next API pipeline.
- That script is local keyword fallback only; the proxy blocks `/vibe-id-sample` unless `NEXT_PUBLIC_ENABLE_VIBE_SAMPLE=true`.
