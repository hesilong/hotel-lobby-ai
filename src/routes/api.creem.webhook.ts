import { createFileRoute } from '@tanstack/react-router'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { findCreditPackByProductId, findPlanByProductId } from '@/config/products'
import { grantPurchasedCredits, grantSubscriptionCredits, revokeSubscriptionCredits, revokeUnusedCreditPack } from '@/server/credits'

const hex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('')

async function sign(raw: string, secret: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(raw)))
}

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const stringValue = (...values: unknown[]) => values.find(v => typeof v === 'string' && v.trim()) as string | undefined

const addMonth = (value: Date) => {
  const next = new Date(value)
  next.setUTCMonth(next.getUTCMonth() + 1)
  return next
}

function productIdOf(payload: any) {
  if (typeof payload?.product === 'string') return payload.product
  return stringValue(payload?.product?.id, payload?.order?.product, payload?.product_id, payload?.plan_id)
}

async function resolveUserId(admin: ReturnType<typeof getSupabaseAdminClient>, payload: any) {
  const metadata = payload?.metadata || payload?.subscription?.metadata || {}
  const direct = stringValue(metadata.userId, metadata.user_id, metadata.referenceId)
  if (direct) return direct

  const subscriptionId = stringValue(payload?.subscription?.id, payload?.subscription_id, payload?.id)
  if (subscriptionId) {
    const { data } = await admin.from('subscriptions').select('user_id').eq('creem_subscription_id', subscriptionId).maybeSingle()
    if (data?.user_id) return data.user_id as string
  }

  const email = stringValue(payload?.customer?.email, payload?.email)
  if (email) {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const user = data.users.find(item => item.email?.toLowerCase() === email.toLowerCase())
    if (user) return user.id
  }
  return null
}

async function syncSubscription(admin: ReturnType<typeof getSupabaseAdminClient>, params: {
  userId: string
  payload: any
  status: string
}) {
  const productId = productIdOf(params.payload)
  const plan = findPlanByProductId(productId)
  if (!productId || !plan) return
  const subscriptionId = stringValue(params.payload?.subscription?.id, params.payload?.subscription_id, params.payload?.id)
  const customerId = stringValue(params.payload?.customer?.id, params.payload?.customer)
  const periodStart = stringValue(params.payload?.current_period_start_date, params.payload?.current_period_start)
  const periodEnd = stringValue(params.payload?.current_period_end_date, params.payload?.current_period_end)
  const cancelAt = stringValue(params.payload?.canceled_at, params.payload?.cancel_at)

  const { data: existing } = subscriptionId
    ? await admin.from('subscriptions').select('id,plan_code,billing_cycle,plan_id,pending_plan_id,current_period_end,next_credit_reset_at,status').eq('creem_subscription_id', subscriptionId).maybeSingle()
    : await admin.from('subscriptions').select('id,plan_code,billing_cycle,plan_id,pending_plan_id,current_period_end,next_credit_reset_at,status').eq('user_id', params.userId).eq('payment_provider', 'creem').order('updated_at', { ascending: false }).limit(1).maybeSingle()

  let effectivePlan = plan
  let effectiveProductId = productId
  let pendingPlanId: string | null = null

  if (existing?.pending_plan_id) {
    const incomingIsPending = existing.pending_plan_id === productId
    const incomingIsCurrent = existing.plan_id === productId
    const rollover =
      incomingIsPending &&
      Boolean(periodStart && existing.current_period_end) &&
      Date.parse(periodStart!) >= Date.parse(existing.current_period_end!)

    if (!rollover && (incomingIsPending || incomingIsCurrent)) {
      const currentPlan = findPlanByProductId(existing.plan_id)
      if (currentPlan) {
        effectivePlan = currentPlan
        effectiveProductId = existing.plan_id
      }
      pendingPlanId = existing.pending_plan_id
    }
  }

  const body = {
    payment_provider: 'creem',
    user_id: params.userId,
    plan_code: effectivePlan.plan,
    billing_cycle: effectivePlan.cycle,
    plan_id: effectiveProductId,
    pending_plan_id: pendingPlanId,
    creem_subscription_id: subscriptionId || null,
    creem_customer_id: customerId || null,
    status: params.status,
    current_period_start: periodStart || null,
    current_period_end: periodEnd || null,
    next_credit_reset_at: effectivePlan.cycle === 'yearly'
      ? (existing?.next_credit_reset_at || addMonth(periodStart ? new Date(periodStart) : new Date()).toISOString())
      : null,
    cancel_at: cancelAt || null,
    meta: params.payload || {},
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    await admin.from('subscriptions').update(body).eq('id', existing.id)
  } else {
    await admin.from('subscriptions').insert(body)
  }
}

export const Route = createFileRoute('/api/creem/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CREEM_WEBHOOK_SECRET || ''
        if (!secret) return Response.json({ error: 'Webhook not configured' }, { status: 500 })
        const raw = await request.text()
        const signature = request.headers.get('creem-signature') || ''
        const expected = await sign(raw, secret)
        if (!signature || !safeEqual(expected, signature)) {
          return Response.json({ error: 'Invalid signature' }, { status: 401 })
        }

        let event: any
        try { event = JSON.parse(raw) } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }
        const eventId = stringValue(event?.id, event?.event_id) || `anonymous:${Date.now()}`
        const eventType = String(event?.eventType || event?.type || '').toLowerCase()
        const payload = event?.object || event?.data?.object || event?.data || event
        const admin = getSupabaseAdminClient()

        const { data: existing } = await admin.from('creem_webhook_events').select('status').eq('event_id', eventId).maybeSingle()
        if (existing?.status === 'processed') return Response.json({ received: true, duplicate: true })

        await admin.from('creem_webhook_events').upsert({
          event_id: eventId,
          event_type: eventType,
          status: 'processing',
          error: null,
        }, { onConflict: 'event_id' })

        try {
          const productId = productIdOf(payload)
          const userId = await resolveUserId(admin, payload)

          if (eventType === 'checkout.completed') {
            if (!userId) throw new Error('USER_NOT_FOUND')
            const pack = findCreditPackByProductId(productId)
            if (pack) {
              const checkoutId = stringValue(payload?.id, payload?.checkout_id, eventId) || eventId
              await grantPurchasedCredits({
                admin,
                userId,
                productId: productId!,
                packId: pack.key,
                credits: pack.credits,
                checkoutId,
                eventId,
              })
            }
            const plan = findPlanByProductId(productId)
            if (plan) await syncSubscription(admin, { userId, payload: payload?.subscription ? { ...payload.subscription, metadata: payload.metadata, product: payload.product, customer: payload.customer } : payload, status: 'active' })
          } else if (eventType === 'subscription.paid') {
            if (!userId) throw new Error('USER_NOT_FOUND')
            const plan = findPlanByProductId(productId)
            if (plan) {
              await syncSubscription(admin, { userId, payload, status: 'active' })
              const periodStart = stringValue(payload?.current_period_start_date, payload?.current_period_start)
              const subscriptionPeriodEnd = stringValue(payload?.current_period_end_date, payload?.current_period_end) || null
              const creditPeriodEnd = plan.cycle === 'yearly'
                ? addMonth(periodStart ? new Date(periodStart) : new Date()).toISOString()
                : subscriptionPeriodEnd
              await grantSubscriptionCredits({
                admin,
                userId,
                productId: productId!,
                planCode: plan.plan,
                credits: plan.definition.monthlyCredits,
                eventId,
                periodEnd: creditPeriodEnd,
              })
            }
          } else if (['subscription.active','subscription.trialing','subscription.update'].includes(eventType)) {
            if (userId) await syncSubscription(admin, { userId, payload, status: eventType === 'subscription.trialing' ? 'trialing' : 'active' })
          } else if (eventType === 'subscription.canceled') {
            if (userId) {
              await syncSubscription(admin, { userId, payload, status: 'canceled' })
              await revokeSubscriptionCredits({ admin, userId, reason: 'subscription_canceled' })
            }
          } else if (eventType === 'subscription.paused') {
            if (userId) await syncSubscription(admin, { userId, payload, status: 'paused' })
          } else if (eventType === 'subscription.expired') {
            if (userId) {
              await syncSubscription(admin, { userId, payload, status: 'unpaid' })
              await revokeSubscriptionCredits({ admin, userId, reason: 'subscription_expired' })
            }
          } else if (eventType === 'refund.created' || eventType === 'dispute.created') {
            const checkoutId = stringValue(payload?.checkout_id, payload?.checkout?.id, payload?.order?.checkout_id)
            const pack = findCreditPackByProductId(productId)
            if (pack) {
              await revokeUnusedCreditPack({ admin, checkoutId, productId })
            } else {
              const plan = findPlanByProductId(productId)
              if (plan && userId) {
                await revokeSubscriptionCredits({
                  admin,
                  userId,
                  reason: eventType === 'dispute.created' ? 'subscription_disputed' : 'subscription_refunded',
                })
                await admin.from('subscriptions').update({
                  status: 'unpaid',
                  updated_at: new Date().toISOString(),
                }).eq('user_id', userId).eq('payment_provider', 'creem').in('status', ['active','trialing','scheduled_cancel'])
              }
            }
          }

          await admin.from('creem_webhook_events').update({
            status: 'processed',
            processed_at: new Date().toISOString(),
          }).eq('event_id', eventId)
          return Response.json({ received: true })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'WEBHOOK_FAILED'
          await admin.from('creem_webhook_events').update({ status: 'failed', error: message }).eq('event_id', eventId)
          console.error('[Creem webhook]', eventType, message)
          return Response.json({ error: message }, { status: 500 })
        }
      },
    },
  },
})
