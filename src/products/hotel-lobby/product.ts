import type { ProductDefinition } from '@/core/product/types'
import { SITE_CONFIG } from '@/config/site'
import { HOTEL_LOBBY_GENERATION_CONFIG } from '@/config/hotel-lobby-generation'
import { GENERATION_PURCHASE_OPTIONS } from '@/config/generation-purchase'
import type { MotionTemplate } from '@/config/hotel-lobby'

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
