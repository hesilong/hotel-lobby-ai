import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { createR2PresignedPutUrl } from '@/server/r2Presign'

type PresignInput = {
  fileName: string
  mimeType: string
  kind: 'image' | 'video'
}

const safeExt = (name: string) => {
  const match = name.toLowerCase().match(/\.([a-z0-9]{1,8})$/)
  return match?.[1] || 'bin'
}

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const allowedVideoTypes = new Set(['video/mp4', 'video/quicktime', 'video/webm'])

function r2Config() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET_NAME
  const publicBase = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '')

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBase) {
    throw new Error('R2_NOT_CONFIGURED')
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicBase }
}

async function createSignedPutUrl(key: string, expiresInSeconds = 600) {
  const config = r2Config()
  return createR2PresignedPutUrl({
    accountId: config.accountId,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    bucketName: config.bucket,
    key,
    expiresInSeconds,
  })
}

export const createUploadUrl = createServerFn({ method: 'POST' })
  .inputValidator((input: PresignInput) => input)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) throw new Error('AUTH_REQUIRED')

    const allowed = data.kind === 'image' ? allowedImageTypes : allowedVideoTypes
    if (!allowed.has(data.mimeType)) throw new Error('UNSUPPORTED_FILE_TYPE')

    const { publicBase } = r2Config()
    const key =
      `uploads/${auth.user.id}/${data.kind}/${Date.now()}-${crypto.randomUUID()}.${safeExt(data.fileName)}`
    const uploadUrl = await createSignedPutUrl(key)

    return {
      uploadUrl,
      publicUrl: `${publicBase}/${key}`,
      key,
    }
  })

export async function persistGeneratedVideo(params: {
  taskId: string
  sourceUrl: string
}) {
  const response = await fetch(params.sourceUrl)
  if (!response.ok) throw new Error('RESULT_DOWNLOAD_FAILED')

  const declaredSize = Number(response.headers.get('content-length') || 0)
  if (declaredSize > 100 * 1024 * 1024) {
    throw new Error('RESULT_TOO_LARGE_TO_PERSIST')
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.byteLength > 100 * 1024 * 1024) {
    throw new Error('RESULT_TOO_LARGE_TO_PERSIST')
  }

  const { publicBase } = r2Config()
  const key = `generated/videos/${params.taskId}.mp4`
  const contentType = response.headers.get('content-type') || 'video/mp4'
  const uploadUrl = await createSignedPutUrl(key)

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    body: bytes,
  })

  if (!uploadResponse.ok) {
    const detail = await uploadResponse.text().catch(() => '')
    console.error('[R2] generated video persist failed', {
      status: uploadResponse.status,
      detail: detail.slice(0, 500),
    })
    throw new Error(`RESULT_PERSIST_FAILED_${uploadResponse.status}`)
  }

  return `${publicBase}/${key}`
}
