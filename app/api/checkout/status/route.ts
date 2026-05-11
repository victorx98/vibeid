import { NextRequest } from 'next/server'

import {
  getActiveEntitlements,
  getCheckoutOrderForUser,
  markProviderOrderCanceled,
  markProviderOrderPaidAndGrantEntitlements,
} from '@/lib/backend-store'
import { databaseConfigured } from '@/lib/db'
import { logError, logWarn } from '@/lib/logger'
import {
  RATE_LIMITS,
  checkRateLimit,
  createRateLimitHeaders,
} from '@/lib/rate-limit'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { queryWechatOrderByOutTradeNo } from '@/lib/wechat-pay'

export const runtime = 'nodejs'

async function reconcileWechatOrder(order: Awaited<ReturnType<typeof getCheckoutOrderForUser>>) {
  if (!order || order.paymentProvider !== 'wechat' || order.status !== 'pending') return
  if (!order.providerOrderId) return

  const transaction = await queryWechatOrderByOutTradeNo(order.providerOrderId)
  if (transaction.trade_state === 'SUCCESS') {
    await markProviderOrderPaidAndGrantEntitlements({
      paymentProvider: 'wechat',
      providerOrderId: transaction.out_trade_no,
      providerPaymentId: transaction.transaction_id ?? null,
      amount: transaction.amount?.total ?? null,
      currency: transaction.amount?.currency ?? 'CNY',
      providerPayload: transaction,
    })
  } else if (['CLOSED', 'REVOKED', 'PAYERROR'].includes(transaction.trade_state)) {
    await markProviderOrderCanceled({
      paymentProvider: 'wechat',
      providerOrderId: order.providerOrderId,
    })
  }
}

export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(request, RATE_LIMITS.checkoutStatus)
  const headers = createRateLimitHeaders(rateLimit)

  if (!rateLimit.allowed) {
    return Response.json(
      { error: '请求过于频繁，请稍后再试' },
      { status: 429, headers }
    )
  }

  const auth = await getAuthenticatedUser(request)
  if (auth.error === 'not_configured') {
    return Response.json(
      { error: '登录系统未配置，暂时无法查询订单' },
      { status: 503, headers }
    )
  }
  if (auth.error || !auth.user) {
    return Response.json(
      { error: '请先登录后再查询订单' },
      { status: 401, headers }
    )
  }

  if (!databaseConfigured()) {
    return Response.json(
      { error: '订单系统未配置，请稍后再试' },
      { status: 503, headers }
    )
  }

  const orderId = request.nextUrl.searchParams.get('orderId')
  if (!orderId) {
    return Response.json({ error: '缺少订单号' }, { status: 400, headers })
  }

  try {
    const initialOrder = await getCheckoutOrderForUser(auth.user.id, orderId)
    if (!initialOrder) {
      return Response.json({ error: '未找到订单' }, { status: 404, headers })
    }

    try {
      await reconcileWechatOrder(initialOrder)
    } catch (error) {
      logWarn('wechat_order_reconcile_failed', {
        orderId,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    const order = await getCheckoutOrderForUser(auth.user.id, orderId)
    const entitlements = await getActiveEntitlements(auth.user.id)
    return Response.json({ order, entitlements }, { headers })
  } catch (error) {
    logError('checkout_status_failed', error, { orderId })
    return Response.json(
      { error: '订单状态查询失败，请稍后再试' },
      { status: 500, headers }
    )
  }
}
