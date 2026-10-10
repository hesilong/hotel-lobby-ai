import type { GenerationResolution } from '@/config/generation'

export type GenerationPurchaseOption = {
  resolution: GenerationResolution
  name: string
  priceUsd: number
  recommended?: boolean
}

export const GENERATION_PURCHASE_OPTIONS: Record<GenerationResolution, GenerationPurchaseOption> = {
  '480p': {
    resolution: '480p',
    name: 'Lite',
    priceUsd: 4.99,
  },
  '720p': {
    resolution: '720p',
    name: 'Standard',
    priceUsd: 9.90,
    recommended: true,
  },
  '1080p': {
    resolution: '1080p',
    name: 'Pro',
    priceUsd: 19.90,
  },
}

export function generationPriceUsd(resolution: GenerationResolution) {
  return GENERATION_PURCHASE_OPTIONS[resolution].priceUsd
}

export function generationPriceLabel(resolution: GenerationResolution) {
  return `$${generationPriceUsd(resolution).toFixed(2)}`
}
