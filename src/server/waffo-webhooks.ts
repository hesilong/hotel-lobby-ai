import type { WebhookEvent } from '@waffo/pancake-ts'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { CREDIT_PACKS } from '@/config/products'
import { waffoPlan } from '@/config/payments'
import { waffoClient, waffoEnvironment, waffoStoreId } from './waffo'

export function validateWaffoEnvelope(event: WebhookEvent) {
  if (event.mode !== waffoEnvironment() || event.storeId !== waffoStoreId()) throw new Error('WAFFO_WEBHOOK_SCOPE_MISMATCH')
  if (!event.id || !event.eventId || !event.data?.orderId || !Number.isFinite(Date.parse(event.timestamp))) throw new Error('INVALID_WAFFO_EVENT')
}

const statusByEvent: Record<string, string> = {
  'subscription.activated': 'active',
  'subscription.canceling': 'scheduled_cancel',
  'subscription.uncanceled': 'active',
  'subscription.canceled': 'canceled',
  'subscription.past_due': 'unpaid',
  'subscription.plan_changed': 'active',
}

export async function processWaffoEvent(event: WebhookEvent) {
  validateWaffoEnvelope(event)
  const admin = getSupabaseAdminClient()
  const data = event.data
  const subscriptionEvent = event.eventType in statusByEvent || event.eventType === 'subscription.payment_succeeded'
  if (!subscriptionEvent && !['order.completed', 'refund.succeeded'].includes(event.eventType)) {
    const { error } = await admin.from('waffo_webhook_events').update({ status: 'ignored', processed_at: new Date().toISOString() }).eq('delivery_id', event.id)
    if (error) throw new Error(error.message)
    return
  }
  const { data: subscription, error: subError } = await admin.from('subscriptions').select('*')
    .eq('waffo_order_id', data.orderId).eq('waffo_environment', event.mode).maybeSingle()
  if (subError) throw new Error(subError.message)
  const intentId = data.orderMetadata?.checkoutIntentId || data.orderMerchantExternalId
  const { data: intent, error: intentError } = intentId
    ? await admin.from('waffo_checkout_intents').select('*').eq('id', intentId)
      .eq('environment', event.mode).eq('store_id', event.storeId).maybeSingle()
    : { data: null, error: null }
  if (intentError) throw new Error(intentError.message)
  const userId = subscription?.user_id || intent?.user_id
  if (!userId) throw new Error('WAFFO_ORDER_OWNER_NOT_FOUND')
  if ((intent && intent.user_id !== userId) || (data.merchantProvidedBuyerIdentity && data.merchantProvidedBuyerIdentity !== userId)) throw new Error('WAFFO_ORDER_OWNER_MISMATCH')

  let productId = intent?.product_id || subscription?.plan_id
  let periodStart = data.currentPeriodStart || subscription?.current_period_start
  let periodEnd = data.currentPeriodEnd || subscription?.current_period_end
  // Subscription lifecycle payloads do not include a reliable product ID. Read the
  // signed merchant API snapshot, especially when the buyer switches products.
  if (subscriptionEvent) {
    const result = await waffoClient().graphql.query<{
      subscriptionOrder: { subscriptionProduct: { id: string }; currentPeriodStart: string; currentPeriodEnd: string } | null
    }>({
      query: 'query ($id: String!) { subscriptionOrder(id: $id) { subscriptionProduct { id } currentPeriodStart currentPeriodEnd } }',
      variables: { id: data.orderId },
    })
    if (result.errors?.length || !result.data?.subscriptionOrder) throw new Error('WAFFO_SUBSCRIPTION_LOOKUP_FAILED')
    const snapshot = result.data.subscriptionOrder
    productId = snapshot.subscriptionProduct.id
    periodStart = data.currentPeriodStart || snapshot.currentPeriodStart
    periodEnd = data.currentPeriodEnd || snapshot.currentPeriodEnd
  }
  const plan = productId ? waffoPlan(productId) : null
  const pack = intent?.purchase_type === 'credit_pack' ? CREDIT_PACKS[intent.pack_id as keyof typeof CREDIT_PACKS] : null
  const grant = ['order.completed', 'subscription.activated', 'subscription.payment_succeeded', 'subscription.plan_changed'].includes(event.eventType)
  if (subscriptionEvent && !plan) throw new Error('WAFFO_UNKNOWN_SUBSCRIPTION_PRODUCT')
  if (event.eventType === 'order.completed') {
    if (!pack || !intent || data.currency !== 'USD') throw new Error('WAFFO_INVALID_PACK_ORDER')
    const paid = Number(data.chargedAmount ?? data.amount)
    if (!Number.isFinite(paid) || paid + 0.001 < pack.priceUsd) throw new Error('WAFFO_PAYMENT_AMOUNT_MISMATCH')
  }
  if (subscriptionEvent && grant && (!periodStart || !periodEnd || !Number.isFinite(Date.parse(periodStart)) || !Number.isFinite(Date.parse(periodEnd)))) throw new Error('WAFFO_BILLING_PERIOD_MISSING')

  const { error } = await admin.rpc('apply_waffo_event', { p_event: {
    delivery_id: event.id, business_id: event.eventId, event_type: event.eventType,
    event_at: event.timestamp, environment: event.mode, order_id: data.orderId,
    user_id: userId, product_id: productId,
    plan_code: plan?.plan || subscription?.plan_code || null,
    billing_cycle: plan?.cycle || subscription?.billing_cycle || null,
    pack_id: pack?.key || null, credits: grant ? plan?.definition.monthlyCredits || pack?.credits || 0 : 0,
    period_start: periodStart || null, period_end: periodEnd || null,
    status: statusByEvent[event.eventType] || null,
    // Activation and first payment can have distinct delivery/business IDs.
    grant_key: plan ? `waffo:${event.mode}:${data.orderId}:${periodStart}:${productId}` : `waffo:${event.mode}:${data.orderId}`,
    refunded_amount: data.refundedAmount || data.amount || null,
    original_amount: data.originalChargedAmount || null,
  } })
  if (error) throw new Error(error.message)
}

export async function retryWaffoEvents() {
  const admin = getSupabaseAdminClient()
  const { data, error } = await admin.from('waffo_webhook_events').select('delivery_id,payload,attempts')
    .in('status', ['pending','failed']).eq('environment', waffoEnvironment())
    .lte('next_attempt_at', new Date().toISOString())
    .order('created_at').limit(5)
  if (error) throw new Error(error.message)
  for (const row of data || []) {
    try {
      await processWaffoEvent(row.payload as WebhookEvent)
    } catch {
      const attempts = Number(row.attempts || 0) + 1
      const { error: updateError } = await admin.from('waffo_webhook_events').update({
        status: 'failed', error: 'PROCESSING_FAILED', attempts,
        next_attempt_at: new Date(Date.now() + Math.min(1800, 2 ** Math.min(attempts, 10)) * 1000).toISOString(),
      }).eq('delivery_id', row.delivery_id).neq('status', 'processed')
      if (updateError) console.error('[Waffo] inbox status update failed', row.delivery_id)
      console.error('[Waffo] event processing failed; retained for retry', row.delivery_id)
    }
  }
}
