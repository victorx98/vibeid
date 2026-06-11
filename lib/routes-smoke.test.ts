import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const EXT_ID = 'abcdefghijklmnopabcdefghijklmnop'
const EXT_REDIRECT = `https://${EXT_ID}.chromiumapp.org/`
const TEST_USER = { id: 'user-test-1', email: 'test@example.com' }
const TEST_TOKEN = 'valid-test-token'

const supabaseMocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  refreshSession: vi.fn(),
  adminSignOut: vi.fn(),
}))

vi.mock('./supabase/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./supabase/server')>()
  return {
    ...actual,
    getUserFromToken: vi.fn(async (token: string | null | undefined) => {
      if (token === TEST_TOKEN) {
        return { id: TEST_USER.id, email: TEST_USER.email }
      }
      return null
    }),
    createSupabaseAnonClient: () => ({
      auth: {
        signUp: supabaseMocks.signUp,
        signInWithPassword: supabaseMocks.signInWithPassword,
        refreshSession: supabaseMocks.refreshSession,
      },
    }),
    createSupabaseAdminClient: () => ({
      auth: {
        admin: { signOut: supabaseMocks.adminSignOut },
      },
    }),
  }
})

const resumeMocks = vi.hoisted(() => ({
  listResumesForUser: vi.fn(),
  getCurrentResumeForUser: vi.fn(),
  getResumeForUser: vi.fn(),
  createResume: vi.fn(),
  deleteResumeForUser: vi.fn(),
}))

vi.mock('./resume-store', () => resumeMocks)

const backendStoreMocks = vi.hoisted(() => ({
  getActiveEntitlements: vi.fn(),
}))

vi.mock('./backend-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./backend-store')>()
  return {
    ...actual,
    getActiveEntitlements: backendStoreMocks.getActiveEntitlements,
  }
})

const sampleResume = {
  id: 'resume-1',
  fileName: 'resume.pdf',
  resumeText: 'Senior engineer with ten years of experience building APIs.',
  isCurrent: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

function setBaseEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test'
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test'
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres'
  process.env.BILLING_ENABLED = 'false'
  delete process.env.EXTENSION_ID
}

function authHeaders() {
  return { authorization: `Bearer ${TEST_TOKEN}` }
}

describe('route smoke tests', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    setBaseEnv()
    supabaseMocks.signUp.mockResolvedValue({
      data: {
        user: { id: TEST_USER.id, email: TEST_USER.email },
        session: {
          access_token: 'access-new',
          refresh_token: 'refresh-new',
          expires_at: 999,
          expires_in: 3600,
        },
      },
      error: null,
    })
    supabaseMocks.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: TEST_USER.id, email: TEST_USER.email },
        session: {
          access_token: 'access-login',
          refresh_token: 'refresh-login',
          expires_at: 999,
          expires_in: 3600,
        },
      },
      error: null,
    })
    supabaseMocks.refreshSession.mockResolvedValue({
      data: {
        user: { id: TEST_USER.id, email: TEST_USER.email },
        session: {
          access_token: 'access-refreshed',
          refresh_token: 'refresh-refreshed',
          expires_at: 888,
          expires_in: 3600,
        },
      },
      error: null,
    })
    supabaseMocks.adminSignOut.mockResolvedValue({ error: null })
    resumeMocks.listResumesForUser.mockResolvedValue([sampleResume])
    resumeMocks.getCurrentResumeForUser.mockResolvedValue(sampleResume)
    resumeMocks.getResumeForUser.mockResolvedValue(sampleResume)
    resumeMocks.createResume.mockResolvedValue(sampleResume)
    resumeMocks.deleteResumeForUser.mockResolvedValue(true)
    backendStoreMocks.getActiveEntitlements.mockResolvedValue(['basic'])
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.clearAllMocks()
  })

  it('GET /health returns ok', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
  })

  it('POST /auth/signup creates a user session', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { email: 'new@example.com', password: 'secret12' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      user: { id: string; email: string | null }
      session: { accessToken: string }
    }
    expect(body.user.email).toBe(TEST_USER.email)
    expect(body.session.accessToken).toBe('access-new')
  })

  it('POST /auth/login returns a session', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'test@example.com', password: 'secret12' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().session.accessToken).toBe('access-login')
  })

  it('POST /auth/refresh exchanges a refresh token', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: 'old-refresh' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().session.accessToken).toBe('access-refreshed')
  })

  it('GET /auth/me requires auth and returns the user', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const unauthorized = await app.inject({ method: 'GET', url: '/auth/me' })
    expect(unauthorized.statusCode).toBe(401)

    const authorized = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: authHeaders(),
    })
    expect(authorized.statusCode).toBe(200)
    expect(authorized.json()).toEqual({ user: TEST_USER })
  })

  it('POST /auth/logout revokes the token best-effort', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
    expect(supabaseMocks.adminSignOut).toHaveBeenCalledWith(TEST_TOKEN)
  })

  it('GET /auth/google/url builds a Supabase authorize URL', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'GET',
      url: `/auth/google/url?redirectTo=${encodeURIComponent(EXT_REDIRECT)}`,
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { url: string }
    expect(body.url).toContain('https://test.supabase.co/auth/v1/authorize')
    expect(body.url).toContain('provider=google')
    expect(body.url).toContain(encodeURIComponent(EXT_REDIRECT))
  })

  it('GET /resumes lists resumes for the authenticated user', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'GET',
      url: '/resumes',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().resumes).toHaveLength(1)
    expect(resumeMocks.listResumesForUser).toHaveBeenCalledWith(TEST_USER.id)
  })

  it('GET /resumes/current returns the current resume', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'GET',
      url: '/resumes/current',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().resume.id).toBe('resume-1')
  })

  it('GET /resumes/:id returns a specific resume', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'GET',
      url: '/resumes/resume-1',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().resume.id).toBe('resume-1')
  })

  it('POST /resumes creates a resume', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/resumes',
      headers: authHeaders(),
      payload: {
        resumeText: 'Updated resume text with enough characters.',
        fileName: 'updated.pdf',
        makeCurrent: true,
      },
    })

    expect(res.statusCode).toBe(201)
    expect(resumeMocks.createResume).toHaveBeenCalled()
  })

  it('DELETE /resumes/:id deletes a resume', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'DELETE',
      url: '/resumes/resume-1',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
  })

  it('POST /parse-resume rejects multipart requests without a file', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/parse-resume',
      headers: { 'content-type': 'multipart/form-data; boundary=----smoke' },
      payload: '----smoke--\r\n',
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: '未检测到上传文件' })
  })

  it('POST /billing/checkout is disabled when billing is off', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/billing/checkout',
      headers: authHeaders(),
      payload: { productTier: 'basic' },
    })

    expect(res.statusCode).toBe(503)
    expect(res.json().error).toContain('支付系统暂时不可用')
  })

  it('GET /billing/entitlements returns active tiers', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'GET',
      url: '/billing/entitlements',
      headers: authHeaders(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ tiers: ['basic'], premium: false })
  })

  it('POST /billing/webhook rejects missing Stripe signature', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'POST',
      url: '/billing/webhook',
      headers: { 'content-type': 'application/json' },
      payload: '{}',
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'Missing Stripe signature' })
  })

  it('allows CORS preflight for configured origins', async () => {
    process.env.ALLOWED_ORIGINS = 'https://test123.vibeid.co'

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'OPTIONS',
      url: '/auth/login',
      headers: {
        origin: 'https://test123.vibeid.co',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'Content-Type',
      },
    })

    expect(res.statusCode).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('https://test123.vibeid.co')
  })
})
