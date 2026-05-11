import { NextRequest } from 'next/server'
import QRCode from 'qrcode'
import { ZodError } from 'zod'

import {
  attachProviderOrderToOrder,
  buildWechatOutTradeNo,
  createPendingOrder,
  getArtifactForUser,
  getWechatOpenIdForUser,
} from '@/lib/backend-store'
import {
  billingEnabled,
  getWechatPriceCents,
  wechatPayEnabled,
} from '@/lib/backend-config'
import { databaseConfigured } from '@/lib/db'
import { logError, logWarn } from '@/lib/logger'
import {
  RATE_LIMITS,
  checkRateLimit,
  createRateLimitHeaders,
} from '@/lib/rate-limit'
import { getClientIp } from '@/lib/rate-limit'
import { billingKillSwitchEnabled } from '@/lib/runtime-config'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { checkoutSessionRequestSchema } from '@/lib/validation'
import {
  appendWechatRedirectUrl,
  buildWechatOAuthAuthorizeUrl,
  createWechatH5Order,
  createWechatJsapiOrder,
  createWechatNativeOrder,
  detectWechatPayChannel,
  getWechatPayConfig,
  signWechatOAuthState,
} from '@/lib/wechat-pay'

export const runtime = 'nodejs'

function getSafeClientIp(request: NextRequest): string {
  const ip = getClientIp(request)
  return ip.startsWith('ua:') ? '127.0.0.1' : ip
}

function addQueryParam(path: string, key: string, value: string): string {
  const url = new URL(path, 'https://vibeid.local')
  url.searchParams.set(key, value)
  return `${url.pathname}${url.search}`
}

function getReturnPath(request: NextRequest, artifactId: string, productTier: 'basic' | 'resume') {
  const fallback =
    productTier === 'resume'
      ? `/result?artifactId=${artifactId}`
      : `/sales?artifactId=${artifactId}`
  const referer = request.headers.get('referer')
  let returnPath = fallback
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      if (refererUrl.origin === request.nextUrl.origin) {
        returnPath = `${refererUrl.pathname}${refererUrl.search}`
      }
    } catch {
      returnPath = fallback
    }
  }

  returnPath = addQueryParam(returnPath, 'wechat_pay', '1')
  return addQueryParam(returnPath, 'wechat_product', productTier)
}

function getProductDescription(productTier: 'basic' | 'resume'): string {
  return productTier === 'resume' ? 'Vibe ID 简历优化' : 'Vibe ID 导师报告'
}

function getExpiresAt(): string {
  return new Date(Date.now() + 15 * 60 * 1000).toISOString()
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

  if (billingKillSwitchEnabled || !billingEnabled() || !wechatPayEnabled()) {
    logWarn('wechat_checkout_refused_billing_disabled')
    return Response.json(
      { error: '微信支付暂时不可用，请稍后再试' },
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
    const amountCents = getWechatPriceCents(productTier)
    if (!amountCents) {
      return Response.json(
        { error: '微信支付价格未配置，请稍后再试' },
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

    const channel = detectWechatPayChannel(request.headers.get('user-agent'))
    const config = getWechatPayConfig()
    const returnPath = getReturnPath(request, artifactId, productTier)
    const origin = request.nextUrl.origin

    if (channel === 'jsapi') {
      const openId = await getWechatOpenIdForUser(auth.user.id, config.appId)
      if (!openId) {
        const state = signWechatOAuthState({
          userId: auth.user.id,
          artifactId,
          productTier,
          returnPath,
        })
        const authorizeUrl = buildWechatOAuthAuthorizeUrl({
          redirectUri: `${origin}/api/wechat/oauth/callback`,
          state,
        })
        return Response.json(
          { type: 'authorize', channel, authorizeUrl },
          { headers }
        )
      }
    }

    const orderId = await createPendingOrder({
      userId: auth.user.id,
      artifactId,
      productTier,
      amount: amountCents,
      currency: 'CNY',
      paymentProvider: 'wechat',
      providerChannel: channel,
    })
    const outTradeNo = buildWechatOutTradeNo(orderId)
    const orderInput = {
      outTradeNo,
      description: getProductDescription(productTier),
      amountCents,
      clientIp: getSafeClientIp(request),
      notifyUrl: `${origin}/api/wechat/webhook`,
      timeExpire: getExpiresAt(),
      attach: orderId,
    }

    if (channel === 'native') {
      const { codeUrl } = await createWechatNativeOrder(orderInput)
      const qrSvg = await QRCode.toString(codeUrl, {
        type: 'svg',
        width: 240,
        margin: 1,
        color: {
          dark: '#0E2620',
          light: '#FFFFFF',
        },
      })
      await attachProviderOrderToOrder({
        orderId,
        paymentProvider: 'wechat',
        providerChannel: channel,
        providerOrderId: outTradeNo,
        providerPayload: { codeUrl },
      })
      return Response.json(
        { type: 'native', channel, orderId, codeUrl, qrSvg, expiresAt: orderInput.timeExpire },
        { headers }
      )
    }

    if (channel === 'h5') {
      const { h5Url } = await createWechatH5Order(orderInput)
      await attachProviderOrderToOrder({
        orderId,
        paymentProvider: 'wechat',
        providerChannel: channel,
        providerOrderId: outTradeNo,
        providerPayload: { h5Url },
      })
      const redirectUrl = `${origin}/result?artifactId=${artifactId}&checkout=success&checkoutOrderId=${orderId}`
      return Response.json(
        {
          type: 'h5',
          channel,
          orderId,
          h5Url: appendWechatRedirectUrl(h5Url, redirectUrl),
          expiresAt: orderInput.timeExpire,
        },
        { headers }
      )
    }

    const openId = await getWechatOpenIdForUser(auth.user.id, config.appId)
    if (!openId) {
      throw new Error('Missing WeChat openid after OAuth check')
    }
    const payParams = await createWechatJsapiOrder({ ...orderInput, openId })
    await attachProviderOrderToOrder({
      orderId,
      paymentProvider: 'wechat',
      providerChannel: channel,
      providerOrderId: outTradeNo,
      providerPayload: { payParams },
    })
    return Response.json(
      { type: 'jsapi', channel, orderId, payParams, expiresAt: orderInput.timeExpire },
      { headers }
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: '请求参数不合法' },
        { status: 400, headers }
      )
    }

    logError('wechat_checkout_failed', error)
    return Response.json(
      { error: '微信支付订单创建失败，请稍后再试' },
      { status: 500, headers }
    )
  }
}
