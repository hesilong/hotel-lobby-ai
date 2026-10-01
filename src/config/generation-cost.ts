export type GenerationResolution = '720p' | '1080p' | '4k'

export const GENERATION_BASE_CREDITS_PER_5S = 50
export const GENERATION_RESOLUTION_MULTIPLIER: Record<GenerationResolution, number> = {
  '720p': 1,
  '1080p': 1.5,
  '4k': 2,
}

export function calculateGenerationCredits(duration: number, resolution: GenerationResolution) {
  const blocks = Math.max(1, Math.ceil(duration / 5))
  return Math.ceil(GENERATION_BASE_CREDITS_PER_5S * blocks * GENERATION_RESOLUTION_MULTIPLIER[resolution])
}
