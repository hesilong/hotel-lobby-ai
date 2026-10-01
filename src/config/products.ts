export type PlanCode = 'free' | 'pro' | 'ultimate'
export type BillingCycle = 'monthly' | 'yearly'
export type CreditPackKey = 'starter' | 'creator' | 'studio'

type PlanDefinition = {
  code: Exclude<PlanCode, 'free'>
  name: string
  monthlyPriceUsd: number
  yearlyPriceUsd: number
  monthlyCredits: number
  monthlyProductId: string
  yearlyProductId: string
}

export type CreditPackDefinition = {
  key: CreditPackKey
  name: string
  credits: number
  priceUsd: number
  productId: string
}

const env = (name: string, fallback = '') => process.env[name]?.trim() || fallback

export const PLANS: Record<'pro' | 'ultimate', PlanDefinition> = {
  pro: {
    code: 'pro',
    name: 'Pro',
    monthlyPriceUsd: 9.9,
    yearlyPriceUsd: 94.8,
    monthlyCredits: 1000,
    monthlyProductId: env('CREEM_PRO_MONTHLY_PRODUCT_ID'),
    yearlyProductId: env('CREEM_PRO_YEARLY_PRODUCT_ID'),
  },
  ultimate: {
    code: 'ultimate',
    name: 'Ultimate',
    monthlyPriceUsd: 49.9,
    yearlyPriceUsd: 478.8,
    monthlyCredits: 5000,
    monthlyProductId: env('CREEM_ULTIMATE_MONTHLY_PRODUCT_ID'),
    yearlyProductId: env('CREEM_ULTIMATE_YEARLY_PRODUCT_ID'),
  },
}

export const CREDIT_PACKS: Record<CreditPackKey, CreditPackDefinition> = {
  starter: {
    key: 'starter',
    name: 'Starter Pack',
    credits: 250,
    priceUsd: 4.99,
    productId: env('CREEM_CREDIT_PACK_STARTER_PRODUCT_ID'),
  },
  creator: {
    key: 'creator',
    name: 'Creator Pack',
    credits: 1500,
    priceUsd: 19.99,
    productId: env('CREEM_CREDIT_PACK_CREATOR_PRODUCT_ID'),
  },
  studio: {
    key: 'studio',
    name: 'Studio Pack',
    credits: 4000,
    priceUsd: 49.99,
    productId: env('CREEM_CREDIT_PACK_STUDIO_PRODUCT_ID'),
  },
}

export const planProductId = (plan: 'pro' | 'ultimate', cycle: BillingCycle) =>
  cycle === 'monthly' ? PLANS[plan].monthlyProductId : PLANS[plan].yearlyProductId

export const findPlanByProductId = (productId?: string | null) => {
  if (!productId) return null
  for (const plan of Object.values(PLANS)) {
    if (plan.monthlyProductId === productId) return { plan: plan.code, cycle: 'monthly' as const, definition: plan }
    if (plan.yearlyProductId === productId) return { plan: plan.code, cycle: 'yearly' as const, definition: plan }
  }
  return null
}

export const findCreditPackByProductId = (productId?: string | null) => {
  if (!productId) return null
  return Object.values(CREDIT_PACKS).find(pack => pack.productId === productId) || null
}

export const publicPricingCatalog = () => ({
  plans: {
    pro: {
      name: PLANS.pro.name,
      monthlyPriceUsd: PLANS.pro.monthlyPriceUsd,
      yearlyPriceUsd: PLANS.pro.yearlyPriceUsd,
      yearlyMonthlyEquivalentUsd: PLANS.pro.yearlyPriceUsd / 12,
      monthlyCredits: PLANS.pro.monthlyCredits,
    },
    ultimate: {
      name: PLANS.ultimate.name,
      monthlyPriceUsd: PLANS.ultimate.monthlyPriceUsd,
      yearlyPriceUsd: PLANS.ultimate.yearlyPriceUsd,
      yearlyMonthlyEquivalentUsd: PLANS.ultimate.yearlyPriceUsd / 12,
      monthlyCredits: PLANS.ultimate.monthlyCredits,
    },
  },
  creditPacks: Object.fromEntries(
    Object.entries(CREDIT_PACKS).map(([key, pack]) => [key, {
      name: pack.name,
      credits: pack.credits,
      priceUsd: pack.priceUsd,
    }]),
  ),
})
