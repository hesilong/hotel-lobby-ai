import type { ProductDefinition } from '@/core/product/types'
import { SITE_CONFIG } from '@/config/site'
import { HOTEL_LOBBY_GENERATION_CONFIG } from '@/products/hotel-lobby/generation'
import { GENERATION_PURCHASE_OPTIONS } from '@/products/hotel-lobby/pricing'
import type { MotionTemplate } from '@/products/hotel-lobby/motion'

export const HOTEL_LOBBY_PRODUCT = {
  id: 'hotel-lobby',
  site: SITE_CONFIG,
  generation: HOTEL_LOBBY_GENERATION_CONFIG,
  pricing: GENERATION_PURCHASE_OPTIONS,
  providers: {
    generation: 'kie',
    payment: 'waffo',
    postProcess: 'cloudconvert',
    email: 'resend',
    moderation: 'seeapi',
  },
} satisfies ProductDefinition<MotionTemplate>
