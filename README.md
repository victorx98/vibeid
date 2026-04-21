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
- Read-only SQLite mentor knowledge base at `data/resume_material_library.db`

## Local Setup

1. Install dependencies:

```bash
npm ci
```

2. Copy the environment template and fill in `ANTHROPIC_API_KEY`:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

## Upload Support

- Supported resume formats: `PDF` and `DOCX`
- Max upload size: `10MB`
- Legacy `.doc` files are rejected intentionally because the installed parser path is `.docx`-only

## Hardening Flags

- `NEXT_PUBLIC_DEMO_UNLOCKS_ENABLED=false`
  Keeps the old fake payment unlock flow disabled outside local demo environments.
- `NEXT_PUBLIC_ENABLE_VIBE_SAMPLE=false`
  Keeps the static `public/vibe-id-sample` preview blocked outside local demo environments.

Both flags default to enabled in development and disabled in production when unset.

## Verification

```bash
npm run ci
```

This runs lint, typecheck, unit tests, production build, and the client-secret scan that blocks browser-exposed Anthropic key patterns.
