// Run with Node 22+; loads only the explicitly selected env file.
// Creates TEST products in the supplied store. Never publishes automatically.
import { WaffoPancake, BillingPeriod, TaxCategory } from '@waffo/pancake-ts'
import { PLANS, CREDIT_PACKS } from '../src/config/products.ts'
import { readFile, writeFile, mkdir } from 'node:fs/promises'

const privateKey = process.env.WAFFO_PRIVATE_KEY_BASE64
  ? Buffer.from(process.env.WAFFO_PRIVATE_KEY_BASE64, 'base64').toString('utf8')
  : process.env.WAFFO_PRIVATE_KEY?.replace(/\\n/g, '\n')
if (!privateKey || !process.env.WAFFO_MERCHANT_ID || !process.env.WAFFO_STORE_ID) {
  throw new Error('Set WAFFO_MERCHANT_ID, WAFFO_STORE_ID and WAFFO_PRIVATE_KEY in your private env file first.')
}
if (process.env.WAFFO_ENVIRONMENT !== 'test') throw new Error('This setup script creates test products only.')
const client = new WaffoPancake({ merchantId: process.env.WAFFO_MERCHANT_ID, privateKey, environment: 'test' })
const storeId = process.env.WAFFO_STORE_ID
const cachePath = '.waffo/products-test.json'
await mkdir('.waffo', { recursive: true })
let cache: { storeId: string; products: Record<string, string>; groupId?: string; webhookId?: string }
try { cache = JSON.parse(await readFile(cachePath, 'utf8')) } catch { cache = { storeId, products: {} } }
if (cache.storeId !== storeId) throw new Error('Cached products belong to another store.')
const save = () => writeFile(cachePath, JSON.stringify(cache, null, 2))
for (const plan of Object.values(PLANS)) {
  for (const cycle of ['monthly', 'yearly'] as const) {
    const key = `WAFFO_${plan.code.toUpperCase()}_${cycle.toUpperCase()}_PRODUCT_ID`
    if (process.env[key]) cache.products[key] = process.env[key]!
    if (!cache.products[key]) {
      const { product } = await client.subscriptionProducts.create({
        storeId, name: `Hotel Lobby AI ${plan.name} ${cycle}`, billingPeriod: cycle === 'monthly' ? BillingPeriod.Monthly : BillingPeriod.Yearly,
        prices: { USD: { amount: (cycle === 'monthly' ? plan.monthlyPriceUsd : plan.yearlyPriceUsd).toFixed(2), taxCategory: TaxCategory.SaaS } },
      }, { idempotencyKey: `hotel-lobby-test-${storeId}-${plan.code}-${cycle}` })
      cache.products[key] = product.id
      await save()
    }
  }
}
for (const pack of Object.values(CREDIT_PACKS)) {
  const key = `WAFFO_CREDIT_PACK_${pack.key.toUpperCase()}_PRODUCT_ID`
  if (process.env[key]) cache.products[key] = process.env[key]!
  if (!cache.products[key]) {
    const { product } = await client.onetimeProducts.create({ storeId, name: `Hotel Lobby AI ${pack.name}`,
      prices: { USD: { amount: pack.priceUsd.toFixed(2), taxCategory: TaxCategory.SaaS } },
    }, { idempotencyKey: `hotel-lobby-test-${storeId}-${pack.key}` })
    cache.products[key] = product.id
    await save()
  }
}
if (!cache.groupId) {
  const { group } = await client.subscriptionProductGroups.create({ storeId, name: 'Hotel Lobby AI Plans',
    productIds: Object.entries(cache.products).filter(([key]) => !key.includes('CREDIT_PACK')).map(([,id]) => id),
    rules: { sharedTrial: false, selfServicePlanChange: true },
  }, { idempotencyKey: `hotel-lobby-test-${storeId}-plans` })
  cache.groupId = group.id
  await save()
}
if (process.env.WAFFO_WEBHOOK_URL && !cache.webhookId) {
  const { webhook } = await client.webhooks.add({ storeId, channel: 'http', url: process.env.WAFFO_WEBHOOK_URL,
    testMode: true, events: ['order.completed', 'subscription.activated', 'subscription.payment_succeeded',
      'subscription.canceling', 'subscription.uncanceled', 'subscription.canceled', 'subscription.past_due',
      'subscription.plan_changed', 'refund.succeeded'],
  }, { idempotencyKey: `hotel-lobby-test-${storeId}-webhook` })
  cache.webhookId = webhook.id
  await save()
}
console.log(Object.entries(cache.products).map(([key,id]) => `${key}=${id}`).join('\n'))
