export type MotionTemplate = {
  id: string
  name: string
  duration: 5 | 10 | 15 | 20 | 25 | 30
  previewVideoUrl: string
  sourceVideoUrl: string
  defaultPrompt: string
  defaultRatio: '16:9' | '9:16' | '1:1'
}

export type HotelLobbyScene = {
  id: 'orange-stage' | 'recording-studio' | 'grand-hall'
  name: string
  description: string
  prompt: string
}

const SOURCE = 'https://cdn.hotel-lobby-ai.pro/template'

const basePrompt = 'Create a coordinated entertainment video using TWO separate reference performers. Use @Image1 as the Left Performer and @Image2 as the Right Performer; each reference may depict an adult person or a pet. Preserve each performer\'s recognizable appearance, facial or head features, hair or fur, markings, clothing if present, colors, and overall visual characteristics. Keep the Left Performer on the LEFT and the Right Performer on the RIGHT. Follow @Video1 for choreography, timing, framing, gestures, body movement, and camera behavior. Do not blend the performers, swap sides, add extra performers, text, logos, or watermarks.'

export const HOTEL_LOBBY_TEMPLATES: MotionTemplate[] = [
  { id: 'hotel-lobby-5', name: 'Hotel Lobby 5s', duration: 5, previewVideoUrl: `${SOURCE}/hotel-lobby_5.mp4`, sourceVideoUrl: `${SOURCE}/hotel-lobby_5.mp4`, defaultPrompt: basePrompt, defaultRatio: '16:9' },
  { id: 'hotel-lobby-10', name: 'Hotel Lobby 10s', duration: 10, previewVideoUrl: `${SOURCE}/hotel-lobby_10.mp4`, sourceVideoUrl: `${SOURCE}/hotel-lobby_10.mp4`, defaultPrompt: basePrompt, defaultRatio: '16:9' },
  { id: 'hotel-lobby-15', name: 'Hotel Lobby 15s', duration: 15, previewVideoUrl: `${SOURCE}/hotel-lobby_15.mp4`, sourceVideoUrl: `${SOURCE}/hotel-lobby_15.mp4`, defaultPrompt: basePrompt, defaultRatio: '16:9' },
  { id: 'hotel-lobby-20', name: 'Hotel Lobby 20s', duration: 20, previewVideoUrl: `${SOURCE}/hotel-lobby_20.mp4`, sourceVideoUrl: `${SOURCE}/hotel-lobby_20.mp4`, defaultPrompt: basePrompt, defaultRatio: '16:9' },
  { id: 'hotel-lobby-25', name: 'Hotel Lobby 25s', duration: 25, previewVideoUrl: `${SOURCE}/hotel-lobby_25.mp4`, sourceVideoUrl: `${SOURCE}/hotel-lobby_25.mp4`, defaultPrompt: basePrompt, defaultRatio: '16:9' },
  { id: 'hotel-lobby-30', name: 'Hotel Lobby 30s', duration: 30, previewVideoUrl: `${SOURCE}/hotel-lobby_30.mp4`, sourceVideoUrl: `${SOURCE}/hotel-lobby_30.mp4`, defaultPrompt: basePrompt, defaultRatio: '16:9' },
]

export const getHotelLobbyGenerationTemplate = (duration: number) => {
  const template = HOTEL_LOBBY_TEMPLATES.find(item => item.duration === duration)
  if (!template) throw new Error('REFERENCE_VIDEO_NOT_READY')
  return template
}

export const HOTEL_LOBBY_SCENES: HotelLobbyScene[] = [
  {
    id: 'orange-stage',
    name: 'Orange Stage',
    description: 'Warm studio lighting and a clean orange backdrop.',
    prompt: `${basePrompt} Place the performance on a clean warm orange studio stage with soft cinematic lighting.`,
  },
  {
    id: 'recording-studio',
    name: 'Recording Studio',
    description: 'A polished music studio with cinematic depth.',
    prompt: `${basePrompt} Place the performance inside a modern recording studio with tasteful acoustic panels, soft practical lights, and cinematic depth.`,
  },
  {
    id: 'grand-hall',
    name: 'Grand Hall',
    description: 'An elegant interior with a premium event feel.',
    prompt: `${basePrompt} Place the performance inside an elegant grand hall with refined architectural details, balanced warm lighting, and a premium event atmosphere.`,
  },
]

export const HOTEL_LOBBY_DEFAULT_PROMPT = basePrompt
