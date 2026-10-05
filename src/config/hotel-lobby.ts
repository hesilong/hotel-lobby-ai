export type MotionTemplate = {
  id: string
  name: string
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

const SOURCE = 'https://cdn.clothmotion.app/templates/hotel-lobby-ai'
const PREVIEW = `${SOURCE}/preview`

const basePrompt = 'Create a coordinated entertainment video using TWO separate reference performers. Use @Image1 as the Left Performer and @Image2 as the Right Performer; each reference may depict an adult person or a pet. Preserve each performer\'s recognizable appearance, facial or head features, hair or fur, markings, clothing if present, colors, and overall visual characteristics. Keep the Left Performer on the LEFT and the Right Performer on the RIGHT. Follow @Video1 for choreography, timing, framing, gestures, body movement, and camera behavior. Do not blend the performers, swap sides, add extra performers, text, logos, or watermarks.'

export const HOTEL_LOBBY_TEMPLATES: MotionTemplate[] = [
  { id: 'hotel-lobby-1', name: 'Hotel Lobby 1', previewVideoUrl: `${PREVIEW}/hotel-lobby-ai-1.mp4`, sourceVideoUrl: `${SOURCE}/hotel-lobby-ai-1.mp4`, defaultPrompt: basePrompt, defaultRatio: '16:9' },
  { id: 'hotel-lobby-2', name: 'Hotel Lobby 2', previewVideoUrl: `${PREVIEW}/hotel-lobby-ai-2.mp4`, sourceVideoUrl: `${SOURCE}/hotel-lobby-ai-2.mp4`, defaultPrompt: basePrompt, defaultRatio: '9:16' },
  { id: 'hotel-lobby-3', name: 'Hotel Lobby 3', previewVideoUrl: `${PREVIEW}/hotel-lobby-ai-3.mp4`, sourceVideoUrl: `${SOURCE}/hotel-lobby-ai-3.mp4`, defaultPrompt: basePrompt, defaultRatio: '16:9' },
]

export const HOTEL_LOBBY_GENERATION_TEMPLATE = HOTEL_LOBBY_TEMPLATES[0]

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
