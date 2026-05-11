import {
  insertWechatEvent,
  markProviderOrderPaidAndGrantEntitlements,
  markWechatEventProcessed,
} from '@/lib/backend-store'
import { databaseConfigured } from '@/lib/db'
import { logError, logInfo, logWarn } from '@/lib/logger'
import {
  decryptWechatResource,
  verifyWechatPaySignature,
  WechatPayNotification,
  WechatTransaction,
} from '@/lib/wechat-pay'

export const runtime = 'nodejs'

function wechatSuccess(body: Record<string, unknown> = {}) {
  return Response.json({ code: 'SUCCESS', message: '成功', ...body })
}

function wechatFailure(message: string, status = 500) {
  return Response.json({ code: 'FAIL', message }, { status })
}

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return wechatFailure('Webhook storage is not configured', 503)
  }

  const rawBody = await request.text()
  const validSignature = verifyWechatPaySignature({
    body: rawBody,
    timestamp: request.headers.get('wechatpay-timestamp'),
    nonce: request.headers.get('wechatpay-nonce'),
    signature: request.headers.get('wechatpay-signature'),
  })
  if (!validSignature) {
    logWarn('wechat_webhook_bad_signature')
    return wechatFailure('Invalid signature', 401)
  }

  let event: WechatPayNotification
  let transaction: WechatTransaction
  try {
    event = JSON.parse(rawBody) as WechatPayNotification
    transaction = decryptWechatResource<WechatTransaction>(event.resource)
  } catch (error) {
    logError('wechat_webhook_decode_failed', error)
    return wechatFailure('Webhook decode failed', 400)
  }

  const inserted = await insertWechatEvent({
    id: event.id,
    type: event.event_type,
    providerOrderId: transaction.out_trade_no,
    providerPaymentId: transaction.transaction_id ?? null,
  })
  if (!inserted) {
    return wechatSuccess({ duplicate: true })
  }

  try {
    if (event.event_type === 'TRANSACTION.SUCCESS' && transaction.trade_state === 'SUCCESS') {
      const granted = await markProviderOrderPaidAndGrantEntitlements({
        paymentProvider: 'wechat',
        providerOrderId: transaction.out_trade_no,
        providerPaymentId: transaction.transaction_id ?? null,
        amount: transaction.amount?.total ?? null,
        currency: transaction.amount?.currency ?? 'CNY',
        providerPayload: transaction,
      })

      if (!granted) {
        logWarn('wechat_checkout_order_missing_or_mismatched', {
          outTradeNo: transaction.out_trade_no,
          transactionId: transaction.transaction_id,
        })
      } else {
        logInfo('wechat_entitlement_granted', {
          orderId: granted.orderId,
          productTier: granted.productTier,
        })
      }
    }

    await markWechatEventProcessed(event.id)
    return wechatSuccess()
  } catch (error) {
    logError('wechat_webhook_failed', error, {
      eventId: event.id,
      type: event.event_type,
    })
    await markWechatEventProcessed(
      event.id,
      error instanceof Error ? error.message : 'Unknown webhook error'
    )
    return wechatFailure('Webhook processing failed')
  }
}
