import { afterEach, describe, expect, it } from 'vitest'

import { buildGoogleAuthorizeUrl, isAllowedOAuthRedirect } from './google-oauth'

const EXT_REDIRECT = 'https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/'

describe('google oauth helpers', () => {
  it('allows chromiumapp.org extension redirects', () => {
    expect(isAllowedOAuthRedirect(EXT_REDIRECT, null)).toBe(true)
  })

  it('rejects unknown redirect targets without a configured prefix', () => {
    expect(isAllowedOAuthRedirect('https://evil.example/callback', null)).toBe(false)
  })

  it('allows redirects matching AUTH_ALLOWED_REDIRECT_PREFIX', () => {
    const prefix = 'https://app.example.com/auth/callback'
    expect(isAllowedOAuthRedirect(`${prefix}?state=1`, prefix)).toBe(true)
  })

  it('builds the Supabase Google authorize URL', () => {
    const url = buildGoogleAuthorizeUrl('https://abc.supabase.co/', EXT_REDIRECT)
    expect(url).toBe(
      `https://abc.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(EXT_REDIRECT)}`
    )
  })
})

describe('GET /auth/google/url', () => {
  const ORIGINAL_ENV = { ...process.env }

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('returns authorize url for allowed extension redirect', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test'
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test'
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres'

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'GET',
      url: `/auth/google/url?redirectTo=${encodeURIComponent(EXT_REDIRECT)}`,
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { url: string }
    expect(body.url).toBe(buildGoogleAuthorizeUrl('https://test.supabase.co', EXT_REDIRECT))
  })

  it('rejects disallowed redirect targets', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test'
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test'
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres'
    delete process.env.AUTH_ALLOWED_REDIRECT_PREFIX
    delete process.env.CHECKOUT_SUCCESS_URL

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'GET',
      url: '/auth/google/url?redirectTo=https%3A%2F%2Fevil.example%2Fcallback',
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'redirect_not_allowed' })
  })
})
