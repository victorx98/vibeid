import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { ZodError } from 'zod'

import {
  attachCheckoutSessionToOrder,
  createPendingOrder,
  getArtifactForUser,
} from '@/lib/backend-store'
import {
  billingEnabled,
  getStripePriceId,
  requireEnv,
} from '@/lib/backend-config'
import { databaseConfigured } from '@/lib/db'
import { logError, logWarn } from '@/lib/logger'
import {
  RATE_LIMITS,
  checkRateLimit,
  createRateLimitHeaders,
} from '@/lib/rate-limit'
import { billingKillSwitchEnabled } from '@/lib/runtime-config'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { checkoutSessionRequestSchema } from '@/lib/validation'

export const runtime = 'nodejs'

function getStripe() {
  return new Stripe(requireEnv('STRIPE_SECRET_KEY'))
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, RATE_LIMITS.checkoutSession)
  const headers = createRateLimitHeaders(rateLimit)

  if (!rateLimit.allowed) {
    return Response.json(
      { error: '请求过于频繁，请稍后再试' },
      { status: 429, headers }
    )
  }

  if (billingKillSwitchEnabled || !billingEnabled()) {
    logWarn('checkout_session_refused_billing_disabled')
    return Response.json(
      { error: '支付系统暂时不可用，请稍后再试' },
      { status: 503, headers }
    )
  }

  const auth = await getAuthenticatedUser(request)
  if (auth.error === 'not_configured') {
    return Response.json(
      { error: '登录系统未配置，暂时无法创建支付订单' },
      { status: 503, headers }
    )
  }
  if (auth.error || !auth.user) {
    return Response.json(
      { error: '请先登录后再发起支付' },
      { status: 401, headers }
    )
  }

  if (!databaseConfigured()) {
    return Response.json(
      { error: '订单系统未配置，请稍后再试' },
      { status: 503, headers }
    )
  }

  try {
    const rawBody = await request.json()
    const { productTier, artifactId } = checkoutSessionRequestSchema.parse(rawBody)
    const priceId = getStripePriceId(productTier)
    if (!priceId) {
      return Response.json(
        { error: '支付价格未配置，请稍后再试' },
        { status: 503, headers }
      )
    }

    const artifact = await getArtifactForUser(auth.user.id, artifactId)
    if (!artifact) {
      return Response.json(
        { error: '未找到对应的简历分析记录' },
        { status: 404, headers }
      )
    }
    if (!artifact.confirmedEmail) {
      return Response.json(
        { error: '请先确认用于注册和接收服务通知的邮箱' },
        { status: 400, headers }
      )
    }

    const orderId = await createPendingOrder({
      userId: auth.user.id,
      artifactId,
      productTier,
    })

    const origin = request.nextUrl.origin
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: orderId,
      success_url: `${origin}/result?artifactId=${artifactId}&checkout=success`,
      cancel_url: `${origin}/sales?artifactId=${artifactId}&checkout=cancel`,
      metadata: {
        orderId,
        userId: auth.user.id,
        artifactId,
        productTier,
      },
    })

    await attachCheckoutSessionToOrder({
      orderId,
      checkoutSessionId: session.id,
    })

    return Response.json({ url: session.url }, { headers })
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: '请求参数不合法' },
        { status: 400, headers }
      )
    }

    logError('checkout_session_failed', error)
    return Response.json(
      { error: '支付订单创建失败，请稍后再试' },
      { status: 500, headers }
    )
  }
}
