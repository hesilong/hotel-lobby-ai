type JsonObject = Record<string, unknown>

type CloudConvertJobStatus = 'waiting' | 'processing' | 'finished' | 'error'

export type CloudConvertAudioJob = {
  id: string
  status: CloudConvertJobStatus
  resultUrl: string | null
  error: string | null
}

const API_BASE = 'https://api.cloudconvert.com/v2'
const SYNC_API_BASE = 'https://sync.api.cloudconvert.com/v2'

const obj = (value: unknown): JsonObject =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonObject
    : {}

const str = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined

function apiKey() {
  return process.env.CLOUDCONVERT_API_KEY?.trim()
}

export function cloudConvertSoundtrackUrl() {
  const explicit = process.env.CLOUDCONVERT_SOUNDTRACK_URL?.trim()
  if (explicit) return explicit

  const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, '')
  return publicBase ? `${publicBase}/sound/soundtrack_15.mp3` : undefined
}

export function cloudConvertAudioConfigured() {
  return Boolean(apiKey() && cloudConvertSoundtrackUrl())
}

function assertHttpsUrl(value: string, code: string) {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(code)
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new Error(code)
  }
}

async function request(url: string, init: RequestInit) {
  const key = apiKey()
  if (!key) throw new Error('CLOUDCONVERT_API_KEY_MISSING')

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })

  const raw = await response.text()
  let parsed: JsonObject = {}
  try {
    parsed = obj(JSON.parse(raw))
  } catch {}

  if (!response.ok) {
    throw new Error(
      str(parsed.message) ||
      str(parsed.code) ||
      raw ||
      `CLOUDCONVERT_HTTP_${response.status}`,
    )
  }

  return parsed
}

function parseJob(payload: JsonObject): CloudConvertAudioJob {
  const data = obj(payload.data)
  const id = str(data.id)
  if (!id) throw new Error('CLOUDCONVERT_JOB_ID_MISSING')

  const rawStatus = str(data.status)
  const status: CloudConvertJobStatus =
    rawStatus === 'waiting' ||
    rawStatus === 'processing' ||
    rawStatus === 'finished' ||
    rawStatus === 'error'
      ? rawStatus
      : 'processing'

  const tasks = Array.isArray(data.tasks) ? data.tasks.map(obj) : []
  const exportTask = tasks.find(task => str(task.name) === 'export-result')
  const result = obj(exportTask?.result)
  const files = Array.isArray(result.files) ? result.files.map(obj) : []
  const resultUrl = files.map(file => str(file.url)).find(Boolean) || null

  const failedTask = tasks.find(task => str(task.status) === 'error')
  const error =
    str(failedTask?.message) ||
    str(data.message) ||
    (status === 'error' ? 'CLOUDCONVERT_JOB_FAILED' : null)

  return { id, status, resultUrl, error }
}

export async function createCloudConvertAudioJob(params: {
  taskId: string
  videoUrl: string
}) {
  const soundtrackUrl = cloudConvertSoundtrackUrl()
  if (!soundtrackUrl) throw new Error('CLOUDCONVERT_SOUNDTRACK_URL_MISSING')

  assertHttpsUrl(params.videoUrl, 'CLOUDCONVERT_VIDEO_URL_INVALID')
  assertHttpsUrl(soundtrackUrl, 'CLOUDCONVERT_SOUNDTRACK_URL_INVALID')

  const payload = await request(`${API_BASE}/jobs`, {
    method: 'POST',
    body: JSON.stringify({
      tasks: {
        'import-video': {
          operation: 'import/url',
          url: params.videoUrl,
          filename: 'input.mp4',
        },
        'import-audio': {
          operation: 'import/url',
          url: soundtrackUrl,
          filename: 'soundtrack.mp3',
        },
        'mix-audio': {
          operation: 'command',
          engine: 'ffmpeg',
          command: 'ffmpeg',
          input: ['import-video', 'import-audio'],
          capture_output: true,
          timeout: 120,
          arguments:
            '-i /input/import-video/input.mp4 -i /input/import-audio/soundtrack.mp3 -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart /output/final.mp4',
        },
        'export-result': {
          operation: 'export/url',
          input: 'mix-audio',
          inline: true,
          archive_multiple_files: false,
        },
      },
      tag: `hotel-lobby-audio-${params.taskId}`,
    }),
  })

  return parseJob(payload)
}

export async function getCloudConvertAudioJob(jobId: string) {
  return parseJob(await request(
    `${API_BASE}/jobs/${encodeURIComponent(jobId)}`,
    { method: 'GET' },
  ))
}

export async function waitForCloudConvertAudioJob(
  jobId: string,
  timeoutMs = 25_000,
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return parseJob(await request(
      `${SYNC_API_BASE}/jobs/${encodeURIComponent(jobId)}`,
      { method: 'GET', signal: controller.signal },
    ))
  } catch (error) {
    if (controller.signal.aborted) throw new Error('CLOUDCONVERT_WAIT_TIMEOUT')
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
