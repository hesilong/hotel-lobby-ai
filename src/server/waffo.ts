import { WaffoPancake, ChangeTiming } from '@waffo/pancake-ts'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { generationProductId, paymentProductId } from '@/config/payments'
import type { GenerationResolution } from '@/config/generation'
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


export async function createWaffoGenerationCheckout(params: {
  user: { id: string; email?: string }
  generationOrderId: string
  resolution: GenerationResolution
  successUrl: string
}) {
  const productId = generationProductId('waffo', params.resolution)
  if (!productId) throw new Error('WAFFO_GENERATION_PRODUCT_NOT_CONFIGURED')

  const client = waffoClient()
  const admin = getSupabaseAdminClient()
  const intentId = crypto.randomUUID()

  const { error } = await admin.from('waffo_checkout_intents').insert({
    id: intentId,
    user_id: params.user.id,
    product_id: productId,
    purchase_type: 'generation',
    generation_order_id: params.generationOrderId,
    store_id: waffoStoreId(),
    environment: waffoEnvironment(),
  })
  if (error) throw new Error(error.message)

  const session = await client.checkout.authenticated.create({
    productId,
    currency: 'USD',
    successUrl: params.successUrl,
    metadata: {
      checkoutIntentId: intentId,
      userId: params.user.id,
      generationOrderId: params.generationOrderId,
      purchaseType: 'generation',
      resolution: params.resolution,
      source: 'hotel-lobby-ai',
    },
    orderMerchantExternalId: params.generationOrderId,
    buyerIdentity: params.user.id,
    buyerEmail: params.user.email,
    withTrial: false,
  }, { idempotencyKey: intentId })

  const { error: updateError } = await admin.from('waffo_checkout_intents')
    .update({ session_id: session.sessionId })
    .eq('id', intentId)
  if (updateError) throw new Error(updateError.message)

  return {
    checkoutUrl: session.checkoutUrl,
    checkoutId: session.sessionId,
    provider: 'waffo' as const,
    productId,
  }
}

export async function requestWaffoGenerationRefund(params: {
  userId: string
  generationOrderId: string
  paymentId: string
  amount: string
  currency: 'USD'
}) {
  const client = waffoClient()
  const session = await client.auth.issueSessionToken({
    storeId: waffoStoreId(),
    buyerIdentity: params.userId,
  })

  const customer = client.customer(session.token)
  const result = await customer.createRefundTicket({
    paymentId: params.paymentId,
    reason: 'Generation failed and the customer requested a refund.',
    requestedAmount: {
      amount: params.amount,
      currency: params.currency,
    },
    metadata: {
      generationOrderId: params.generationOrderId,
      source: 'hotel-lobby-ai',
    },
    refundTicketMerchantExternalId: `generation-${params.generationOrderId}`,
  }, {
    idempotencyKey: `refund-${params.generationOrderId}`,
  })

  return {
    ticketId: result.ticket.id,
    status: result.ticket.status,
  }
}
