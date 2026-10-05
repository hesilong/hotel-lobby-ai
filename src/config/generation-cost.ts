export type GenerationResolution = '480p' | '720p' | '1080p'

export const KIE_WITH_VIDEO_CREDITS_PER_SECOND: Record<GenerationResolution, number> = {
  '480p': 17,
  '720p': 38,
  '1080p': 95,
}

// KIE bills video-input Seedance 2.5 as:
// unit rate × (reference-video duration + output duration).
// Hotel Lobby uses a same-length preset reference for each output duration,
// so billed seconds = duration × 2.
//
// KIE credits are $0.005 each. Our lowest effective site-credit selling
// price is about $0.04 on yearly plans. Dividing KIE credits by 4 therefore
// targets a 50% gross margin at that lowest selling price.
const KIE_CREDITS_PER_SITE_CREDIT = 4
const SITE_CREDIT_ROUNDING = 5

const roundUp = (value: number, step: number) =>
  Math.ceil(value / step) * step

export function calculateGenerationCredits(duration: number, resolution: GenerationResolution) {
  const kieCredits = KIE_WITH_VIDEO_CREDITS_PER_SECOND[resolution] * duration * 2
  return roundUp(kieCredits / KIE_CREDITS_PER_SITE_CREDIT, SITE_CREDIT_ROUNDING)
}
