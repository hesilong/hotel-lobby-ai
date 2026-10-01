import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { CREDIT_PACKS, PLANS, planProductId, publicPricingCatalog, type BillingCycle, type CreditPackKey } from '@/config/products'
import { reconcileYearlySubscriptionCredits } from '@/server/credits'

const creemBase = () => {
  const base = (process.env.CREEM_API_URL || process.env.CREEM_BASE_URL || 'https://api.creem.io').replace(/\/+$/, '')
  return base.endsWith('/v1') ? base : `${base}/v1`
}

const siteUrl = () => (process.env.VITE_SITE_URL || 'https://hotel-lobby-ai.pro').replace(/\/+$/, '')

async function requireUser() {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('AUTH_REQUIRED')
  return data.user
}

const normalizeReturnPath = (value?: string | null) => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}

export const getPricingCatalog = createServerFn({ method: 'GET' }).handler(async () => publicPricingCatalog())

export const getBillingState = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const admin = getSupabaseAdminClient()
  await reconcileYearlySubscriptionCredits(admin, user.id)
  const [{ data: profile, error: profileError }, { data: subscription, error: subscriptionError }] = await Promise.all([
    admin.from('profiles').select('credits').eq('id', user.id).maybeSingle(),
    admin.from('subscriptions')
      .select('id,plan_code,billing_cycle,plan_id,pending_plan_id,status,current_period_start,current_period_end,next_credit_reset_at,cancel_at,creem_subscription_id,updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  if (profileError) throw new Error(profileError.message)
  if (subscriptionError) throw new Error(subscriptionError.message)
  return {
    userId: user.id,
    email: user.email || null,
    credits: Number(profile?.credits || 0),
    subscription: subscription || null,
  }
})

export type CheckoutInput =
  | { type: 'credit_pack'; key: CreditPackKey; returnPath?: string }
  | { type: 'subscription'; plan: 'pro' | 'ultimate'; cycle: BillingCycle; returnPath?: string }

export const createCreemCheckout = createServerFn({ method: 'POST' })
  .inputValidator((input: CheckoutInput) => input)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const apiKey = process.env.CREEM_API_KEY || process.env.CREEM_SECRET_KEY
    if (!apiKey) throw new Error('CREEM_NOT_CONFIGURED')

    const productId = data.type === 'credit_pack'
      ? CREDIT_PACKS[data.key]?.productId
      : planProductId(data.plan, data.cycle)
    if (!productId) throw new Error('PRODUCT_NOT_CONFIGURED')

    const returnPath = normalizeReturnPath(data.returnPath)
    const success = new URL(returnPath, siteUrl())
    success.searchParams.set('purchase_return', '1')
    success.searchParams.set('purchase_type', data.type)

    const metadata = data.type === 'credit_pack'
      ? { userId: user.id, purchaseType: 'credit_pack', packId: data.key, source: 'hotel-lobby-ai' }
      : { userId: user.id, purchaseType: 'subscription', planCode: data.plan, billingCycle: data.cycle, source: 'hotel-lobby-ai' }

    const response = await fetch(`${creemBase()}/checkouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        product_id: productId,
        request_id: `hotel-lobby-${user.id}-${Date.now()}`,
        success_url: success.toString(),
        customer: user.email ? { email: user.email } : undefined,
        metadata,
      }),
    })
    const payload = await response.json().catch(() => ({})) as { checkout_url?: string; id?: string; error?: string; message?: string }
    if (!response.ok || !payload.checkout_url) {
      throw new Error(payload.error || payload.message || 'CHECKOUT_CREATE_FAILED')
    }
    return { checkoutUrl: payload.checkout_url, checkoutId: payload.id || null }
  })

export const changeSubscription = createServerFn({ method: 'POST' })
  .inputValidator((input: { plan: 'pro' | 'ultimate'; cycle: BillingCycle }) => input)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const admin = getSupabaseAdminClient()
    const { data: current, error } = await admin.from('subscriptions')
      .select('id,plan_code,billing_cycle,plan_id,status,creem_subscription_id')
      .eq('user_id', user.id)
      .in('status', ['active','trialing','scheduled_cancel'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!current?.creem_subscription_id) throw new Error('NO_ACTIVE_SUBSCRIPTION')

    const targetProductId = planProductId(data.plan, data.cycle)
    const currentRank = current.plan_code === 'ultimate' ? 2 : 1
    const targetRank = data.plan === 'ultimate' ? 2 : 1
    const immediate = targetRank > currentRank || (targetRank === currentRank && current.billing_cycle === 'monthly' && data.cycle === 'yearly')
    const apiKey = process.env.CREEM_API_KEY || process.env.CREEM_SECRET_KEY
    if (!apiKey) throw new Error('CREEM_NOT_CONFIGURED')

    const response = await fetch(`${creemBase()}/subscriptions/${encodeURIComponent(current.creem_subscription_id)}/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        product_id: targetProductId,
        update_behavior: immediate ? 'proration-charge-immediately' : 'proration-charge',
      }),
    })
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok) throw new Error(String(payload.error || payload.message || 'SUBSCRIPTION_CHANGE_FAILED'))

    await admin.from('subscriptions').update(immediate ? {
      plan_code: data.plan,
      billing_cycle: data.cycle,
      plan_id: targetProductId,
      pending_plan_id: null,
      status: String(payload.status || current.status),
      meta: payload,
      updated_at: new Date().toISOString(),
    } : {
      pending_plan_id: targetProductId,
      meta: payload,
      updated_at: new Date().toISOString(),
    }).eq('id', current.id)

    return { ok: true, immediate }
  })

export const cancelSubscription = createServerFn({ method: 'POST' }).handler(async () => {
  const user = await requireUser()
  const admin = getSupabaseAdminClient()
  const { data: current, error } = await admin.from('subscriptions')
    .select('id,status,current_period_end,cancel_at,creem_subscription_id')
    .eq('user_id', user.id)
    .in('status', ['active','trialing','scheduled_cancel','unpaid'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!current?.creem_subscription_id) throw new Error('NO_ACTIVE_SUBSCRIPTION')
  if (current.status === 'scheduled_cancel') return { ok: true, cancelAt: current.cancel_at || current.current_period_end }

  const apiKey = process.env.CREEM_API_KEY || process.env.CREEM_SECRET_KEY
  if (!apiKey) throw new Error('CREEM_NOT_CONFIGURED')
  const response = await fetch(`${creemBase()}/subscriptions/${encodeURIComponent(current.creem_subscription_id)}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ mode: 'scheduled', onExecute: 'cancel' }),
  })
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) throw new Error(String(payload.error || payload.message || 'SUBSCRIPTION_CANCEL_FAILED'))
  const cancelAt = String(payload.cancel_at || payload.current_period_end || current.current_period_end || '') || null
  await admin.from('subscriptions').update({
    status: 'scheduled_cancel',
    cancel_at: cancelAt,
    pending_plan_id: null,
    meta: payload,
    updated_at: new Date().toISOString(),
  }).eq('id', current.id)
  return { ok: true, cancelAt }
})

export const resumeSubscription = createServerFn({ method: 'POST' }).handler(async () => {
  const user = await requireUser()
  const admin = getSupabaseAdminClient()
  const { data: current, error } = await admin.from('subscriptions')
    .select('id,creem_subscription_id')
    .eq('user_id', user.id)
    .eq('status', 'scheduled_cancel')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!current?.creem_subscription_id) throw new Error('NO_SCHEDULED_SUBSCRIPTION')

  const apiKey = process.env.CREEM_API_KEY || process.env.CREEM_SECRET_KEY
  if (!apiKey) throw new Error('CREEM_NOT_CONFIGURED')
  const response = await fetch(`${creemBase()}/subscriptions/${encodeURIComponent(current.creem_subscription_id)}/resume`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
  })
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) throw new Error(String(payload.error || payload.message || 'SUBSCRIPTION_RESUME_FAILED'))
  await admin.from('subscriptions').update({
    status: 'active',
    cancel_at: null,
    meta: payload,
    updated_at: new Date().toISOString(),
  }).eq('id', current.id)
  return { ok: true }
})
