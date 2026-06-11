# Edaix Backend

Headless **Fastify** API that serves the Edaix browser extension. It handles:

- **Auth** — Supabase email/password sign-up/sign-in, password recovery, plus Google OAuth (the extension opens the Supabase authorize URL via `chrome.identity.launchWebAuthFlow`).
- **Resume storage** — per-user resumes in Postgres (`public.resumes`), tied to a Supabase `auth.users` id.
- **Billing** — Stripe Checkout, webhook fulfillment, and entitlement lookup.

Resume scoring/rewriting is handled separately by the extension's Cloudflare Worker and is intentionally out of scope here.

## Stack

- Fastify 5 (run with `tsx`, no build step)
- Supabase Auth + Postgres (`pg`)
- Stripe for billing
- `unpdf` / `mammoth` for server-side resume text extraction

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | no | Liveness probe |
| POST | `/auth/signup` | no | Supabase email/password sign-up |
| POST | `/auth/login` | no | Email/password sign-in → session tokens |
| POST | `/auth/refresh` | no | Exchange a refresh token for a new session |
| POST | `/auth/forgot-password` | no | Send a Supabase password-recovery email |
| GET | `/auth/recovery` | no | Bridge page: parse recovery tokens, set new password |
| POST | `/auth/reset-password` | recovery token | Set a new password after the recovery redirect |
| POST | `/auth/logout` | yes | Best-effort token revocation |
| GET | `/auth/me` | yes | Current user |
| GET | `/auth/google/url` | no | Build the Google OAuth authorize URL |
| GET | `/resumes` | yes | List the user's resumes |
| GET | `/resumes/current` | yes | The user's current resume |
| GET | `/resumes/:id` | yes | A specific resume |
| POST | `/resumes` | yes | Create/replace the current resume |
| DELETE | `/resumes/:id` | yes | Delete a resume |
| POST | `/parse-resume` | no | Extract text from an uploaded PDF/DOCX |
| POST | `/billing/checkout` | yes | Create a Stripe Checkout session |
| GET | `/billing/entitlements` | yes | Active entitlements for the user |
| POST | `/billing/webhook` | Stripe sig | Stripe webhook (raw body) |

Protected routes expect `Authorization: Bearer <supabase access token>`.

## Development environment

### Prerequisites

| Tool | Version / notes |
|------|-----------------|
| Node.js | `20+` (CI uses `22`) |
| npm | ships with Node |
| Docker | required for local Supabase |

### 1. Install dependencies

```bash
npm ci
cp .env.example .env
```

The server validates configuration at startup (`assertConfig` in `lib/backend-config.ts`) and prints every missing or invalid variable in one error. Fix those before continuing.

### 2. Database and Supabase Auth

Requires Docker. Migrations in `supabase/migrations/` are applied automatically when the stack starts.

```bash
supabase start          # first run pulls images and applies migrations
supabase status         # copy API URL, anon key, service_role key, DB URL
```

Fill `.env` from `supabase status`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon key>
SUPABASE_SECRET_KEY=<service_role key>   # local CLI emits a JWT, not sb_secret_…
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

Useful commands:

```bash
supabase db reset       # drop, re-migrate, and re-seed (if seed files exist)
supabase stop           # stop containers
```

For Google OAuth against local Supabase, also set `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` in `.env` (read by `supabase/config.toml`) and add your extension redirect to `additional_redirect_urls` in that file. See [Google SSO](#google-sso-chrome-extension) below.

### 3. Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Local: `http://127.0.0.1:54321`; hosted: `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Anon / publishable key |
| `SUPABASE_SECRET_KEY` | yes* | Service-role / secret key; legacy fallback: `SUPABASE_SERVICE_ROLE_KEY` |
| `DATABASE_URL` | yes | Direct Postgres connection (not the Supabase REST URL) |
| `PORT` | no | Default `3000` |
| `HOST` | no | Default `0.0.0.0` |
| `BILLING_ENABLED` | no | Default `false`; set `true` only when Stripe vars are configured |
| Stripe + `ENTITLEMENTS_SECRET` | when billing on | See `.env.example`; generate secret with `openssl rand -hex 32` |

With `BILLING_ENABLED=false` (the default), Stripe keys are not required and checkout/webhook routes stay disabled.

### 4. Run the API

```bash
npm run dev      # tsx watch — reloads on file changes
# npm start      # tsx, no watch (production / Docker)
```

Server listens on `PORT` (default `3000`).

Smoke test:

```bash
curl -s http://localhost:3000/health
# → {"status":"ok"}
```

### 5. Verify

```bash
npm run ci       # typecheck + unit tests
```

### Optional — Billing in dev

1. Create test products/prices in the [Stripe Dashboard](https://dashboard.stripe.com/test/products).
2. Set in `.env`:

   ```bash
   BILLING_ENABLED=true
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_BASIC=price_...
   STRIPE_PRICE_PREMIUM=price_...
   ENTITLEMENTS_SECRET=<output of: openssl rand -hex 32>
   CHECKOUT_SUCCESS_URL=http://localhost:3000/checkout/success
   CHECKOUT_CANCEL_URL=http://localhost:3000/checkout/cancel
   ```

3. Forward webhooks to the local server:

   ```bash
   stripe listen --forward-to localhost:3000/billing/webhook
   ```

   Paste the signing secret `whsec_…` from `stripe listen` into `STRIPE_WEBHOOK_SECRET`.

## Google SSO (Chrome extension)

This backend exposes `GET /auth/google/url` so the extension can start a Supabase Google OAuth flow. The extension repo owns the client-side `chrome.identity.launchWebAuthFlow` integration; this repo only builds the authorize URL and validates redirect targets.

### 1. Google Cloud Console

1. Create or select a project at [Google Cloud Console](https://console.cloud.google.com/).
2. Configure the **OAuth consent screen** (External; scopes: `userinfo.email`, `userinfo.profile`).
3. Create an **OAuth 2.0 Client ID** (Web application).
4. Add **Authorized redirect URI**:
   - Hosted Supabase: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Local Supabase CLI: `http://127.0.0.1:54321/auth/v1/callback`
5. Copy the **Client ID** and **Client Secret**.

### 2. Supabase (hosted)

In Supabase Dashboard → **Authentication**:

- **Providers → Google**: enable and paste the Google client id/secret.
- **URL Configuration → Redirect URLs**: add `https://<extension-id>.chromiumapp.org/` (from `chrome.runtime.id` in the extension).

The `redirectTo` query param on `/auth/google/url` must match an allowed redirect URL exactly.

### 3. Local Supabase CLI

[`supabase/config.toml`](supabase/config.toml) enables `[auth.external.google]` with env substitution. Set in `.env`:

```bash
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-client-secret
```

Add your extension redirect to `additional_redirect_urls` in `supabase/config.toml`, then restart `supabase start`.

### 4. Backend env

Required (same as email/password auth): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.

Optional: `AUTH_ALLOWED_REDIRECT_PREFIX` — fallback allow-list when `redirectTo` is not a `chromiumapp.org` URL.

### 5. Extension contract (implemented in the extension repo)

1. `redirectTo = https://${chrome.runtime.id}.chromiumapp.org/`
2. `GET ${API_BASE}/auth/google/url?redirectTo=...` → `{ url }`
3. `chrome.identity.launchWebAuthFlow({ url, interactive: true })`
4. Parse `#access_token`, `refresh_token`, `expires_in` from the response URL fragment
5. Use `Authorization: Bearer <accessToken>` on protected routes; refresh via `POST /auth/refresh`

### 6. Password recovery (extension contract)

Supabase sends the reset email; no custom SMTP is required (hosted Supabase uses built-in mail; local CLI captures messages in Inbucket on port `54324`).

1. `redirectTo = ${API_BASE}/auth/recovery?extensionId=${chrome.runtime.id}` (see `buildPasswordRecoveryRedirectUrl` in `lib/extension-pages.ts`)
2. `POST ${API_BASE}/auth/forgot-password` with `{ email, redirectTo }` → `{ ok: true }`
3. User opens the link from email; Supabase redirects to `redirectTo` with `#access_token`, `refresh_token`, `type=recovery` in the fragment
4. `GET /auth/recovery` serves a bridge page that reads the hash, collects a new password, and calls `POST /auth/reset-password`
5. On success the bridge page messages the extension with `{ type: 'JI_PASSWORD_RECOVERY_COMPLETE', user, session }` (requires `externally_connectable`)

Configure allow-lists:

- **Backend:** `AUTH_ALLOWED_REDIRECT_PREFIX=http://localhost:3000/auth/recovery` (or your hosted recovery URL prefix)
- **Supabase:** add `http://127.0.0.1:3000/auth/recovery` (and production equivalent) to redirect URLs; keep `site_url` pointed at Supabase Auth (`http://127.0.0.1:54321` locally), not the Fastify API port

### 7. Verify

```bash
# Authorize URL (replace with your extension id)
curl -s "http://localhost:3000/auth/google/url?redirectTo=https%3A%2F%2Fabcdefghijklmnopabcdefghijklmnop.chromiumapp.org%2F"

# After extension sign-in, with tokens from the OAuth fragment:
curl -s -H "Authorization: Bearer <accessToken>" http://localhost:3000/auth/me
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}' http://localhost:3000/auth/refresh
curl -s -X POST -H "Authorization: Bearer <accessToken>" http://localhost:3000/auth/logout

# Password recovery (redirectTo must match AUTH_ALLOWED_REDIRECT_PREFIX / Supabase redirect URLs):
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","redirectTo":"http://localhost:3000/auth/recovery?extensionId=abcdefghijklmnopabcdefghijklmnop"}' \
  http://localhost:3000/auth/forgot-password

# Or call POST /auth/reset-password directly if you already have recovery tokens from the hash:
curl -s -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer <recoveryAccessToken>" \
  -d '{"refreshToken":"<recoveryRefreshToken>","password":"new-password"}' \
  http://localhost:3000/auth/reset-password
```

Run automated checks: `npm run ci` (includes auth route tests).
