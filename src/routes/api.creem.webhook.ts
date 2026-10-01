import { createFileRoute } from '@tanstack/react-router'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { findCreditPackByProductId, findPlanByProductId } from '@/config/products'
import { grantPurchasedCredits, grantSubscriptionCredits, revokeUnusedCreditPack } from '@/server/credits'

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
    ? await admin.from('subscriptions').select('id,plan_id,pending_plan_id').eq('creem_subscription_id', subscriptionId).maybeSingle()
    : await admin.from('subscriptions').select('id,plan_id,pending_plan_id').eq('user_id', params.userId).order('updated_at', { ascending: false }).limit(1).maybeSingle()

  const body = {
    user_id: params.userId,
    plan_code: plan.plan,
    billing_cycle: plan.cycle,
    plan_id: productId,
    pending_plan_id: null,
    creem_subscription_id: subscriptionId || null,
    creem_customer_id: customerId || null,
    status: params.status,
    current_period_start: periodStart || null,
    current_period_end: periodEnd || null,
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
              await grantSubscriptionCredits({
                admin,
                userId,
                productId: productId!,
                planCode: plan.plan,
                credits: plan.definition.monthlyCredits,
                eventId,
                periodEnd: stringValue(payload?.current_period_end_date, payload?.current_period_end) || null,
              })
            }
          } else if (['subscription.active','subscription.trialing','subscription.update'].includes(eventType)) {
            if (userId) await syncSubscription(admin, { userId, payload, status: eventType === 'subscription.trialing' ? 'trialing' : 'active' })
          } else if (eventType === 'subscription.canceled') {
            if (userId) await syncSubscription(admin, { userId, payload, status: 'canceled' })
          } else if (eventType === 'subscription.paused') {
            if (userId) await syncSubscription(admin, { userId, payload, status: 'paused' })
          } else if (eventType === 'subscription.expired') {
            if (userId) await syncSubscription(admin, { userId, payload, status: 'unpaid' })
          } else if (eventType === 'refund.created' || eventType === 'dispute.created') {
            const checkoutId = stringValue(payload?.checkout_id, payload?.checkout?.id, payload?.order?.checkout_id)
            await revokeUnusedCreditPack({ admin, checkoutId, productId })
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
