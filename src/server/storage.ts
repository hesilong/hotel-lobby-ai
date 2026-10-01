import { createServerFn } from '@tanstack/react-start'
import { getCookies, setCookie } from '@tanstack/react-start/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { moderateReferenceImage } from '@/server/moderation'
import { createR2PresignedPutUrl } from '@/server/r2Presign'

type PresignInput = {
  fileName: string
  mimeType: string
  kind: 'image' | 'video'
}

type FinalizeInput = {
  assetId: string
}

const GUEST_COOKIE = 'hla_guest_id'

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

async function uploadOwner() {
  const supabase = getSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  const cookies = getCookies()
  let guestId = cookies[GUEST_COOKIE]

  if (!guestId) {
    guestId = crypto.randomUUID()
    setCookie(GUEST_COOKIE, guestId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  }

  return {
    userId: auth.user?.id || null,
    guestId,
    ownerKey: auth.user ? `user:${auth.user.id}` : `guest:${guestId}`,
  }
}

async function allowedOwnerKeys(userId?: string | null) {
  const cookies = getCookies()
  const keys = new Set<string>()
  if (userId) keys.add(`user:${userId}`)
  const guestId = cookies[GUEST_COOKIE]
  if (guestId) keys.add(`guest:${guestId}`)
  return [...keys]
}

export const createUploadUrl = createServerFn({ method: 'POST' })
  .inputValidator((input: PresignInput) => input)
  .handler(async ({ data }) => {
    const allowed = data.kind === 'image' ? allowedImageTypes : allowedVideoTypes
    if (!allowed.has(data.mimeType)) throw new Error('UNSUPPORTED_FILE_TYPE')

    const owner = await uploadOwner()
    const { publicBase } = r2Config()
    const ownerPath = owner.userId ? `user-${owner.userId}` : `guest-${owner.guestId}`
    const key =
      `uploads/${ownerPath}/${data.kind}/${Date.now()}-${crypto.randomUUID()}.${safeExt(data.fileName)}`
    const publicUrl = `${publicBase}/${key}`
    const uploadUrl = await createSignedPutUrl(key)

    const admin = getSupabaseAdminClient()
    const { data: asset, error } = await admin.from('uploaded_assets').insert({
      owner_key: owner.ownerKey,
      user_id: owner.userId,
      kind: data.kind,
      object_key: key,
      public_url: publicUrl,
      mime_type: data.mimeType,
      status: 'uploading',
    }).select('id').single()

    if (error || !asset) throw new Error(error?.message || 'UPLOAD_ASSET_CREATE_FAILED')

    return {
      assetId: asset.id as string,
      uploadUrl,
      publicUrl,
      key,
    }
  })

export const finalizeUploadedAsset = createServerFn({ method: 'POST' })
  .inputValidator((input: FinalizeInput) => input)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { data: auth } = await supabase.auth.getUser()
    const owners = await allowedOwnerKeys(auth.user?.id || null)
    if (!owners.length) throw new Error('UPLOAD_ASSET_FORBIDDEN')

    const admin = getSupabaseAdminClient()
    const { data: asset, error } = await admin.from('uploaded_assets')
      .select('id,owner_key,user_id,kind,public_url,status')
      .eq('id', data.assetId)
      .in('owner_key', owners)
      .maybeSingle()

    if (error || !asset) throw new Error('UPLOAD_ASSET_NOT_FOUND')

    if (asset.kind === 'video') {
      const { error: updateError } = await admin.from('uploaded_assets').update({
        status: 'ready',
        updated_at: new Date().toISOString(),
      }).eq('id', asset.id)
      if (updateError) throw new Error(updateError.message)
      return { assetId: asset.id as string, publicUrl: asset.public_url as string, status: 'ready' as const }
    }

    await admin.from('uploaded_assets').update({
      status: 'moderating',
      error_code: null,
      updated_at: new Date().toISOString(),
    }).eq('id', asset.id)

    try {
      const result = await moderateReferenceImage({
        imageUrl: asset.public_url,
        ownerKey: asset.owner_key,
      })
      const { error: updateError } = await admin.from('uploaded_assets').update({
        status: 'approved',
        moderation_provider_id: result.providerTaskId || null,
        error_code: null,
        updated_at: new Date().toISOString(),
      }).eq('id', asset.id)
      if (updateError) throw new Error(updateError.message)
      return { assetId: asset.id as string, publicUrl: asset.public_url as string, status: 'approved' as const }
    } catch (error) {
      const code = error instanceof Error ? error.message : 'IMAGE_MODERATION_UNAVAILABLE'
      const status = code === 'IMAGE_REJECTED' ? 'rejected' : 'error'
      await admin.from('uploaded_assets').update({
        status,
        error_code: code,
        updated_at: new Date().toISOString(),
      }).eq('id', asset.id)
      throw error
    }
  })

export async function verifyPreparedAssets(params: {
  userId: string
  imageAAssetId: string
  imageAUrl: string
  imageBAssetId: string
  imageBUrl: string
  referenceVideoAssetId?: string | null
  referenceVideoUrl: string
}) {
  const owners = await allowedOwnerKeys(params.userId)
  if (!owners.length) throw new Error('ASSET_OWNERSHIP_INVALID')

  const admin = getSupabaseAdminClient()
  const ids = [params.imageAAssetId, params.imageBAssetId, params.referenceVideoAssetId].filter(Boolean) as string[]
  const { data: assets, error } = await admin.from('uploaded_assets')
    .select('id,owner_key,user_id,kind,public_url,status')
    .in('id', ids)
    .in('owner_key', owners)

  if (error) throw new Error(error.message)
  const byId = new Map((assets || []).map(asset => [asset.id as string, asset]))

  const imageA = byId.get(params.imageAAssetId)
  const imageB = byId.get(params.imageBAssetId)
  if (!imageA || imageA.kind !== 'image' || imageA.status !== 'approved' || imageA.public_url !== params.imageAUrl) {
    throw new Error('IMAGE_A_NOT_READY')
  }
  if (!imageB || imageB.kind !== 'image' || imageB.status !== 'approved' || imageB.public_url !== params.imageBUrl) {
    throw new Error('IMAGE_B_NOT_READY')
  }

  if (params.referenceVideoAssetId) {
    const video = byId.get(params.referenceVideoAssetId)
    if (!video || video.kind !== 'video' || video.status !== 'ready' || video.public_url !== params.referenceVideoUrl) {
      throw new Error('REFERENCE_VIDEO_NOT_READY')
    }
  }

  const guestAssets = (assets || []).filter(asset => asset.owner_key.startsWith('guest:'))
  if (guestAssets.length) {
    await admin.from('uploaded_assets').update({
      owner_key: `user:${params.userId}`,
      user_id: params.userId,
      updated_at: new Date().toISOString(),
    }).in('id', guestAssets.map(asset => asset.id))
  }
}

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
