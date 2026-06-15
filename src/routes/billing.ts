import type { FastifyInstance } from 'fastify'
import Stripe from 'stripe'
import { ZodError } from 'zod'

import {
  attachCheckoutSessionToOrder,
  createPendingOrder,
  getActiveEntitlements,
  insertStripeEvent,
  markOrderCanceled,
  markOrderPaidAndGrantEntitlements,
  markStripeEventProcessed,
} from '../../lib/backend-store'
import { billingEnabled, getEnv, getStripePriceId, requireEnv } from '../../lib/backend-config'
import { databaseConfigured } from '../../lib/db'
import {
  appendExtensionIdToUrl,
  buildCheckoutCancelBridgeHtml,
  buildCheckoutSuccessBridgeHtml,
  resolveExtensionId,
} from '../../lib/extension-pages'
import { logError, logInfo, logWarn } from '../../lib/logger'
import { RATE_LIMITS, checkRateLimit, createRateLimitHeaders } from '../../lib/rate-limit'
import { billingKillSwitchEnabled } from '../../lib/runtime-config'
import { checkoutRequestSchema } from '../../lib/validation'

function getStripe(): Stripe {
  return new Stripe(requireEnv('STRIPE_SECRET_KEY'))
}

function getPaymentIntentId(session: Stripe.Checkout.Session): string | null {
  const paymentIntent = session.payment_intent
  if (!paymentIntent) return null
  return typeof paymentIntent === 'string' ? paymentIntent : paymentIntent.id
}

async function handleCheckoutSessionPaid(sessionId: string): Promise<void> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  })

  if (session.payment_status !== 'paid') {
    logWarn('stripe_checkout_session_not_paid', {
      sessionId: session.id,
      paymentStatus: session.payment_status,
    })
    return
  }

  const granted = await markOrderPaidAndGrantEntitlements({
    checkoutSessionId: session.id,
    orderId: session.metadata?.orderId ?? null,
    paymentIntentId: getPaymentIntentId(session),
    amount: session.amount_total,
    currency: session.currency,
  })

  if (!granted) {
    logWarn('stripe_checkout_order_missing', { sessionId: session.id })
    return
  }

  logInfo('stripe_entitlement_granted', {
    orderId: granted.orderId,
    productTier: granted.productTier,
  })
}

export default async function billingRoutes(app: FastifyInstance): Promise<void> {
  app.get('/checkout/cancel', async (request, reply) => {
    const query = request.query as { extensionId?: string }
    const extensionId = resolveExtensionId(query.extensionId, getEnv('EXTENSION_ID'))
    if (!extensionId) {
      logWarn('checkout_cancel_missing_extension_id')
      return reply.code(503).send({ error: 'Extension ID is not configured' })
    }

    return reply
      .type('text/html; charset=utf-8')
      .send(buildCheckoutCancelBridgeHtml(extensionId))
  })

  app.get('/checkout/success', async (request, reply) => {
    const query = request.query as { extensionId?: string }
    const extensionId = resolveExtensionId(query.extensionId, getEnv('EXTENSION_ID'))
    if (!extensionId) {
      logWarn('checkout_success_missing_extension_id')
      return reply.code(503).send({ error: 'Extension ID is not configured' })
    }

    return reply
      .type('text/html; charset=utf-8')
      .send(buildCheckoutSuccessBridgeHtml(extensionId))
  })

  app.post('/billing/checkout', { preHandler: app.authenticate }, async (request, reply) => {
    const rateLimit = checkRateLimit(request, RATE_LIMITS.checkoutSession)
    reply.headers(createRateLimitHeaders(rateLimit))
    if (!rateLimit.allowed) {
      return reply.code(429).send({ error: '请求过于频繁，请稍后再试' })
    }

    if (!databaseConfigured()) {
      return reply.code(503).send({ error: '订单系统未配置，请稍后再试' })
    }

    try {
      const { productTier, extensionId: requestExtensionId } = checkoutRequestSchema.parse(
        request.body ?? {}
      )
      const priceId = getStripePriceId(productTier)
      if (!priceId) {
        return reply.code(503).send({ error: '支付价格未配置，请稍后再试' })
      }

      const baseSuccessUrl = getEnv('CHECKOUT_SUCCESS_URL')
      const baseCancelUrl = getEnv('CHECKOUT_CANCEL_URL')
      if (!baseSuccessUrl || !baseCancelUrl) {
        logWarn('checkout_missing_redirect_urls')
        return reply.code(503).send({ error: '支付回调地址未配置，请稍后再试' })
      }

      const extensionId = resolveExtensionId(requestExtensionId, getEnv('EXTENSION_ID'))
      const cancelUrl = extensionId
        ? appendExtensionIdToUrl(baseCancelUrl, extensionId)
        : baseCancelUrl

      const successUrl = extensionId ? appendExtensionIdToUrl(baseSuccessUrl, extensionId) : baseSuccessUrl

      const userId = request.authUser!.id
      const orderId = await createPendingOrder({ userId, productTier })

      const session = await getStripe().checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: orderId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { orderId, userId, productTier },
      })

      await attachCheckoutSessionToOrder({ orderId, checkoutSessionId: session.id })

      return reply.send({ url: session.url })
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: '请求参数不合法' })
      }
      if (
        error instanceof Stripe.errors.StripeAuthenticationError ||
        error instanceof Stripe.errors.StripeInvalidRequestError
      ) {
        logError('checkout_session_failed', error)
        return reply.code(503).send({ error: 'Stripe authentication or invalid request' })
      }
      logError('checkout_session_failed', error)
      return reply.code(500).send({ error: '支付订单创建失败，请稍后再试' })
    }
  })

  app.get('/billing/entitlements', { preHandler: app.authenticate }, async (request, reply) => {
    try {
      const tiers = await getActiveEntitlements(request.authUser!.id)
      return reply.send({
        tiers,
        premium: tiers.includes('premium'),
      })
    } catch (error) {
      logError('entitlements_fetch_failed', error)
      return reply.code(500).send({ error: 'entitlements_failed' })
    }
  })

  // Stripe webhook needs the raw request body for signature verification, so
  // it lives in its own encapsulated plugin that parses application/json as a
  // Buffer. This scope does not affect the JSON parsing of other routes.
  await app.register(async (webhook) => {
    webhook.addContentTypeParser(
      'application/json',
      { parseAs: 'buffer' },
      (_req, body, done) => {
        done(null, body)
      }
    )

    webhook.post('/billing/webhook', async (request, reply) => {
      if (!databaseConfigured()) {
        return reply.code(503).send({ error: 'Webhook storage is not configured' })
      }

      const signature = request.headers['stripe-signature']
      const sig = Array.isArray(signature) ? signature[0] : signature
      if (!sig) {
        return reply.code(400).send({ error: 'Missing Stripe signature' })
      }

      let event: Stripe.Event
      try {
        const rawBody = request.body as Buffer
        event = getStripe().webhooks.constructEvent(
          rawBody,
          sig,
          requireEnv('STRIPE_WEBHOOK_SECRET')
        )
      } catch {
        logWarn('stripe_webhook_bad_signature')
        return reply.code(400).send({ error: 'Invalid Stripe signature' })
      }

      const inserted = await insertStripeEvent(event.id, event.type)
      if (!inserted) {
        return reply.send({ received: true, duplicate: true })
      }

      try {
        if (
          event.type === 'checkout.session.completed' ||
          event.type === 'checkout.session.async_payment_succeeded'
        ) {
          const session = event.data.object as Stripe.Checkout.Session
          await handleCheckoutSessionPaid(session.id)
        } else if (event.type === 'checkout.session.expired') {
          const session = event.data.object as Stripe.Checkout.Session
          await markOrderCanceled(session.id)
        }

        await markStripeEventProcessed(event.id)
        return reply.send({ received: true })
      } catch (error) {
        logError('stripe_webhook_failed', error, { eventId: event.id, type: event.type })
        await markStripeEventProcessed(
          event.id,
          error instanceof Error ? error.message : 'Unknown webhook error'
        )
        return reply.code(500).send({ error: 'Webhook processing failed' })
      }
    })
  })
}
