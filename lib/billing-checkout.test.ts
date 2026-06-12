import { afterEach, describe, expect, it } from 'vitest'

describe('GET /checkout/success', () => {
  const ORIGINAL_ENV = { ...process.env }
  const EXT_ID = 'abcdefghijklmnopabcdefghijklmnop'

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('serves a bridge page that redirects to extension success.html', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test'
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test'
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres'

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'GET',
      url: `/checkout/success?extensionId=${EXT_ID}`,
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.body).toContain(`chrome-extension://${EXT_ID}/purchase/success.html`)
    expect(res.body).toContain('window.location.replace')
  })

  it('rejects success redirects without a valid extension id', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test'
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test'
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres'
    delete process.env.EXTENSION_ID

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'GET',
      url: '/checkout/success',
    })

    expect(res.statusCode).toBe(503)
    expect(res.json()).toEqual({ error: 'Extension ID is not configured' })
  })
})

describe('GET /checkout/cancel', () => {
  const ORIGINAL_ENV = { ...process.env }
  const EXT_ID = 'abcdefghijklmnopabcdefghijklmnop'

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('serves a bridge page that redirects to extension purchase.html', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test'
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test'
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres'

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'GET',
      url: `/checkout/cancel?extensionId=${EXT_ID}`,
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.body).toContain(`chrome-extension://${EXT_ID}/purchase/purchase.html`)
    expect(res.body).toContain('window.location.replace')
  })

  it('rejects cancel redirects without a valid extension id', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test'
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test'
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres'
    delete process.env.EXTENSION_ID

    const { buildApp } = await import('../src/app')
    const app = await buildApp()

    const res = await app.inject({
      method: 'GET',
      url: '/checkout/cancel',
    })

    expect(res.statusCode).toBe(503)
    expect(res.json()).toEqual({ error: 'Extension ID is not configured' })
  })
})
