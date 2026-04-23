import Stripe from 'stripe'

import {
  insertStripeEvent,
  markOrderCanceled,
  markOrderPaidAndGrantEntitlements,
  markStripeEventProcessed,
} from '@/lib/backend-store'
import { requireEnv } from '@/lib/backend-config'
import { databaseConfigured } from '@/lib/db'
import { logError, logInfo, logWarn } from '@/lib/logger'

export const runtime = 'nodejs'

function getStripe() {
  return new Stripe(requireEnv('STRIPE_SECRET_KEY'))
}

function getPaymentIntentId(session: Stripe.Checkout.Session): string | null {
  const paymentIntent = session.payment_intent
  if (!paymentIntent) return null
  return typeof paymentIntent === 'string' ? paymentIntent : paymentIntent.id
}

async function handleCheckoutSessionPaid(sessionId: string) {
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

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return Response.json(
      { error: 'Webhook storage is not configured' },
      { status: 503 }
    )
  }

  let event: Stripe.Event
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return Response.json({ error: 'Missing Stripe signature' }, { status: 400 })
  }

  try {
    const rawBody = await request.text()
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      requireEnv('STRIPE_WEBHOOK_SECRET')
    )
  } catch {
    logWarn('stripe_webhook_bad_signature')
    return Response.json({ error: 'Invalid Stripe signature' }, { status: 400 })
  }

  const inserted = await insertStripeEvent(event.id, event.type)
  if (!inserted) {
    return Response.json({ received: true, duplicate: true })
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
    return Response.json({ received: true })
  } catch (error) {
    logError('stripe_webhook_failed', error, { eventId: event.id, type: event.type })
    await markStripeEventProcessed(
      event.id,
      error instanceof Error ? error.message : 'Unknown webhook error'
    )
    return Response.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
