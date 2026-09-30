import { AwsClient } from 'aws4fetch'
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '@/lib/supabase/server'

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

  return {
    bucket,
    publicBase,
    apiBase: `https://${accountId}.r2.cloudflarestorage.com`,
    client: new AwsClient({
      service: 's3',
      region: 'auto',
      accessKeyId,
      secretAccessKey,
    }),
  }
}

export const createUploadUrl = createServerFn({ method: 'POST' })
  .inputValidator((input: PresignInput) => input)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) throw new Error('AUTH_REQUIRED')

    const allowed = data.kind === 'image' ? allowedImageTypes : allowedVideoTypes
    if (!allowed.has(data.mimeType)) throw new Error('UNSUPPORTED_FILE_TYPE')

    const { client, bucket, publicBase, apiBase } = r2Config()
    const key = `uploads/${auth.user.id}/${data.kind}/${Date.now()}-${crypto.randomUUID()}.${safeExt(data.fileName)}`

    const url = new URL(`${apiBase}/${bucket}/${key}`)
    url.searchParams.set('X-Amz-Expires', '600')

    const signedRequest = await client.sign(
      new Request(url, {
        method: 'PUT',
        headers: { 'Content-Type': data.mimeType },
      }),
      { aws: { signQuery: true } },
    )

    return {
      uploadUrl: signedRequest.url.toString(),
      publicUrl: `${publicBase}/${key}`,
      key,
    }
  })

export async function persistGeneratedVideo(params: { taskId: string; sourceUrl: string }) {
  const response = await fetch(params.sourceUrl)
  if (!response.ok) throw new Error('RESULT_DOWNLOAD_FAILED')

  const declaredSize = Number(response.headers.get('content-length') || 0)
  if (declaredSize > 100 * 1024 * 1024) throw new Error('RESULT_TOO_LARGE_TO_PERSIST')

  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.byteLength > 100 * 1024 * 1024) throw new Error('RESULT_TOO_LARGE_TO_PERSIST')

  const { client, bucket, publicBase, apiBase } = r2Config()
  const key = `generated/videos/${params.taskId}.mp4`
  const contentType = response.headers.get('content-type') || 'video/mp4'

  const uploadResponse = await client.fetch(`${apiBase}/${bucket}/${key}`, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    body: bytes,
  })

  if (!uploadResponse.ok) {
    throw new Error(`RESULT_PERSIST_FAILED_${uploadResponse.status}`)
  }

  return `${publicBase}/${key}`
}
