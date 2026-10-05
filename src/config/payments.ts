import { CREDIT_PACKS, PLANS, type BillingCycle, type CreditPackKey } from './products'

export type PaymentProvider = 'creem' | 'waffo'

export function paymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER?.trim() || 'creem'
  if (provider !== 'creem' && provider !== 'waffo') throw new Error('INVALID_PAYMENT_PROVIDER')
  return provider
}

export function paymentProductId(provider: PaymentProvider, input:
  | { type: 'credit_pack'; key: CreditPackKey }
  | { type: 'subscription'; plan: 'pro' | 'ultimate'; cycle: BillingCycle },
) {
  if (provider === 'creem') return input.type === 'credit_pack'
    ? CREDIT_PACKS[input.key]?.productId || ''
    : input.cycle === 'monthly' ? PLANS[input.plan]?.monthlyProductId || '' : PLANS[input.plan]?.yearlyProductId || ''
  const name = input.type === 'credit_pack'
    ? `WAFFO_CREDIT_PACK_${input.key.toUpperCase()}_PRODUCT_ID`
    : `WAFFO_${input.plan.toUpperCase()}_${input.cycle.toUpperCase()}_PRODUCT_ID`
  return process.env[name]?.trim() || ''
}

export function waffoPlan(productId: string) {
  for (const plan of ['pro', 'ultimate'] as const) {
    for (const cycle of ['monthly', 'yearly'] as const) {
      if (paymentProductId('waffo', { type: 'subscription', plan, cycle }) === productId) {
        return { plan, cycle, definition: PLANS[plan] }
      }
    }
  }
  return null
}
