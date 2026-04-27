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
  return getEnv('STRIPE_PRICE_RESUME')
}
