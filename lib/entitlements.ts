import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { Buffer } from 'node:buffer'

import type { NextRequest } from 'next/server'

export type EntitlementTier = 'basic' | 'resume'

export const ENTITLEMENT_COOKIE_NAME = 'vibeid_entitlement'
export const ENTITLEMENTS_SECRET_MIN_LENGTH = 32
const DEFAULT_TTL_SECONDS = 24 * 60 * 60

interface EntitlementPayload {
  sid: string
  tiers: EntitlementTier[]
  iat: number
  exp: number
}

function readSecret(): Buffer | null {
  const secret = process.env.ENTITLEMENTS_SECRET
  if (!secret || secret.length < ENTITLEMENTS_SECRET_MIN_LENGTH) return null
  return Buffer.from(secret, 'utf8')
}

function requireSecret(): Buffer {
  const secret = readSecret()
  if (secret) return secret

  // Fail loudly instead of silently accepting a weak or missing secret.
  throw new Error(
    `ENTITLEMENTS_SECRET must be set to a value of at least ${ENTITLEMENTS_SECRET_MIN_LENGTH} characters`
  )
}

export function entitlementsConfigured(): boolean {
  return readSecret() !== null
}

function base64urlEncode(data: Buffer): string {
  return data.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(value: string): Buffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  return Buffer.from(padded + pad, 'base64')
}

function sign(payload: string, secret: Buffer): string {
  return base64urlEncode(createHmac('sha256', secret).update(payload).digest())
}

export interface MintOptions {
  tiers: EntitlementTier[]
  ttlSeconds?: number
  sessionId?: string
}

export function mintEntitlementToken({ tiers, ttlSeconds, sessionId }: MintOptions): {
  token: string
  expiresAt: number
} {
  const secret = requireSecret()
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + (ttlSeconds ?? DEFAULT_TTL_SECONDS)
  const payload: EntitlementPayload = {
    sid: sessionId ?? randomBytes(12).toString('hex'),
    tiers: Array.from(new Set(tiers)),
    iat,
    exp,
  }
  const encoded = base64urlEncode(Buffer.from(JSON.stringify(payload), 'utf8'))
  const signature = sign(encoded, secret)
  return { token: `${encoded}.${signature}`, expiresAt: exp }
}

function safeParsePayload(encoded: string): EntitlementPayload | null {
  try {
    const json = base64urlDecode(encoded).toString('utf8')
    const parsed = JSON.parse(json) as Partial<EntitlementPayload>
    if (
      typeof parsed.sid !== 'string' ||
      !Array.isArray(parsed.tiers) ||
      typeof parsed.iat !== 'number' ||
      typeof parsed.exp !== 'number'
    ) {
      return null
    }
    return parsed as EntitlementPayload
  } catch {
    return null
  }
}

export function verifyEntitlementToken(
  token: string | null | undefined,
  requiredTier: EntitlementTier,
  now: number = Math.floor(Date.now() / 1000)
): { valid: true; payload: EntitlementPayload } | { valid: false; reason: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'missing_token' }
  }
  const parts = token.split('.')
  if (parts.length !== 2) return { valid: false, reason: 'malformed_token' }

  const secret = readSecret()
  if (!secret) return { valid: false, reason: 'secret_unconfigured' }

  const [encoded, signature] = parts
  const expected = sign(encoded, secret)
  const expectedBuf = Buffer.from(expected, 'utf8')
  const providedBuf = Buffer.from(signature, 'utf8')
  if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
    return { valid: false, reason: 'bad_signature' }
  }

  const payload = safeParsePayload(encoded)
  if (!payload) return { valid: false, reason: 'malformed_payload' }
  if (payload.exp <= now) return { valid: false, reason: 'expired' }
  if (!payload.tiers.includes(requiredTier)) return { valid: false, reason: 'tier_missing' }

  return { valid: true, payload }
}

// Build a Set-Cookie header string matching Next's cookie API shape.
export function buildEntitlementCookieHeader(token: string, expiresAt: number): string {
  const maxAge = Math.max(expiresAt - Math.floor(Date.now() / 1000), 0)
  const attrs = [
    `${ENTITLEMENT_COOKIE_NAME}=${token}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (process.env.NODE_ENV === 'production') attrs.push('Secure')
  return attrs.join('; ')
}

export function readEntitlementCookie(request: NextRequest): string | null {
  return request.cookies.get(ENTITLEMENT_COOKIE_NAME)?.value ?? null
}
