import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { mintEntitlementToken, verifyEntitlementToken } from './entitlements'

// Each test needs a fresh secret; restore afterwards so other suites don't see it.
const ORIGINAL_SECRET = process.env.ENTITLEMENTS_SECRET

describe('entitlement tokens', () => {
  beforeEach(() => {
    process.env.ENTITLEMENTS_SECRET = 'test-secret-' + 'x'.repeat(40)
  })

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.ENTITLEMENTS_SECRET
    else process.env.ENTITLEMENTS_SECRET = ORIGINAL_SECRET
  })

  it('mints and verifies a token carrying the requested tier', () => {
    const { token } = mintEntitlementToken({ tiers: ['premium'] })
    const result = verifyEntitlementToken(token, 'premium')
    expect(result.valid).toBe(true)
  })

  it('rejects a token missing the required tier', () => {
    const { token } = mintEntitlementToken({ tiers: ['basic'] })
    const result = verifyEntitlementToken(token, 'premium')
    expect(result).toEqual({ valid: false, reason: 'tier_missing' })
  })

  it('rejects an expired token', () => {
    const { token, expiresAt } = mintEntitlementToken({ tiers: ['premium'], ttlSeconds: 1 })
    const result = verifyEntitlementToken(token, 'premium', expiresAt + 1)
    expect(result).toEqual({ valid: false, reason: 'expired' })
  })

  it('rejects a tampered signature', () => {
    const { token } = mintEntitlementToken({ tiers: ['premium'] })
    const [payload] = token.split('.')
    const tampered = `${payload}.deadbeef`
    const result = verifyEntitlementToken(tampered, 'premium')
    expect(result.valid).toBe(false)
  })

  it('rejects malformed tokens', () => {
    expect(verifyEntitlementToken('', 'premium')).toEqual({ valid: false, reason: 'missing_token' })
    expect(verifyEntitlementToken('not-a-token', 'premium')).toEqual({
      valid: false,
      reason: 'malformed_token',
    })
  })

  it('refuses to mint or verify without a strong secret', () => {
    const { token } = mintEntitlementToken({ tiers: ['premium'] })
    delete process.env.ENTITLEMENTS_SECRET
    expect(() => mintEntitlementToken({ tiers: ['premium'] })).toThrow()
    expect(verifyEntitlementToken(token, 'premium')).toEqual({
      valid: false,
      reason: 'secret_unconfigured',
    })
  })

  it('refuses known placeholder secrets', () => {
    process.env.ENTITLEMENTS_SECRET = 'replace-with-at-least-32-characters'
    expect(() => mintEntitlementToken({ tiers: ['premium'] })).toThrow()
    expect(verifyEntitlementToken('not.a-real-token', 'premium')).toEqual({
      valid: false,
      reason: 'secret_unconfigured',
    })
  })
})
