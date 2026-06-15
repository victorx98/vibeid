import type { ProductTier } from './product-tiers'

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

export function readBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name]
  if (value == null) return fallback
  return TRUE_VALUES.has(value.trim().toLowerCase())
}

export function getEnv(name: string): string | null {
  const value = process.env[name]?.trim()
  return value ? value : null
}

export function requireEnv(name: string): string {
  const value = getEnv(name)
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

export function supabaseServerConfigured(): boolean {
  return Boolean(
    getEnv('NEXT_PUBLIC_SUPABASE_URL') &&
      getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') &&
      getSupabaseAdminKey()
  )
}

export function supabaseBrowserConfigured(): boolean {
  return Boolean(
    getEnv('NEXT_PUBLIC_SUPABASE_URL') &&
      getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  )
}

export function databaseConfigured(): boolean {
  return Boolean(getEnv('DATABASE_URL'))
}

export function getSupabaseAdminKey(): string | null {
  return getEnv('SUPABASE_SECRET_KEY') ?? getEnv('SUPABASE_SERVICE_ROLE_KEY')
}

export function requireSupabaseAdminKey(): string {
  const value = getSupabaseAdminKey()
  if (!value) throw new Error('SUPABASE_SECRET_KEY is not configured')
  return value
}

export function billingEnabled(): boolean {
  return readBooleanEnv('BILLING_ENABLED', false)
}

export function getStripePriceId(productTier: ProductTier): string | null {
  if (productTier === 'basic') return getEnv('STRIPE_PRICE_BASIC')
  return getEnv('STRIPE_PRICE_PREMIUM') ?? getEnv('STRIPE_PRICE_RESUME')
}

function looksLikeStripeSecretKey(value: string): boolean {
  return /^sk_(test|live)_[A-Za-z0-9]+$/.test(value)
}

function looksLikeStripeWebhookSecret(value: string): boolean {
  return /^whsec_[A-Za-z0-9]+$/.test(value)
}

function looksLikeStripePriceId(value: string): boolean {
  return /^price_[A-Za-z0-9]+$/.test(value)
}

/**
 * Validates all required environment variables at server startup.
 * Collects every missing or invalid var before throwing so the full list
 * is visible in one error message rather than surfacing one at a time.
 *
 * Call this from instrumentation.ts so it runs once at cold-start,
 * not lazily on the first failing request.
 *
 * Throws: Error listing all configuration problems found.
 */
export function assertConfig(): void {
  const errors: string[] = []

  // Always required regardless of feature flags
  const alwaysRequired = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'DATABASE_URL',
  ]
  for (const name of alwaysRequired) {
    if (!getEnv(name)) errors.push(`${name} is not set`)
  }

  // Either the new key or the legacy fallback must be present
  if (!getSupabaseAdminKey()) {
    errors.push(
      'SUPABASE_SECRET_KEY is not set (or legacy fallback SUPABASE_SERVICE_ROLE_KEY)'
    )
  }

  // Guard against the literal placeholder value Supabase inserts in its connection strings
  const dbUrl = getEnv('DATABASE_URL')
  if (dbUrl?.includes('[YOUR-PASSWORD]')) {
    errors.push(
      'DATABASE_URL still contains the placeholder "[YOUR-PASSWORD]" — replace it with the real password from Supabase → Project Settings → Database'
    )
  }

  // Billing-specific vars are only required when billing is actually turned on
  if (billingEnabled()) {
    const billingRequired = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']
    for (const name of billingRequired) {
      if (!getEnv(name)) {
        errors.push(`${name} is not set (required when BILLING_ENABLED=true)`)
      }
    }

    const stripeSecret = getEnv('STRIPE_SECRET_KEY')
    if (stripeSecret && !looksLikeStripeSecretKey(stripeSecret)) {
      errors.push(
        'STRIPE_SECRET_KEY looks like a placeholder — paste a real key from Stripe Dashboard → Developers → API keys'
      )
    }

    const webhookSecret = getEnv('STRIPE_WEBHOOK_SECRET')
    if (webhookSecret && !looksLikeStripeWebhookSecret(webhookSecret)) {
      errors.push(
        'STRIPE_WEBHOOK_SECRET looks like a placeholder — paste the signing secret from Stripe Dashboard → Webhooks'
      )
    }

    const basicPriceId = getEnv('STRIPE_PRICE_BASIC')
    if (basicPriceId && !looksLikeStripePriceId(basicPriceId)) {
      errors.push(
        'STRIPE_PRICE_BASIC looks like a placeholder — paste a real Price ID from Stripe Dashboard → Products'
      )
    }

    const premiumPriceId = getEnv('STRIPE_PRICE_PREMIUM') ?? getEnv('STRIPE_PRICE_RESUME')
    if (premiumPriceId && !looksLikeStripePriceId(premiumPriceId)) {
      errors.push(
        'STRIPE_PRICE_PREMIUM looks like a placeholder — paste a real Price ID from Stripe Dashboard → Products'
      )
    }

    // At least one price ID must exist or checkout will always return 503
    if (!basicPriceId && !premiumPriceId) {
      errors.push(
        'Neither STRIPE_PRICE_BASIC nor STRIPE_PRICE_PREMIUM is set (required when BILLING_ENABLED=true)'
      )
    }

    // ENTITLEMENTS_SECRET must be long enough to be a secure signing key
    const secret = getEnv('ENTITLEMENTS_SECRET')
    if (!secret) {
      errors.push(
        'ENTITLEMENTS_SECRET is not set (required when BILLING_ENABLED=true)'
      )
    } else if (secret.length < 32) {
      errors.push(
        `ENTITLEMENTS_SECRET is too short (${secret.length} chars — minimum 32). Generate one with: openssl rand -hex 32`
      )
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration errors — fix these before starting the server:\n${errors.map((e) => `  • ${e}`).join('\n')}`
    )
  }
}
