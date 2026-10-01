export type MotionTemplate = {
  id: string
  name: string
  previewVideoUrl: string
  sourceVideoUrl: string
  defaultPrompt: string
  defaultRatio: '16:9' | '9:16' | '1:1'
}

const SOURCE = 'https://cdn.clothmotion.app/templates/hotel-lobby-ai'
const PREVIEW = `${SOURCE}/preview`

const basePrompt = 'Use TWO separate authorized adult portrait references to replace the two performers in the reference video. Preserve each person\'s face, hairstyle, outfit, and identity. Keep Person A on the LEFT and Person B on the RIGHT. Follow the reference motion, timing, framing, gestures, and body movement closely. Do not blend faces, swap sides, add extra people, text, logos, or watermarks.'

export const HOTEL_LOBBY_TEMPLATES: MotionTemplate[] = [
  { id: 'hotel-lobby-1', name: 'Hotel Lobby 1', previewVideoUrl: `${PREVIEW}/hotel-lobby-ai-4.mp4`, sourceVideoUrl: `${SOURCE}/hotel-lobby-ai-1.mp4`, defaultPrompt: basePrompt, defaultRatio: '16:9' },
  { id: 'hotel-lobby-2', name: 'Hotel Lobby 2', previewVideoUrl: `${PREVIEW}/hotel-lobby-ai-2.mp4`, sourceVideoUrl: `${SOURCE}/hotel-lobby-ai-2.mp4`, defaultPrompt: basePrompt, defaultRatio: '9:16' },
  { id: 'hotel-lobby-3', name: 'Hotel Lobby 3', previewVideoUrl: `${PREVIEW}/hotel-lobby-ai-3.mp4`, sourceVideoUrl: `${SOURCE}/hotel-lobby-ai-3.mp4`, defaultPrompt: basePrompt, defaultRatio: '16:9' },
]

export const HOTEL_LOBBY_DEFAULT_PROMPT = basePrompt
