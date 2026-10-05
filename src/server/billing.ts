import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { CREDIT_PACKS, PLANS, planProductId, publicPricingCatalog, type BillingCycle, type CreditPackKey } from '@/config/products'
import { reconcileYearlySubscriptionCredits } from '@/server/credits'
import { paymentProvider, paymentProductId } from '@/config/payments'
import { createWaffoCheckout, waffoClient } from '@/server/waffo'
import { retryWaffoEvents } from '@/server/waffo-webhooks'

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

export const getPricingCatalog = createServerFn({ method: 'GET' }).handler(async () => {
  const catalog = publicPricingCatalog()
  const provider = paymentProvider()
  for (const plan of ['pro', 'ultimate'] as const) {
    catalog.plans[plan].monthlyConfigured = Boolean(paymentProductId(provider, { type: 'subscription', plan, cycle: 'monthly' }))
    catalog.plans[plan].yearlyConfigured = Boolean(paymentProductId(provider, { type: 'subscription', plan, cycle: 'yearly' }))
  }
  for (const key of ['starter', 'creator', 'studio'] as const) {
    catalog.creditPacks[key].configured = Boolean(paymentProductId(provider, { type: 'credit_pack', key }))
  }
  return { ...catalog, provider }
})

export const getBillingState = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const admin = getSupabaseAdminClient()
  if (paymentProvider() === 'waffo') await retryWaffoEvents()
  await reconcileYearlySubscriptionCredits(admin, user.id)
  const [{ data: profile, error: profileError }, { data: subscription, error: subscriptionError }] = await Promise.all([
    admin.from('profiles').select('credits').eq('id', user.id).maybeSingle(),
    admin.from('subscriptions')
      .select('id,plan_code,billing_cycle,plan_id,pending_plan_id,status,current_period_start,current_period_end,next_credit_reset_at,cancel_at,creem_subscription_id,payment_provider,waffo_order_id,waffo_environment,updated_at')
      .eq('user_id', user.id)
      .in('status', ['active','trialing','scheduled_cancel','unpaid'])
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

export const createCheckout = createServerFn({ method: 'POST' })
  .inputValidator((input: CheckoutInput) => {
    if (input?.type === 'credit_pack' && ['starter','creator','studio'].includes(input.key)) return input
    if (input?.type === 'subscription' && ['pro','ultimate'].includes(input.plan) && ['monthly','yearly'].includes(input.cycle)) return input
    throw new Error('INVALID_CHECKOUT_INPUT')
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const returnPath = normalizeReturnPath(data.returnPath)
    const success = new URL(returnPath, siteUrl())
    success.searchParams.set('purchase_return', '1')
    success.searchParams.set('purchase_type', data.type)

    if (data.type === 'subscription') {
      const { data: existing, error } = await getSupabaseAdminClient().from('subscriptions').select('id')
        .eq('user_id', user.id).in('status', ['active','trialing','scheduled_cancel','unpaid']).limit(1)
      if (error) throw new Error(error.message)
      if (existing?.length) throw new Error('Manage your existing subscription before purchasing another plan.')
    }
    if (paymentProvider() === 'waffo') return createWaffoCheckout({ user, input: data, successUrl: success.toString() })
    const apiKey = process.env.CREEM_API_KEY || process.env.CREEM_SECRET_KEY
    if (!apiKey) throw new Error('CREEM_NOT_CONFIGURED')
    const productId = paymentProductId('creem', data)
    if (!productId) throw new Error('PRODUCT_NOT_CONFIGURED')

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
    return { checkoutUrl: payload.checkout_url, checkoutId: payload.id || null, provider: 'creem' as const }
  })

export const changeSubscription = createServerFn({ method: 'POST' })
  .inputValidator((input: { plan: 'pro' | 'ultimate'; cycle: BillingCycle }) => input)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const admin = getSupabaseAdminClient()
    const { data: current, error } = await admin.from('subscriptions')
      .select('id,plan_code,billing_cycle,plan_id,status,creem_subscription_id,payment_provider,waffo_order_id,waffo_environment')
      .eq('user_id', user.id)
      .in('status', ['active','trialing','scheduled_cancel'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!current) throw new Error('NO_ACTIVE_SUBSCRIPTION')
    if (current.payment_provider === 'waffo') {
      if (!current.waffo_order_id) throw new Error('NO_ACTIVE_SUBSCRIPTION')
      const { waffoEnvironment } = await import('@/server/waffo')
      if (current.waffo_environment !== waffoEnvironment()) throw new Error('WAFFO_SUBSCRIPTION_ENVIRONMENT_MISMATCH')
      const success = new URL('/pricing?purchase_return=1', siteUrl())
      const immediate = (data.plan === 'ultimate' && current.plan_code === 'pro') || (data.plan === current.plan_code && current.billing_cycle === 'monthly' && data.cycle === 'yearly')
      const result = await createWaffoCheckout({ user, input: { type: 'subscription', ...data }, successUrl: success.toString(), originOrderId: current.waffo_order_id, immediate })
      return { ok: true, immediate, checkoutUrl: result.checkoutUrl }
    }
    if (!current.creem_subscription_id) throw new Error('NO_ACTIVE_SUBSCRIPTION')

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

    return { ok: true, immediate, checkoutUrl: null }
  })

export const cancelSubscription = createServerFn({ method: 'POST' }).handler(async () => {
  const user = await requireUser()
  const admin = getSupabaseAdminClient()
  const { data: current, error } = await admin.from('subscriptions')
    .select('id,status,current_period_end,cancel_at,creem_subscription_id,payment_provider,waffo_order_id,waffo_environment')
    .eq('user_id', user.id)
    .in('status', ['active','trialing','scheduled_cancel','unpaid'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!current) throw new Error('NO_ACTIVE_SUBSCRIPTION')
  if (current.payment_provider === 'waffo') {
    const { waffoEnvironment } = await import('@/server/waffo')
    if (current.waffo_environment !== waffoEnvironment()) throw new Error('WAFFO_SUBSCRIPTION_ENVIRONMENT_MISMATCH')
    if (!current.waffo_order_id) throw new Error('NO_ACTIVE_SUBSCRIPTION')
    const result = await waffoClient().orders.cancelSubscription({ orderId: current.waffo_order_id })
    const { error: updateError } = await admin.from('subscriptions').update({
      status: result.status === 'canceled' ? 'canceled' : 'scheduled_cancel',
      cancel_at: current.current_period_end, updated_at: new Date().toISOString(),
    }).eq('id', current.id)
    if (updateError) throw new Error(updateError.message)
    return { ok: true, cancelAt: current.current_period_end }
  }
  if (!current.creem_subscription_id) throw new Error('NO_ACTIVE_SUBSCRIPTION')
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
    .select('id,creem_subscription_id,payment_provider')
    .eq('user_id', user.id)
    .eq('status', 'scheduled_cancel')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (current?.payment_provider === 'waffo') throw new Error('Manage renewal in your Waffo customer portal or contact support.')
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
