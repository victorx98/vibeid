import { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import {
  ENTITLEMENT_COOKIE_NAME,
  EntitlementTier,
  buildEntitlementCookieHeader,
  mintEntitlementToken,
} from '@/lib/entitlements'
import { logError, logInfo, logWarn } from '@/lib/logger'
import {
  RATE_LIMITS,
  checkRateLimit,
  createRateLimitHeaders,
} from '@/lib/rate-limit'
import {
  billingKillSwitchEnabled,
  demoUnlocksEnabled,
} from '@/lib/runtime-config'
import { checkoutConfirmRequestSchema } from '@/lib/validation'

export const runtime = 'nodejs'

// Tier ladders — buying `resume` includes `basic`. Expand when new paid tiers
// ship, and keep server-side so clients can't fabricate combinations.
const TIERS_FOR_PRODUCT: Record<'basic' | 'resume', EntitlementTier[]> = {
  basic: ['basic'],
  resume: ['basic', 'resume'],
}

function respond(status: number, body: Record<string, unknown>, headers?: HeadersInit) {
  return Response.json(body, { status, headers })
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, RATE_LIMITS.checkoutConfirm)
  const baseHeaders = createRateLimitHeaders(rateLimit)

  if (!rateLimit.allowed) {
    return respond(429, { error: '请求过于频繁，请稍后再试' }, baseHeaders)
  }

  if (billingKillSwitchEnabled) {
    logWarn('checkout_kill_switch_engaged')
    return respond(503, { error: '支付系统暂时不可用，请稍后再试' }, baseHeaders)
  }

  try {
    const rawBody = await request.json()
    const { productTier } = checkoutConfirmRequestSchema.parse(rawBody)

    // Real billing integration (Stripe etc.) is not wired yet. Until it is,
    // the only path to mint an entitlement is the explicit demo flag.
    if (!demoUnlocksEnabled) {
      logWarn('checkout_confirm_refused_no_billing', { productTier })
      return respond(
        501,
        { error: '支付系统尚未接入，暂无法完成购买' },
        baseHeaders
      )
    }

    const tiers = TIERS_FOR_PRODUCT[productTier]
    const { token, expiresAt } = mintEntitlementToken({ tiers })
    const cookieHeader = buildEntitlementCookieHeader(token, expiresAt)

    logInfo('entitlement_minted', {
      productTier,
      tiers,
      mode: 'demo',
      expiresAt,
    })

    const responseHeaders = new Headers(baseHeaders)
    responseHeaders.append('Set-Cookie', cookieHeader)

    return Response.json(
      { tiers, expiresAt, cookieName: ENTITLEMENT_COOKIE_NAME },
      { headers: responseHeaders }
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return respond(400, { error: '请求参数不合法' }, baseHeaders)
    }

    logError('checkout_confirm_failed', error)
    return respond(500, { error: '支付确认失败，请稍后重试' }, baseHeaders)
  }
}
