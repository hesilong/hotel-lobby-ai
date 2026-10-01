import type { SupabaseClient } from '@supabase/supabase-js'


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
