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

export function wechatPayEnabled(): boolean {
  return readBooleanEnv('WECHAT_PAY_ENABLED', false)
}

export function getStripePriceId(productTier: ProductTier): string | null {
  if (productTier === 'basic') return getEnv('STRIPE_PRICE_BASIC')
  return getEnv('STRIPE_PRICE_RESUME')
}

export function getWechatPriceCents(productTier: ProductTier): number | null {
  const raw =
    productTier === 'basic'
      ? getEnv('WECHAT_PRICE_BASIC_CNY_CENTS')
      : getEnv('WECHAT_PRICE_RESUME_CNY_CENTS')
  if (!raw) return null

  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value <= 0) return null
  return value
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
    'ANTHROPIC_API_KEY',
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

    // At least one price ID must exist or checkout will always return 503
    if (!getEnv('STRIPE_PRICE_BASIC') && !getEnv('STRIPE_PRICE_RESUME')) {
      errors.push(
        'Neither STRIPE_PRICE_BASIC nor STRIPE_PRICE_RESUME is set (required when BILLING_ENABLED=true)'
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

    if (wechatPayEnabled()) {
      const wechatRequired = [
        'WECHAT_PAY_MCH_ID',
        'WECHAT_PAY_APP_ID',
        'WECHAT_PAY_APP_SECRET',
        'WECHAT_PAY_API_V3_KEY',
        'WECHAT_PAY_MERCHANT_SERIAL_NO',
      ]
      for (const name of wechatRequired) {
        if (!getEnv(name)) {
          errors.push(`${name} is not set (required when WECHAT_PAY_ENABLED=true)`)
        }
      }

      if (!getEnv('WECHAT_PAY_PRIVATE_KEY') && !getEnv('WECHAT_PAY_PRIVATE_KEY_PATH')) {
        errors.push(
          'WECHAT_PAY_PRIVATE_KEY or WECHAT_PAY_PRIVATE_KEY_PATH is required when WECHAT_PAY_ENABLED=true'
        )
      }

      if (!getEnv('WECHAT_PAY_PUBLIC_KEY') && !getEnv('WECHAT_PAY_PUBLIC_KEY_PATH')) {
        errors.push(
          'WECHAT_PAY_PUBLIC_KEY or WECHAT_PAY_PUBLIC_KEY_PATH is required when WECHAT_PAY_ENABLED=true'
        )
      }

      if (!getWechatPriceCents('basic') && !getWechatPriceCents('resume')) {
        errors.push(
          'Neither WECHAT_PRICE_BASIC_CNY_CENTS nor WECHAT_PRICE_RESUME_CNY_CENTS is valid (required when WECHAT_PAY_ENABLED=true)'
        )
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration errors — fix these before starting the server:\n${errors.map((e) => `  • ${e}`).join('\n')}`
    )
  }
}
