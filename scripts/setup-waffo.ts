// Run with Node 22+; loads only the explicitly selected env file.
// Creates TEST generation products in the supplied Waffo store.
// Never publishes products automatically.
import { WaffoPancake, TaxCategory } from '@waffo/pancake-ts'
import { GENERATION_PURCHASE_OPTIONS } from '../src/config/generation-purchase.ts'
import { readFile, writeFile, mkdir } from 'node:fs/promises'

const privateKey = process.env.WAFFO_PRIVATE_KEY_BASE64
  ? Buffer.from(process.env.WAFFO_PRIVATE_KEY_BASE64, 'base64').toString('utf8')
  : process.env.WAFFO_PRIVATE_KEY?.replace(/\\n/g, '\n')

if (!privateKey || !process.env.WAFFO_MERCHANT_ID || !process.env.WAFFO_STORE_ID) {
  throw new Error('Set WAFFO_MERCHANT_ID, WAFFO_STORE_ID and WAFFO_PRIVATE_KEY in your private env file first.')
}
if (process.env.WAFFO_ENVIRONMENT !== 'test') {
  throw new Error('This setup script creates test products only.')
}

const client = new WaffoPancake({
  merchantId: process.env.WAFFO_MERCHANT_ID,
  privateKey,
  environment: 'test',
})

const storeId = process.env.WAFFO_STORE_ID
const cachePath = '.waffo/products-test.json'
await mkdir('.waffo', { recursive: true })

let cache: {
  storeId: string
  products: Record<string, string>
  webhookId?: string
}

try {
  cache = JSON.parse(await readFile(cachePath, 'utf8'))
} catch {
  cache = { storeId, products: {} }
}

if (cache.storeId !== storeId) throw new Error('Cached products belong to another store.')
const save = () => writeFile(cachePath, JSON.stringify(cache, null, 2))

for (const option of Object.values(GENERATION_PURCHASE_OPTIONS)) {
  const key = `WAFFO_GENERATION_${option.resolution.toUpperCase()}_PRODUCT_ID`
  if (process.env[key]) cache.products[key] = process.env[key]!

  if (!cache.products[key]) {
    const { product } = await client.onetimeProducts.create({
      storeId,
      name: `Hotel Lobby AI ${option.resolution.toUpperCase()} · 15s`,
      description: `One 15-second Hotel Lobby AI video at ${option.resolution.toUpperCase()} quality.`,
      prices: {
        USD: {
          amount: option.priceUsd.toFixed(2),
          taxCategory: TaxCategory.SaaS,
        },
      },
      metadata: {
        productType: 'generation',
        resolution: option.resolution,
        duration: '15',
      },
    }, {
      idempotencyKey: `hotel-lobby-test-${storeId}-generation-${option.resolution}`,
    })

    cache.products[key] = product.id
    await save()
  }
}

if (process.env.WAFFO_WEBHOOK_URL && !cache.webhookId) {
  const { webhook } = await client.webhooks.add({
    storeId,
    channel: 'http',
    url: process.env.WAFFO_WEBHOOK_URL,
    testMode: true,
    events: [
      'order.completed',
      'subscription.activated',
      'subscription.payment_succeeded',
      'subscription.canceling',
      'subscription.uncanceled',
      'subscription.canceled',
      'subscription.past_due',
      'subscription.plan_changed',
      'refund.succeeded',
      'refund.failed',
    ],
  }, {
    idempotencyKey: `hotel-lobby-test-${storeId}-webhook`,
  })

  cache.webhookId = webhook.id
  await save()
}

const keys = Object.keys(GENERATION_PURCHASE_OPTIONS).map(
  resolution => `WAFFO_GENERATION_${resolution.toUpperCase()}_PRODUCT_ID`,
)

console.log(keys.map(key => `${key}=${cache.products[key] || ''}`).join('\n'))
