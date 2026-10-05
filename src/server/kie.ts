const KIE_BASE = process.env.KIE_API_BASE_URL || 'https://api.kie.ai'
export const KIE_VIDEO_MODEL = 'bytedance/seedance-2-5'

type JsonObject = Record<string, unknown>
const obj = (v: unknown): JsonObject => (v && typeof v === 'object' && !Array.isArray(v) ? v as JsonObject : {})
const str = (v: unknown) => typeof v === 'string' && v.trim() ? v.trim() : undefined

export async function submitKieSeedanceVideo(input: {
  imageUrls: string[]
  videoUrl: string
  prompt: string
  duration: number
  resolution: '480p' | '720p' | '1080p'
  aspectRatio: '16:9' | '9:16' | '1:1'
}) {
  const apiKey = process.env.KIE_API_KEY
  if (!apiKey) throw new Error('KIE_API_KEY_MISSING')

  const res = await fetch(`${KIE_BASE}/api/v1/jobs/createTask`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: KIE_VIDEO_MODEL,
      input: {
        prompt: input.prompt,
        reference_image_urls: input.imageUrls,
        reference_video_urls: [input.videoUrl],
        generate_audio: false,
        return_last_frame: false,
        resolution: input.resolution,
        aspect_ratio: input.aspectRatio,
        duration: input.duration,
        output_format: 'mp4',
        web_search: false,
        nsfw_checker: true,
      },
    }),
  })

  const raw = await res.text()
  let parsed: JsonObject = {}
  try { parsed = obj(JSON.parse(raw)) } catch {}
  const code = Number(parsed.code)
  const message = str(parsed.msg) || str(parsed.message) || raw || 'KIE create failed'
  if (!res.ok || code !== 200) throw new Error(message)

  const data = obj(parsed.data)
  const taskId = str(data.taskId) || str(data.task_id)
  if (!taskId) throw new Error('KIE_TASK_ID_MISSING')
  return { taskId }
}

export async function getKieTask(taskId: string) {
  const apiKey = process.env.KIE_API_KEY
  if (!apiKey) throw new Error('KIE_API_KEY_MISSING')

  const res = await fetch(`${KIE_BASE}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  })
  const raw = await res.text()
  let parsed: JsonObject = {}
  try { parsed = obj(JSON.parse(raw)) } catch {}
  if (!res.ok) throw new Error(str(parsed.msg) || str(parsed.message) || raw || 'KIE status failed')

  const data = obj(parsed.data)
  const state = str(data.state) || 'waiting'
  let resultUrl: string | undefined
  const resultJson = str(data.resultJson)
  if (resultJson) {
    try {
      const r = obj(JSON.parse(resultJson))
      const urls = Array.isArray(r.resultUrls) ? r.resultUrls : []
      resultUrl = urls.find((v): v is string => typeof v === 'string' && /^https?:\/\//.test(v))
    } catch {}
  }

  return {
    state,
    resultUrl,
    failCode: str(data.failCode),
    failMessage: str(data.failMsg),
    progress: typeof data.progress === 'number' ? data.progress : undefined,
  }
}
