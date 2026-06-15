import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const EXT_ID = 'abcdefghijklmnopabcdefghijklmnop'
const CONFIRM_REDIRECT = `http://localhost:3000/auth/confirm?extensionId=${EXT_ID}`
const CONFIRM_PREFIX = 'http://localhost:3000/auth/recovery'

const authMocks = vi.hoisted(() => ({
  signUp: vi.fn(),
}))

vi.mock('./supabase/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./supabase/server')>()
  return {
    ...actual,
    createSupabaseAnonClient: () => ({
      auth: {
        signUp: authMocks.signUp,
      },
    }),
  }
})

function setTestEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test'
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test'
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres'
  process.env.AUTH_ALLOWED_REDIRECT_PREFIX = CONFIRM_PREFIX
}

describe('GET /auth/confirm', () => {
  const ORIGINAL_ENV = { ...process.env }

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('serves the signup confirmation bridge page', async () => {
    setTestEnv()

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'GET',
      url: `/auth/confirm?extensionId=${EXT_ID}`,
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.body).toContain('JI_SIGNUP_COMPLETE')
    expect(res.body).toContain(EXT_ID)
    expect(res.body).toContain('/auth/me')
  })
})

describe('POST /auth/signup', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    authMocks.signUp.mockResolvedValue({
      data: {
        user: { id: 'user-1', email: 'new@example.com' },
        session: null,
      },
      error: null,
    })
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.clearAllMocks()
  })

  it('requests a Supabase signup email for allowed confirmation bridge redirects', async () => {
    setTestEnv()

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'new@example.com',
        password: 'secret12',
        redirectTo: CONFIRM_REDIRECT,
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      user: { id: 'user-1', email: 'new@example.com' },
      session: null,
    })
    expect(authMocks.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'secret12',
      options: { emailRedirectTo: CONFIRM_REDIRECT },
    })
  })

  it('derives emailRedirectTo from AUTH_ALLOWED_REDIRECT_PREFIX when redirectTo is omitted', async () => {
    setTestEnv()

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'new@example.com',
        password: 'secret12',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(authMocks.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'secret12',
      options: { emailRedirectTo: 'http://localhost:3000/auth/confirm' },
    })
  })

  it('signs up without emailRedirectTo when redirect prefix is not configured', async () => {
    setTestEnv()
    delete process.env.AUTH_ALLOWED_REDIRECT_PREFIX
    delete process.env.CHECKOUT_SUCCESS_URL

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'new@example.com',
        password: 'secret12',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(authMocks.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'secret12',
      options: undefined,
    })
  })

  it('rejects disallowed redirect targets', async () => {
    setTestEnv()
    delete process.env.AUTH_ALLOWED_REDIRECT_PREFIX
    delete process.env.CHECKOUT_SUCCESS_URL

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'new@example.com',
        password: 'secret12',
        redirectTo: 'https://evil.example/callback',
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'redirect_not_allowed' })
    expect(authMocks.signUp).not.toHaveBeenCalled()
  })

  it('allows signup confirm redirects derived from CHECKOUT_SUCCESS_URL', async () => {
    setTestEnv()
    delete process.env.AUTH_ALLOWED_REDIRECT_PREFIX
    process.env.CHECKOUT_SUCCESS_URL = 'https://test123.vibeid.co/checkout/success'
    const derivedRedirect = `https://test123.vibeid.co/auth/confirm?extensionId=${EXT_ID}`

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'new@example.com',
        password: 'secret12',
        redirectTo: derivedRedirect,
      },
    })

    expect(res.statusCode).toBe(200)
    expect(authMocks.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'secret12',
      options: { emailRedirectTo: derivedRedirect },
    })
  })
})
