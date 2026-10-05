import type { SupabaseClient } from '@supabase/supabase-js'
import { PLANS } from '@/config/products'

type AdminClient = SupabaseClient<any, any, any>

export class InsufficientCreditsError extends Error {
  constructor() {
    super('INSUFFICIENT_CREDITS')
    this.name = 'InsufficientCreditsError'
  }
}

export type CreditDebit = {
  amount: number
  balance: number
  ledgerId?: string | null
}

export async function getCreditBalance(admin: AdminClient, userId: string): Promise<number> {
  const { data, error } = await admin.from('profiles').select('credits').eq('id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  return Number(data?.credits || 0)
}

export async function adjustCredits(params: {
  admin: AdminClient
  userId: string
  delta: number
  reason: string
  taskId?: string | null
  meta?: Record<string, unknown>
}): Promise<CreditDebit> {
  const { data, error } = await params.admin.rpc('adjust_credits', {
    p_user_id: params.userId,
    p_delta: params.delta,
    p_reason: params.reason,
    p_task_id: params.taskId || null,
    p_meta: params.meta || {},
  })
  if (error) {
    if ((error.message || '').includes('INSUFFICIENT_CREDITS')) throw new InsufficientCreditsError()
    throw new Error(error.message)
  }
  const row = Array.isArray(data) ? data[0] : data
  return {
    amount: Math.abs(params.delta),
    balance: Number(row?.balance || 0),
    ledgerId: row?.ledger_id || null,
  }
}

export async function deductCredits(params: {
  admin: AdminClient
  userId: string
  amount: number
  taskId?: string | null
  meta?: Record<string, unknown>
}) {
  const amount = Math.abs(Math.round(params.amount))
  const balance = await getCreditBalance(params.admin, params.userId)
  if (balance < amount) throw new InsufficientCreditsError()

  const { data: grants, error: grantsError } = await params.admin
    .from('credit_grants')
    .select('id,credits_remaining,expires_at')
    .eq('user_id', params.userId)
    .eq('status', 'active')
    .gt('credits_remaining', 0)
    .order('expires_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
  if (grantsError) throw new Error(grantsError.message)

  let remaining = amount
  const grantDebits: Array<{ grant_id: string; amount: number }> = []
  for (const grant of grants || []) {
    if (remaining <= 0) break
    const current = Number(grant.credits_remaining || 0)
    if (current <= 0) continue
    const used = Math.min(current, remaining)
    grantDebits.push({ grant_id: grant.id, amount: used })
    remaining -= used
  }

  const debit = await adjustCredits({
    admin: params.admin,
    userId: params.userId,
    delta: -amount,
    reason: 'generation',
    taskId: params.taskId,
    meta: { ...(params.meta || {}), grant_debits: grantDebits },
  })

  try {
    for (const grantDebit of grantDebits) {
      const grant = (grants || []).find(item => item.id === grantDebit.grant_id)
      const current = Number(grant?.credits_remaining || 0)
      const { error } = await params.admin.from('credit_grants').update({
        credits_remaining: Math.max(0, current - grantDebit.amount),
        updated_at: new Date().toISOString(),
      }).eq('id', grantDebit.grant_id).eq('user_id', params.userId)
      if (error) throw new Error(error.message)
    }
  } catch (error) {
    // Keep monetary balance correct even if grant attribution fails; ledger records the intended debits.
    console.error('[credits] failed to update grant attribution', error)
  }

  return debit
}

export async function refundCredits(params: {
  admin: AdminClient
  userId: string
  amount: number
  taskId: string
  meta?: Record<string, unknown>
}) {
  const { data: existing, error } = await params.admin
    .from('credit_ledger')
    .select('id')
    .eq('user_id', params.userId)
    .eq('task_id', params.taskId)
    .eq('reason', 'generation_refund')
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (existing) return { duplicate: true, balance: await getCreditBalance(params.admin, params.userId) }

  const { data: original, error: originalError } = await params.admin
    .from('credit_ledger')
    .select('meta')
    .eq('user_id', params.userId)
    .eq('task_id', params.taskId)
    .eq('reason', 'generation')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (originalError) throw new Error(originalError.message)

  const result = await adjustCredits({
    admin: params.admin,
    userId: params.userId,
    delta: Math.abs(params.amount),
    reason: 'generation_refund',
    taskId: params.taskId,
    meta: params.meta,
  })

  const rawDebits = Array.isArray((original?.meta as any)?.grant_debits)
    ? (original!.meta as any).grant_debits as Array<{ grant_id?: unknown; amount?: unknown }>
    : []
  for (const debit of rawDebits) {
    if (typeof debit.grant_id !== 'string') continue
    const amount = Number(debit.amount || 0)
    if (amount <= 0) continue
    const { data: grant } = await params.admin.from('credit_grants')
      .select('credits_remaining,credits_total,status')
      .eq('id', debit.grant_id)
      .eq('user_id', params.userId)
      .maybeSingle()
    if (!grant || grant.status !== 'active') continue
    await params.admin.from('credit_grants').update({
      credits_remaining: Math.min(Number(grant.credits_total || 0), Number(grant.credits_remaining || 0) + amount),
      updated_at: new Date().toISOString(),
    }).eq('id', debit.grant_id).eq('user_id', params.userId)
  }

  return { duplicate: false, ...result }
}

export async function grantPurchasedCredits(params: {
  admin: AdminClient
  userId: string
  productId: string
  packId: string
  credits: number
  checkoutId: string
  eventId?: string | null
}) {
  const { data: existing, error } = await params.admin
    .from('credit_grants')
    .select('id')
    .eq('checkout_id', params.checkoutId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (existing) return { duplicate: true }

  const expiresAt = new Date(Date.now() + 180 * 86400_000).toISOString()
  const { error: grantError } = await params.admin.from('credit_grants').insert({
    user_id: params.userId,
    source: 'credit_pack',
    status: 'active',
    product_id: params.productId,
    pack_id: params.packId,
    checkout_id: params.checkoutId,
    credits_total: params.credits,
    credits_remaining: params.credits,
    expires_at: expiresAt,
    meta: { event_id: params.eventId || null },
  })
  if (grantError) {
    if (grantError.code === '23505') return { duplicate: true }
    throw new Error(grantError.message)
  }

  await adjustCredits({
    admin: params.admin,
    userId: params.userId,
    delta: params.credits,
    reason: 'purchase',
    meta: {
      purchase_type: 'credit_pack',
      checkout_id: params.checkoutId,
      product_id: params.productId,
      pack_id: params.packId,
      expires_at: expiresAt,
    },
  })
  return { duplicate: false, credits: params.credits }
}

export async function grantSubscriptionCredits(params: {
  admin: AdminClient
  userId: string
  productId: string
  planCode: string
  credits: number
  eventId: string
  periodEnd?: string | null
}) {
  const { data: existing, error } = await params.admin
    .from('credit_grants')
    .select('id')
    .eq('checkout_id', params.eventId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (existing) return { duplicate: true }

  // Subscription credits reset each billing month instead of accumulating forever.
  const { data: previousGrants, error: previousError } = await params.admin
    .from('credit_grants')
    .select('id,credits_remaining')
    .eq('user_id', params.userId)
    .eq('source', 'subscription')
    .eq('status', 'active')
    .gt('credits_remaining', 0)
  if (previousError) throw new Error(previousError.message)

  const unused = (previousGrants || []).reduce((sum, grant) => sum + Number(grant.credits_remaining || 0), 0)
  if (unused > 0) {
    const currentBalance = await getCreditBalance(params.admin, params.userId)
    const removable = Math.min(currentBalance, unused)
    if (removable > 0) {
      await adjustCredits({
        admin: params.admin,
        userId: params.userId,
        delta: -removable,
        reason: 'subscription_reset',
        meta: { replaced_by_event_id: params.eventId },
      })
    }
    for (const grant of previousGrants || []) {
      await params.admin.from('credit_grants').update({
        status: 'expired',
        credits_remaining: 0,
        updated_at: new Date().toISOString(),
      }).eq('id', grant.id)
    }
  }

  const { error: grantError } = await params.admin.from('credit_grants').insert({
    user_id: params.userId,
    source: 'subscription',
    status: 'active',
    product_id: params.productId,
    pack_id: params.planCode,
    checkout_id: params.eventId,
    credits_total: params.credits,
    credits_remaining: params.credits,
    expires_at: params.periodEnd || null,
    meta: { event_id: params.eventId },
  })
  if (grantError) {
    if (grantError.code === '23505') return { duplicate: true }
    throw new Error(grantError.message)
  }

  await adjustCredits({
    admin: params.admin,
    userId: params.userId,
    delta: params.credits,
    reason: 'subscription_grant',
    meta: {
      event_id: params.eventId,
      product_id: params.productId,
      plan_code: params.planCode,
      period_end: params.periodEnd || null,
    },
  })
  return { duplicate: false, credits: params.credits }
}

const addMonth = (value: Date) => {
  const next = new Date(value)
  next.setUTCMonth(next.getUTCMonth() + 1)
  return next
}

export async function reconcileYearlySubscriptionCredits(admin: AdminClient, userId: string) {
  const { data: subscription, error } = await admin.from('subscriptions')
    .select('id,plan_code,billing_cycle,plan_id,status,current_period_end,next_credit_reset_at,payment_provider,waffo_order_id,waffo_environment')
    .eq('user_id', userId)
    .in('status', ['active','trialing','scheduled_cancel'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!subscription || subscription.billing_cycle !== 'yearly') return

  const planCode = subscription.plan_code === 'ultimate' ? 'ultimate' : 'pro'
  const plan = PLANS[planCode]
  const now = new Date()
  const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : null
  if (periodEnd && periodEnd <= now) return

  const resetAt = subscription.next_credit_reset_at
    ? new Date(subscription.next_credit_reset_at)
    : addMonth(now)
  if (resetAt > now) {
    if (!subscription.next_credit_reset_at) {
      await admin.from('subscriptions').update({
        next_credit_reset_at: resetAt.toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', subscription.id)
    }
    return
  }

  const periodKey = resetAt.toISOString().slice(0, 7)
  if (subscription.payment_provider === 'waffo') {
    let nextReset = addMonth(resetAt)
    while (nextReset <= now) nextReset = addMonth(nextReset)
    const { error: resetError } = await admin.rpc('apply_waffo_event', { p_event: {
      user_id: userId, environment: subscription.waffo_environment, order_id: subscription.waffo_order_id,
      event_type: 'yearly.reset', business_id: `${subscription.id}:${periodKey}`, event_at: now.toISOString(),
      product_id: subscription.plan_id, plan_code: planCode, billing_cycle: 'yearly',
      credits: plan.monthlyCredits, period_start: resetAt.toISOString(), period_end: nextReset.toISOString(),
      grant_key: `waffo:yearly-reset:${subscription.id}:${periodKey}`,
    } })
    if (resetError) throw new Error(resetError.message)
    return
  }
  await grantSubscriptionCredits({
    admin,
    userId,
    productId: subscription.plan_id,
    planCode,
    credits: plan.monthlyCredits,
    eventId: `yearly-reset:${subscription.id}:${periodKey}`,
    periodEnd: addMonth(resetAt).toISOString(),
  })

  let nextReset = addMonth(resetAt)
  while (nextReset <= now) nextReset = addMonth(nextReset)
  await admin.from('subscriptions').update({
    next_credit_reset_at: nextReset.toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', subscription.id)
}

export async function revokeUnusedCreditPack(params: {
  admin: AdminClient
  checkoutId?: string | null
  productId?: string | null
}) {
  let query = params.admin
    .from('credit_grants')
    .select('id,user_id,status,credits_total,credits_remaining,checkout_id,product_id,meta')
    .eq('source', 'credit_pack')
    .order('created_at', { ascending: false })
    .limit(1)

  if (params.checkoutId) query = query.eq('checkout_id', params.checkoutId)
  else if (params.productId) query = query.eq('product_id', params.productId)
  else return { handled: false, reason: 'missing_lookup' }

  const { data: grant, error } = await query.maybeSingle()
  if (error) throw new Error(error.message)
  if (!grant) return { handled: false, reason: 'grant_not_found' }
  if (grant.status === 'refunded') return { handled: true, duplicate: true }

  const total = Number(grant.credits_total || 0)
  const remaining = Number(grant.credits_remaining || 0)
  if (remaining < total) {
    await params.admin.from('credit_grants').update({
      status: 'refund_review_required',
      meta: { ...(grant.meta || {}), refund_review_reason: 'credits_already_used' },
      updated_at: new Date().toISOString(),
    }).eq('id', grant.id)
    return { handled: true, reviewRequired: true }
  }

  const balance = await getCreditBalance(params.admin, grant.user_id)
  if (balance < remaining) {
    await params.admin.from('credit_grants').update({
      status: 'refund_review_required',
      meta: { ...(grant.meta || {}), refund_review_reason: 'insufficient_balance' },
      updated_at: new Date().toISOString(),
    }).eq('id', grant.id)
    return { handled: true, reviewRequired: true }
  }

  if (remaining > 0) {
    await adjustCredits({
      admin: params.admin,
      userId: grant.user_id,
      delta: -remaining,
      reason: 'credit_pack_refunded',
      meta: { checkout_id: grant.checkout_id, product_id: grant.product_id, grant_id: grant.id },
    })
  }

  await params.admin.from('credit_grants').update({
    status: 'refunded',
    credits_remaining: 0,
    updated_at: new Date().toISOString(),
  }).eq('id', grant.id)

  return { handled: true, refundedCredits: remaining }
}


export async function revokeSubscriptionCredits(params: {
  admin: AdminClient
  userId: string
  reason?: string
}) {
  const { data: grants, error } = await params.admin
    .from('credit_grants')
    .select('id,credits_remaining')
    .eq('user_id', params.userId)
    .eq('source', 'subscription')
    .not('checkout_id', 'like', 'waffo:%')
    .eq('status', 'active')
    .gt('credits_remaining', 0)
  if (error) throw new Error(error.message)

  const remaining = (grants || []).reduce((sum, grant) => sum + Number(grant.credits_remaining || 0), 0)
  if (remaining > 0) {
    const balance = await getCreditBalance(params.admin, params.userId)
    const removable = Math.min(balance, remaining)
    if (removable > 0) {
      await adjustCredits({
        admin: params.admin,
        userId: params.userId,
        delta: -removable,
        reason: params.reason || 'subscription_revoked',
        meta: { revoked_credits: removable },
      })
    }
  }

  for (const grant of grants || []) {
    await params.admin.from('credit_grants').update({
      status: 'revoked',
      credits_remaining: 0,
      updated_at: new Date().toISOString(),
    }).eq('id', grant.id)
  }

  return { revokedCredits: remaining }
}
