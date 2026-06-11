import { logWarn } from './logger'

// NOTE: this limiter uses a process-local Map. It bounds bursts from one
// honest caller, but it does NOT coordinate across instances/containers. For
// production we must move to a shared backend (Redis or Postgres SKIP LOCKED)
// before the limits in RATE_LIMITS can be trusted as security controls.
type HeaderBag = Record<string, string | string[] | undefined>
type RequestLike = { headers: HeaderBag }

function headerValue(headers: HeaderBag, name: string): string | null {
  const value = headers[name]
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export interface RateLimitConfig {
  name: string
  max: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

interface Bucket {
  count: number
  resetAt: number
}

const globalStore = globalThis as typeof globalThis & {
  __vibeidRateLimitStore?: Map<string, Bucket>
  __vibeidRateLimitWarned?: boolean
}

const rateLimitStore =
  globalStore.__vibeidRateLimitStore ?? (globalStore.__vibeidRateLimitStore = new Map())

export const RATE_LIMITS = {
  upload: { name: 'upload', max: 10, windowMs: 60_000 },
  analyze: { name: 'analyze', max: 5, windowMs: 60 * 60 * 1000 },
  optimize: { name: 'optimize', max: 10, windowMs: 60 * 60 * 1000 },
  previewOptimize: { name: 'preview-optimize', max: 30, windowMs: 60_000 },
  checkoutConfirm: { name: 'checkout-confirm', max: 10, windowMs: 60 * 60 * 1000 },
  checkoutSession: { name: 'checkout-session', max: 10, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitConfig>

function warnOnceInProduction() {
  if (process.env.NODE_ENV !== 'production') return
  if (globalStore.__vibeidRateLimitWarned) return
  globalStore.__vibeidRateLimitWarned = true
  logWarn('rate_limit_in_memory', {
    detail:
      'Rate limiter is process-local. Swap for a shared backend before relying on these limits as a security control.',
  })
}

export function getClientIp(request: RequestLike): string {
  const forwardedFor = headerValue(request.headers, 'x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = headerValue(request.headers, 'x-real-ip')
  if (realIp) return realIp.trim()

  const connectingIp = headerValue(request.headers, 'cf-connecting-ip')
  if (connectingIp) return connectingIp.trim()

  const userAgent = headerValue(request.headers, 'user-agent') ?? 'unknown'
  return `ua:${userAgent.slice(0, 80)}`
}

export function checkRateLimit(request: RequestLike, config: RateLimitConfig): RateLimitResult {
  warnOnceInProduction()

  const now = Date.now()
  const ip = getClientIp(request)
  const key = `${config.name}:${ip}`
  const existing = rateLimitStore.get(key)

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })

    return {
      allowed: true,
      limit: config.max,
      remaining: Math.max(config.max - 1, 0),
      resetAt: now + config.windowMs,
      retryAfterSeconds: Math.ceil(config.windowMs / 1000),
    }
  }

  existing.count += 1
  rateLimitStore.set(key, existing)

  const remaining = Math.max(config.max - existing.count, 0)
  return {
    allowed: existing.count <= config.max,
    limit: config.max,
    remaining,
    resetAt: existing.resetAt,
    retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
  }
}

export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
    'Retry-After': String(result.retryAfterSeconds),
  }
}
