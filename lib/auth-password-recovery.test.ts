import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const EXT_ID = 'abcdefghijklmnopabcdefghijklmnop'
const EXT_REDIRECT = `https://${EXT_ID}.chromiumapp.org/`
const RECOVERY_REDIRECT = `http://localhost:3000/auth/recovery?extensionId=${EXT_ID}`
const RECOVERY_PREFIX = 'http://localhost:3000/auth/recovery'

const authMocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  setSession: vi.fn(),
  updateUser: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock('./supabase/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./supabase/server')>()
  return {
    ...actual,
    createSupabaseAnonClient: () => ({
      auth: {
        resetPasswordForEmail: authMocks.resetPasswordForEmail,
        setSession: authMocks.setSession,
        updateUser: authMocks.updateUser,
        getSession: authMocks.getSession,
      },
    }),
  }
})

function setTestEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test'
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test'
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres'
  process.env.AUTH_ALLOWED_REDIRECT_PREFIX = RECOVERY_PREFIX
}

describe('GET /auth/recovery', () => {
  const ORIGINAL_ENV = { ...process.env }

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('serves the password recovery bridge page', async () => {
    setTestEnv()

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'GET',
      url: `/auth/recovery?extensionId=${EXT_ID}`,
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.body).toContain('JI_PASSWORD_RECOVERY_COMPLETE')
    expect(res.body).toContain(EXT_ID)
    expect(res.body).toContain('/auth/reset-password')
  })
})

describe('POST /auth/forgot-password', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    authMocks.resetPasswordForEmail.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.clearAllMocks()
  })

  it('requests a Supabase recovery email for allowed recovery bridge redirects', async () => {
    setTestEnv()

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/forgot-password',
      payload: {
        email: 'user@example.com',
        redirectTo: RECOVERY_REDIRECT,
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
    expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: RECOVERY_REDIRECT,
    })
  })

  it('requests a Supabase recovery email for chromiumapp.org redirects', async () => {
    setTestEnv()

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/forgot-password',
      payload: {
        email: 'user@example.com',
        redirectTo: EXT_REDIRECT,
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
    expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: EXT_REDIRECT,
    })
  })

  it('returns ok even when Supabase rejects the request', async () => {
    setTestEnv()
    authMocks.resetPasswordForEmail.mockResolvedValue({
      error: { message: 'user not found' },
    })

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/forgot-password',
      payload: {
        email: 'missing@example.com',
        redirectTo: RECOVERY_REDIRECT,
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
  })

  it('rejects disallowed redirect targets', async () => {
    setTestEnv()
    delete process.env.AUTH_ALLOWED_REDIRECT_PREFIX
    delete process.env.CHECKOUT_SUCCESS_URL

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/forgot-password',
      payload: {
        email: 'user@example.com',
        redirectTo: 'https://evil.example/callback',
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'redirect_not_allowed' })
    expect(authMocks.resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('allows recovery redirects derived from CHECKOUT_SUCCESS_URL', async () => {
    setTestEnv()
    delete process.env.AUTH_ALLOWED_REDIRECT_PREFIX
    process.env.CHECKOUT_SUCCESS_URL = 'https://test123.vibeid.co/checkout/success'
    const derivedRedirect = `https://test123.vibeid.co/auth/recovery?extensionId=${EXT_ID}`

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/forgot-password',
      payload: {
        email: 'user@example.com',
        redirectTo: derivedRedirect,
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
    expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: derivedRedirect,
    })
  })
})

describe('POST /auth/reset-password', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    authMocks.setSession.mockResolvedValue({ error: null })
    authMocks.updateUser.mockResolvedValue({
      error: null,
      data: { user: { id: 'user-1', email: 'user@example.com' } },
    })
    authMocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_at: 123,
          expires_in: 3600,
        },
      },
    })
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.clearAllMocks()
  })

  it('updates the password using recovery session tokens', async () => {
    setTestEnv()

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      headers: {
        authorization: 'Bearer recovery-access',
      },
      payload: {
        refreshToken: 'recovery-refresh',
        password: 'new-password',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(authMocks.setSession).toHaveBeenCalledWith({
      access_token: 'recovery-access',
      refresh_token: 'recovery-refresh',
    })
    expect(authMocks.updateUser).toHaveBeenCalledWith({ password: 'new-password' })

    const body = res.json() as {
      user: { id: string; email: string | null }
      session: { accessToken: string; refreshToken: string }
    }
    expect(body.user).toEqual({ id: 'user-1', email: 'user@example.com' })
    expect(body.session).toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresAt: 123,
      expiresIn: 3600,
    })
  })

  it('requires a recovery access token', async () => {
    setTestEnv()

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: {
        refreshToken: 'recovery-refresh',
        password: 'new-password',
      },
    })

    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ error: 'missing_access_token' })
  })

  it('rejects invalid recovery sessions', async () => {
    setTestEnv()
    authMocks.setSession.mockResolvedValue({ error: { message: 'invalid' } })

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      headers: {
        authorization: 'Bearer bad-token',
      },
      payload: {
        refreshToken: 'bad-refresh',
        password: 'new-password',
      },
    })

    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ error: 'invalid_recovery_session' })
  })
})
