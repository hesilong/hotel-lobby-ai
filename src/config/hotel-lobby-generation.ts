import type { GenerationConfig } from '@/config/generation'
import { calculateGenerationCredits } from '@/config/generation-cost'
import { HOTEL_LOBBY_TEMPLATES, type MotionTemplate } from '@/config/hotel-lobby'

export const HOTEL_LOBBY_GENERATION_CONFIG = {
  id: 'hotel-lobby',
  provider: 'kie',
  model: 'bytedance/seedance-2-5',
  durations: [15],
  resolutions: ['480p', '720p', '1080p'],
  aspectRatios: ['9:16', '16:9'],
  defaultDuration: 15,
  defaultResolution: '480p',
  defaultAspectRatio: '9:16',
  defaultIncludeSoundtrack: true,
  providerGenerateAudio: false,
  capabilities: {
    audio: true,
    referenceImages: true,
    referenceVideo: true,
  },
  templates: HOTEL_LOBBY_TEMPLATES,
  calculateCredits: calculateGenerationCredits,
} satisfies GenerationConfig<MotionTemplate>
