# Vibe ID Resume Advisor

Chinese-language AI resume review funnel for MentorX / Vibe ID. The current app flow is:

1. `/` uploads a resume and runs parsing + analysis.
2. `/sales` shows the initial mentor/ATS report.
3. `/result` shows the unlocked mentor feedback and kicks off resume optimization.
4. `/upsale` shows the optimized resume and follow-on upsells.
5. `/vibe-id` shows the Vibe ID preview and skill-gap recommendations.

## Stack

- Next.js 16 App Router
- React 19
- Anthropic Claude for analysis and optimization
- Supabase/Postgres runtime storage
- Mentor knowledge base in the Supabase `vibeid` schema, migrated from `data/resume_material_library.db`

## Installation

Requirements:

- Node.js `20+`
- npm

1. Install dependencies:

```bash
npm ci
```

2. Copy the environment template:

```bash
cp .env.example .env.local
```

3. Edit `.env.local` and set:

- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` from the new Supabase API Keys tab (`sb_secret_...`), or temporary legacy `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `ENTITLEMENTS_SECRET` to a random 32+ character value if you want to test signed unlock flows locally

4. Apply the Supabase migrations and migrate the mentor KB:

```bash
npm run kb:migrate -- --dry-run
npm run kb:migrate -- --apply
```

The migration reads `SQLITE_KB_PATH` or defaults to `data/resume_material_library.db`.

## Launch

Start the development server:

```bash
npm run dev
```

Then open `http://localhost:3000`.

To run the production build locally:

```bash
npm run build
npm run start
```

## Upload Support

- Supported resume formats: `PDF` and `DOCX`
- Max upload size: `10MB`
- Legacy `.doc` files are rejected intentionally because the installed parser path is `.docx`-only

## Hardening Flags

- `ENTITLEMENTS_SECRET=<32+ chars>`
  Required to mint and verify signed entitlement cookies for the demo checkout flow and the paid resume optimization API.
- `BILLING_KILL_SWITCH=false`
  Returns `503` from checkout endpoints and prevents new entitlement minting when toggled on.
- `WECHAT_PAY_ENABLED=false`
  Enables the official WeChat Pay API v3 flow when `BILLING_ENABLED=true`. Configure merchant ID, AppID/AppSecret, API v3 key, merchant serial number, private/public keys, and `WECHAT_PRICE_*_CNY_CENTS` before turning it on.
- `NEXT_PUBLIC_DEMO_UNLOCKS_ENABLED=false`
  Keeps the old fake payment unlock flow disabled unless you opt into local demo mode.
- `NEXT_PUBLIC_ENABLE_VIBE_SAMPLE=false`
  Keeps the static `public/vibe-id-sample` preview blocked unless you opt into local demo mode.

The boolean flags above default to `false` when unset.

If a preview or reverse-proxy gate protects the site, allow both webhook paths to bypass it:
`/api/stripe/webhook` and `/api/wechat/webhook`.

## Verification

```bash
npm run ci
```

This runs lint, typecheck, unit tests, production build, and the client-secret scan that blocks browser-exposed Anthropic key patterns.
