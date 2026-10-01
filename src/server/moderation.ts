type ModerationDecision = 'allow' | 'flag' | 'deny'

const readBoolean = (value: string | undefined, fallback: boolean) => {
  if (!value) return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

const creemEndpoint = () => {
  const base = (process.env.CREEM_MODERATION_API_URL || process.env.CREEM_API_URL || 'https://api.creem.io').replace(/\/+$/, '')
  return base.endsWith('/v1') ? `${base}/moderation/prompt` : `${base}/v1/moderation/prompt`
}

export async function assertPromptAllowed(params: {
  prompt: string
  userId: string
  taskId?: string
}) {
  const prompt = params.prompt.trim()
  if (!prompt) throw new Error('INVALID_PROMPT')
  if (!readBoolean(process.env.CREEM_MODERATION_ENABLED, true)) return

  const apiKey = (process.env.CREEM_API_KEY || process.env.CREEM_SECRET_KEY || '').trim()
  if (!apiKey) throw new Error('MODERATION_UNAVAILABLE')

  const externalId = [
    'hotel-lobby-ai',
    `u_${params.userId}`,
    params.taskId ? `t_${params.taskId}` : '',
    `ts_${Date.now()}`,
  ].filter(Boolean).join(':').slice(0, 190)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(creemEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ prompt, external_id: externalId }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error('MODERATION_UNAVAILABLE')
    const payload = await response.json() as { decision?: ModerationDecision }
    if (payload.decision === 'allow') return
    if (payload.decision === 'flag' || payload.decision === 'deny') throw new Error('PROMPT_REJECTED')
    throw new Error('MODERATION_UNAVAILABLE')
  } catch (error) {
    if (error instanceof Error && error.message === 'PROMPT_REJECTED') throw error
    throw new Error('MODERATION_UNAVAILABLE')
  } finally {
    clearTimeout(timer)
  }
}

type ImageModerationPayload = {
  id?: string
  status?: string
  error?: unknown
  result?: {
    type?: string
    data?: {
      flagged?: boolean
      categories?: { nsfw?: string[]; special_care?: string[] }
    }
  }
}

const IMAGE_POLICY = 'seeapi-nsfw-v1-offset001-specialtrue'

const imageVerdict = (payload: ImageModerationPayload): 'approved' | 'rejected' | null => {
  const data = payload.result?.data
  if (
    payload.status !== 'succeeded' ||
    payload.error != null ||
    payload.result?.type !== 'json' ||
    typeof data?.flagged !== 'boolean' ||
    !Array.isArray(data.categories?.nsfw) ||
    !Array.isArray(data.categories?.special_care)
  ) {
    return null
  }
  return data.flagged ? 'rejected' : 'approved'
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function moderateReferenceImage(params: {
  imageUrl: string
  ownerKey: string
}): Promise<{ status: 'approved'; providerTaskId?: string | null }> {
  if (process.env.ENABLE_IMAGE_MODERATION !== 'true') {
    return { status: 'approved', providerTaskId: null }
  }

  const apiKey = process.env.SEEAPI_API_KEY
  if (!apiKey) throw new Error('IMAGE_MODERATION_NOT_CONFIGURED')

  const { getSupabaseAdminClient } = await import('@/lib/supabase/admin')
  const admin = getSupabaseAdminClient()

  const { data: cached, error: cacheError } = await admin
    .from('image_moderation')
    .select('id,status,expires_at,provider_task_id')
    .eq('owner_key', params.ownerKey)
    .eq('policy', IMAGE_POLICY)
    .eq('image_url', params.imageUrl)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (cacheError) throw new Error('IMAGE_MODERATION_UNAVAILABLE')
  if (cached?.status === 'approved') {
    return { status: 'approved', providerTaskId: cached.provider_task_id || null }
  }
  if (cached?.status === 'rejected') throw new Error('IMAGE_REJECTED')

  const createResponse = await fetch('https://api.seeapi.com/v1/inferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nsfw-filter',
      endpoint: 'image-moderation',
      provider: 'seeapi',
      input: {
        image_url: params.imageUrl,
        threshold_offset: 0.01,
        strict_special_care: true,
      },
    }),
    signal: AbortSignal.timeout(12000),
  })

  if (!createResponse.ok) throw new Error('IMAGE_MODERATION_UNAVAILABLE')
  const created = await createResponse.json() as { id?: string }
  if (!created.id) throw new Error('IMAGE_MODERATION_UNAVAILABLE')

  let verdict: 'approved' | 'rejected' | null = null
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (attempt) await sleep(1500)
    const response = await fetch(
      `https://api.seeapi.com/v1/inferences/${encodeURIComponent(created.id)}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(12000),
      },
    )
    if (!response.ok) throw new Error('IMAGE_MODERATION_UNAVAILABLE')
    const payload = await response.json() as ImageModerationPayload
    if (payload.status === 'queued' || payload.status === 'processing') continue
    verdict = imageVerdict(payload)
    break
  }

  if (!verdict) throw new Error('IMAGE_MODERATION_UNAVAILABLE')

  await admin.from('image_moderation').upsert({
    owner_key: params.ownerKey,
    image_url: params.imageUrl,
    status: verdict,
    provider_task_id: created.id,
    policy: IMAGE_POLICY,
    expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'owner_key,image_url,policy' })

  if (verdict === 'rejected') throw new Error('IMAGE_REJECTED')
  return { status: 'approved', providerTaskId: created.id }
}
