// Run with Node 22+ and an explicitly selected production env file.
// Creates or synchronizes PRODUCTION Hotel Lobby generation products only.
// This script does NOT create webhooks and does NOT modify Cloudflare runtime vars.
import { WaffoPancake, TaxCategory } from '@waffo/pancake-ts'
import { GENERATION_PURCHASE_OPTIONS } from '../src/config/generation-purchase.ts'
import { readFile, writeFile, mkdir } from 'node:fs/promises'

const privateKey = process.env.WAFFO_PRIVATE_KEY_BASE64
  ? Buffer.from(process.env.WAFFO_PRIVATE_KEY_BASE64, 'base64').toString('utf8')
  : process.env.WAFFO_PRIVATE_KEY?.replace(/\\n/g, '\n')

const merchantId = process.env.WAFFO_MERCHANT_ID?.trim()
const storeId = process.env.WAFFO_STORE_ID?.trim()
const environment = process.env.WAFFO_ENVIRONMENT?.trim()
const confirmation = process.env.WAFFO_CONFIRM_PRODUCTION?.trim()

if (environment !== 'prod') {
  throw new Error('Refusing to run: WAFFO_ENVIRONMENT must be exactly "prod".')
}

if (confirmation !== 'CREATE') {
  throw new Error('Refusing to run: set WAFFO_CONFIRM_PRODUCTION=CREATE to acknowledge Production changes.')
}

if (!privateKey || !merchantId || !storeId) {
  throw new Error(
    'Set WAFFO_MERCHANT_ID, WAFFO_STORE_ID and WAFFO_PRIVATE_KEY (or WAFFO_PRIVATE_KEY_BASE64) first.',
  )
}

const client = new WaffoPancake({
  merchantId,
  privateKey,
  environment: 'prod',
})

const cachePath = '.waffo/products-prod.json'
await mkdir('.waffo', { recursive: true })

let cache: {
  merchantId: string
  storeId: string
  products: Record<string, string>
}

try {
  cache = JSON.parse(await readFile(cachePath, 'utf8'))
} catch {
  cache = { merchantId, storeId, products: {} }
}

if (cache.merchantId !== merchantId || cache.storeId !== storeId) {
  throw new Error(
    'Cached Production products belong to another Waffo merchant/store. ' +
    'Remove .waffo/products-prod.json only after confirming the intended Production account.',
  )
}

const save = () =>
  writeFile(cachePath, JSON.stringify(cache, null, 2) + '\n')

console.log('Preparing Waffo Production generation products...')
console.log(`Merchant: ${merchantId}`)
console.log(`Store:    ${storeId}`)
console.log('')

for (const option of Object.values(GENERATION_PURCHASE_OPTIONS)) {
  const envKey = `WAFFO_GENERATION_${option.resolution.toUpperCase()}_PRODUCT_ID`
  const configuredProductId = process.env[envKey]?.trim()

  if (configuredProductId) {
    cache.products[envKey] = configuredProductId
  }

  const desired = {
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
      site: 'hotel-lobby-ai.pro',
    },
  }

  const existingProductId = cache.products[envKey]

  if (!existingProductId) {
    console.log(
      `Creating ${option.resolution.toUpperCase()} Production product at $${option.priceUsd.toFixed(2)}...`,
    )

    const { product } = await client.onetimeProducts.create(
      {
        storeId,
        ...desired,
      },
      {
        idempotencyKey: `hotel-lobby-prod-${storeId}-generation-${option.resolution}`,
      },
    )

    cache.products[envKey] = product.id
    await save()

    console.log(`Created ${envKey}=${product.id}`)
  } else {
    console.log(
      `Synchronizing ${option.resolution.toUpperCase()} Production product ${existingProductId}...`,
    )

    await client.onetimeProducts.update({
      id: existingProductId,
      ...desired,
    })

    await save()
    console.log(`Updated ${envKey}=${existingProductId}`)
  }
}

console.log('')
console.log('Production product IDs:')
console.log('')

for (const option of Object.values(GENERATION_PURCHASE_OPTIONS)) {
  const envKey = `WAFFO_GENERATION_${option.resolution.toUpperCase()}_PRODUCT_ID`
  console.log(`${envKey}=${cache.products[envKey] || ''}`)
}

console.log('')
console.log('Next steps:')
console.log('1. Copy the three IDs above into the Cloudflare Production Worker variables.')
console.log('2. Configure the Production Waffo webhook separately.')
console.log('3. Keep MOCK_GENERATION=true until you are ready to test real KIE.')
console.log('4. Switch WAFFO_ENVIRONMENT=prod only when all Production Waffo credentials and IDs are installed.')
