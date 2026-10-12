import type {
  GenerationConfig,
  GenerationResolution,
} from '@/core/generation/types'

export type ProductSiteConfig = {
  name: string
  domain: string
  url: string
  supportEmail: string
  faviconPath: string
  mediaCdnUrl: string
  defaultTitle: string
  defaultDescription: string
}

export type ProductPurchaseOption = {
  resolution: GenerationResolution
  name: string
  priceUsd: number
  recommended?: boolean
}

export type ProductProviderConfig = {
  generation: string
  payment: string
  postProcess?: string
  email?: string
  moderation?: string
}

export type ProductDefinition<TTemplate = unknown> = {
  id: string
  site: ProductSiteConfig
  generation: GenerationConfig<TTemplate>
  pricing: Readonly<Record<GenerationResolution, ProductPurchaseOption>>
  providers: ProductProviderConfig
}
