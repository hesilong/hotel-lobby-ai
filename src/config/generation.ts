export type GenerationResolution = '480p' | '720p' | '1080p'
export type GenerationAspectRatio = '16:9' | '9:16' | '1:1'

export type GenerationCapabilities = {
  audio: boolean
  referenceImages: boolean
  referenceVideo: boolean
}

export type GenerationConfig<TTemplate = unknown> = {
  id: string
  provider: string
  model: string
  durations: readonly number[]
  resolutions: readonly GenerationResolution[]
  aspectRatios: readonly GenerationAspectRatio[]
  defaultDuration: number
  defaultResolution: GenerationResolution
  defaultAspectRatio: GenerationAspectRatio
  defaultGenerateAudio: boolean
  capabilities: GenerationCapabilities
  templates?: readonly TTemplate[]
  calculateCredits: (duration: number, resolution: GenerationResolution) => number
}
