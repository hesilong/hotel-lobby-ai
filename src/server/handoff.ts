import { createServerFn } from '@tanstack/react-start'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { HOTEL_LOBBY_TEMPLATES } from '@/config/hotel-lobby'
import { verifyPreparedAssetsForHandoff } from '@/server/storage'
import { assertPromptAllowed } from '@/server/moderation'

export type GenerationHandoffInput = {
  imageAAssetId: string
  imageAAssetToken: string
  imageAUrl: string
  imageBAssetId: string
  imageBAssetToken: string
  imageBUrl: string
  referenceTemplateId?: string | null
  referenceVideoAssetId?: string | null
  referenceVideoAssetToken?: string | null
  referenceVideoUrl: string
  prompt: string
  duration: number
  resolution: '720p' | '1080p' | '4k'
  aspectRatio: '16:9' | '9:16' | '1:1'
}

export type GenerationHandoffPayload = {
  version: 1
  imageAUrl: string
  imageBUrl: string
  referenceTemplateId: string | null
  referenceVideoUrl: string
  prompt: string
  duration: number
  resolution: '720p' | '1080p' | '4k'
  aspectRatio: '16:9' | '9:16' | '1:1'
  createdAt: string
  expiresAt: string
}

const handoffEnabled = () => process.env.GENERATION_HANDOFF_TO_CLOTHMOTION !== 'false'

const validHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

const validate = (data: GenerationHandoffInput) => {
  if (!data.imageAAssetId || !data.imageAAssetToken || !data.imageBAssetId || !data.imageBAssetToken) {
    throw new Error('REFERENCE_IMAGES_NOT_READY')
  }
  if (!validHttpUrl(data.imageAUrl) || !validHttpUrl(data.imageBUrl) || !validHttpUrl(data.referenceVideoUrl)) {
    throw new Error('INVALID_ASSET_URL')
  }
  if (!data.prompt.trim() || data.prompt.length > 3072) throw new Error('INVALID_PROMPT')
  if (![5, 10, 15].includes(data.duration)) throw new Error('INVALID_DURATION')
  if (!['720p', '1080p', '4k'].includes(data.resolution)) throw new Error('INVALID_RESOLUTION')
  if (!['16:9', '9:16', '1:1'].includes(data.aspectRatio)) throw new Error('INVALID_ASPECT_RATIO')
}

export const getGenerationHandoffMode = createServerFn({ method: 'GET' }).handler(async () => ({
  enabled: handoffEnabled(),
}))

export const createGenerationHandoff = createServerFn({ method: 'POST' })
  .inputValidator((input: GenerationHandoffInput) => input)
  .handler(async ({ data }) => {
    if (!handoffEnabled()) throw new Error('HANDOFF_DISABLED')
    validate(data)

    if (data.referenceTemplateId) {
      const template = HOTEL_LOBBY_TEMPLATES.find(item => item.id === data.referenceTemplateId)
      if (!template || template.sourceVideoUrl !== data.referenceVideoUrl) {
        throw new Error('REFERENCE_VIDEO_NOT_READY')
      }
    } else {
      if (!data.referenceVideoAssetId || !data.referenceVideoAssetToken) {
        throw new Error('REFERENCE_VIDEO_NOT_READY')
      }
    }

    await assertPromptAllowed({ prompt: data.prompt, userId: 'handoff' })

    await verifyPreparedAssetsForHandoff({
      imageAAssetId: data.imageAAssetId,
      imageAAssetToken: data.imageAAssetToken,
      imageAUrl: data.imageAUrl,
      imageBAssetId: data.imageBAssetId,
      imageBAssetToken: data.imageBAssetToken,
      imageBUrl: data.imageBUrl,
      referenceVideoAssetId: data.referenceTemplateId ? null : data.referenceVideoAssetId,
      referenceVideoAssetToken: data.referenceTemplateId ? null : data.referenceVideoAssetToken,
      referenceVideoUrl: data.referenceVideoUrl,
    })

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000)
    const payload: GenerationHandoffPayload = {
      version: 1,
      imageAUrl: data.imageAUrl,
      imageBUrl: data.imageBUrl,
      referenceTemplateId: data.referenceTemplateId || null,
      referenceVideoUrl: data.referenceVideoUrl,
      prompt: data.prompt.trim(),
      duration: data.duration,
      resolution: data.resolution,
      aspectRatio: data.aspectRatio,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }

    const token = crypto.randomUUID().replace(/-/g, '')
    const admin = getSupabaseAdminClient()

    // Opportunistic cleanup keeps this temporary table small without another cron.
    await admin.from('generation_handoffs').delete().lt('expires_at', now.toISOString())

    const { error } = await admin.from('generation_handoffs').insert({
      token,
      payload,
      expires_at: expiresAt.toISOString(),
    })
    if (error) throw new Error(error.message)

    const redirect = new URL('https://www.clothmotion.app/hotel-lobby-ai')
    redirect.searchParams.set('handoff', token)
    redirect.searchParams.set('utm_source', 'hotel-lobby-ai.pro')
    redirect.searchParams.set('utm_medium', 'referral')
    redirect.searchParams.set('utm_campaign', 'hotel-lobby-ai')

    return { redirectUrl: redirect.toString(), expiresAt: expiresAt.toISOString() }
  })
