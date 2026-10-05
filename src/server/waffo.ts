import { WaffoPancake, ChangeTiming } from '@waffo/pancake-ts'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { paymentProductId } from '@/config/payments'
import type { CheckoutInput } from './billing'

export function waffoEnvironment(): 'test' | 'prod' {
  const environment = process.env.WAFFO_ENVIRONMENT?.trim() || 'test'
  if (environment !== 'test' && environment !== 'prod') throw new Error('INVALID_WAFFO_ENVIRONMENT')
  return environment
}

export function waffoStoreId() {
  const storeId = process.env.WAFFO_STORE_ID?.trim()
  if (!storeId) throw new Error('WAFFO_STORE_NOT_CONFIGURED')
  return storeId
}

export function waffoClient() {
  const merchantId = process.env.WAFFO_MERCHANT_ID?.trim()
  const privateKey = process.env.WAFFO_PRIVATE_KEY_BASE64
    ? Buffer.from(process.env.WAFFO_PRIVATE_KEY_BASE64, 'base64').toString('utf8')
    : process.env.WAFFO_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!merchantId || !privateKey) throw new Error('WAFFO_NOT_CONFIGURED')
  return new WaffoPancake({ merchantId, privateKey, environment: waffoEnvironment() })
}

export async function createWaffoCheckout(params: {
  user: { id: string; email?: string }
  input: CheckoutInput
  successUrl: string
  originOrderId?: string
  immediate?: boolean
}) {
  const productId = paymentProductId('waffo', params.input)
  if (!productId) throw new Error('WAFFO_PRODUCT_NOT_CONFIGURED')
  const client = waffoClient()
  const admin = getSupabaseAdminClient()
  const intentId = crypto.randomUUID()
  // Persist ownership before returning a payment link. Webhooks never match users by email.
  const { error } = await admin.from('waffo_checkout_intents').insert({
    id: intentId, user_id: params.user.id, product_id: productId,
    purchase_type: params.input.type,
    pack_id: params.input.type === 'credit_pack' ? params.input.key : null,
    plan_code: params.input.type === 'subscription' ? params.input.plan : null,
    billing_cycle: params.input.type === 'subscription' ? params.input.cycle : null,
    store_id: waffoStoreId(), environment: waffoEnvironment(),
  })
  if (error) throw new Error(error.message)
  const common = {
    productId, currency: 'USD', successUrl: params.successUrl,
    metadata: { checkoutIntentId: intentId, userId: params.user.id, source: 'hotel-lobby-ai' },
    orderMerchantExternalId: intentId,
    withTrial: false,
  }
  const session = params.originOrderId
    ? await client.checkout.createPlanChangeSession({
      ...common, originOrderId: params.originOrderId,
      changeTiming: params.immediate ? ChangeTiming.Immediate : ChangeTiming.NextPeriod,
    }, { idempotencyKey: intentId })
    : await client.checkout.authenticated.create({ ...common, buyerIdentity: params.user.id, buyerEmail: params.user.email }, { idempotencyKey: intentId })
  const { error: updateError } = await admin.from('waffo_checkout_intents')
    .update({ session_id: session.sessionId }).eq('id', intentId)
  if (updateError) throw new Error(updateError.message)
  return { checkoutUrl: session.checkoutUrl, checkoutId: session.sessionId, provider: 'waffo' as const }
}
