import { afterEach, describe, expect, it } from 'vitest'

import { getSupabaseAdminKey, supabaseServerConfigured } from './backend-config'

const ORIGINAL_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
}

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

describe('backend config', () => {
  afterEach(restoreEnv)

  it('prefers the new Supabase secret key over the legacy service role key', () => {
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_new'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy-service-role'

    expect(getSupabaseAdminKey()).toBe('sb_secret_new')
  })

  it('allows the legacy service role key as a temporary fallback', () => {
    delete process.env.SUPABASE_SECRET_KEY
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy-service-role'

    expect(getSupabaseAdminKey()).toBe('legacy-service-role')
  })

  it('requires public Supabase config plus one backend admin key', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test'
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test'
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    expect(supabaseServerConfigured()).toBe(true)
  })
})
