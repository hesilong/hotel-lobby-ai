import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { assertPromptAllowed } from '@/server/moderation'
import { deductCredits, refundCredits, reconcileYearlySubscriptionCredits } from '@/server/credits'
import type { GenerationAspectRatio, GenerationResolution } from '@/config/generation'
import { HOTEL_LOBBY_GENERATION_CONFIG } from '@/config/hotel-lobby-generation'
import { submitKieSeedanceVideo } from '@/server/kie'
import { verifyPreparedAssets } from '@/server/storage'
import { retryPaidGenerationOrderForUser } from '@/server/generation-purchases'

export type CreateGenerationInput = {
  imageAAssetId?: string | null
  imageAAssetToken?: string | null
  imageBAssetId?: string | null
  imageBAssetToken?: string | null
  referenceVideoAssetId?: string | null
  referenceVideoAssetToken?: string | null
  imageAUrl: string
  imageBUrl: string
  referenceTemplateId?: string | null
  referenceVideoUrl: string
  prompt: string
  duration: number
  resolution: GenerationResolution
  aspectRatio: GenerationAspectRatio
  generateAudio: boolean
}

export type GenerationTask = {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result_url: string | null
  provider_result_url?: string | null
  storage_status?: 'pending' | 'persisted' | 'fallback'
  failure_message: string | null
  created_at: string
  provider_task_id: string | null
  provider?: string | null
  credits_used?: number
  duration_seconds?: number
  resolution?: GenerationResolution
  aspect_ratio?: GenerationAspectRatio
  generate_audio?: boolean
  prompt?: string
  generation_order_id?: string | null
  generation_order_status?: 'pending_payment' | 'paid' | 'processing' | 'failed' | 'fulfilled' | 'refund_requested' | 'refunded' | null
  generation_price_usd?: number | null
  refund_error?: string | null
  refund_ticket_id?: string | null
}

const mockEnabled = () => process.env.MOCK_GENERATION === 'true'
const kieCallbackUrl = () => {
  const explicit = process.env.KIE_CALLBACK_URL?.trim()
  if (explicit) return explicit
  if (process.env.NODE_ENV !== 'production') return undefined
  const siteUrl = process.env.VITE_SITE_URL?.trim().replace(/\/+$/, '')
  return siteUrl ? `${siteUrl}/api/kie/callback` : undefined
}

async function authUser() {
  const supabase = getSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('AUTH_REQUIRED')
  return auth.user
}

function validateInput(data: CreateGenerationInput) {
  if (!/^https?:\/\//.test(data.imageAUrl) || !/^https?:\/\//.test(data.imageBUrl) || !/^https?:\/\//.test(data.referenceVideoUrl)) {
    throw new Error('INVALID_ASSET_URL')
  }
  if (!data.prompt.trim() || data.prompt.length > 3072) throw new Error('INVALID_PROMPT')
  if (!HOTEL_LOBBY_GENERATION_CONFIG.durations.some(value => value === data.duration)) {
    throw new Error('INVALID_DURATION')
  }
  if (!HOTEL_LOBBY_GENERATION_CONFIG.resolutions.some(value => value === data.resolution)) {
    throw new Error('INVALID_RESOLUTION')
  }
  if (!HOTEL_LOBBY_GENERATION_CONFIG.aspectRatios.some(value => value === data.aspectRatio)) {
    throw new Error('INVALID_ASPECT_RATIO')
  }
  if (!HOTEL_LOBBY_GENERATION_CONFIG.capabilities.audio && data.generateAudio) {
    throw new Error('AUDIO_NOT_SUPPORTED')
  }
}

async function refundTaskIfNeeded(taskId: string, userId: string, reason: string) {
  const admin = getSupabaseAdminClient()
  const { data: task, error } = await admin.from('generation_tasks')
    .select('id,credits_used,credits_refunded')
    .eq('id', taskId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !task) return
  const used = Number(task.credits_used || 0)
  const refunded = Number(task.credits_refunded || 0)
  const amount = Math.max(0, used - refunded)
  if (amount <= 0) return

  try {
    await refundCredits({
      admin,
      userId,
      amount,
      taskId,
      meta: { failure_reason: reason },
    })
    await admin.from('generation_tasks').update({
      credits_refunded: used,
      updated_at: new Date().toISOString(),
    }).eq('id', taskId)
  } catch (error) {
    console.error('[credits] refund failed', { taskId, userId, reason, error })
  }
}

async function submitGenerationForUser(userId: string, data: CreateGenerationInput) {
  validateInput(data)

  // Media was uploaded and image-moderated when selected. Generation only
  // performs prompt moderation before billing/model invocation.
  await assertPromptAllowed({ prompt: data.prompt, userId })

  const credits = HOTEL_LOBBY_GENERATION_CONFIG.calculateCredits(data.duration, data.resolution)
  const isMock = mockEnabled()
  const admin = getSupabaseAdminClient()
  await reconcileYearlySubscriptionCredits(admin, userId)

  const { data: task, error } = await admin.from('generation_tasks').insert({
    user_id: userId,
    status: 'pending',
    image_a_url: data.imageAUrl,
    image_b_url: data.imageBUrl,
    image_a_asset_id: data.imageAAssetId ?? null,
    image_b_asset_id: data.imageBAssetId ?? null,
    reference_template_id: data.referenceTemplateId ?? null,
    reference_video_url: data.referenceVideoUrl,
    reference_video_asset_id: data.referenceVideoAssetId ?? null,
    prompt: data.prompt.trim(),
    duration_seconds: data.duration,
    resolution: data.resolution,
    aspect_ratio: data.aspectRatio,
    generate_audio: data.generateAudio,
    provider: isMock ? 'mock' : HOTEL_LOBBY_GENERATION_CONFIG.provider,
    model_id: isMock ? 'mock/reference-to-video' : HOTEL_LOBBY_GENERATION_CONFIG.model,
    provider_task_id: null,
    credits_used: credits,
    credits_refunded: 0,
  }).select('id,status').single()
  if (error || !task) throw new Error(error?.message || 'TASK_CREATE_FAILED')

  try {
    const debit = await deductCredits({
      admin,
      userId,
      amount: credits,
      taskId: task.id,
      meta: {
        duration: data.duration,
        resolution: data.resolution,
        model: isMock ? 'mock/reference-to-video' : HOTEL_LOBBY_GENERATION_CONFIG.model,
      },
    })

    if (isMock) {
      const now = new Date().toISOString()
      await admin.from('generation_tasks').update({
        status: 'processing',
        provider_task_id: `mock:${Date.now()}`,
        storage_status: 'pending',
        updated_at: now,
      }).eq('id', task.id)

      return {
        id: task.id,
        status: 'processing' as const,
        result_url: null,
        creditsUsed: credits,
        balance: debit.balance,
        duration_seconds: data.duration,
        resolution: data.resolution,
        aspect_ratio: data.aspectRatio,
        generate_audio: data.generateAudio,
        prompt: data.prompt.trim(),
      }
    }

    const upstream = await submitKieSeedanceVideo({
      model: HOTEL_LOBBY_GENERATION_CONFIG.model,
      imageUrls: [data.imageAUrl, data.imageBUrl],
      videoUrl: data.referenceVideoUrl,
      prompt: data.prompt.trim(),
      duration: data.duration,
      resolution: data.resolution,
      aspectRatio: data.aspectRatio,
      generateAudio: data.generateAudio,
      callBackUrl: kieCallbackUrl(),
    })
    await admin.from('generation_tasks').update({
      status: 'processing',
      provider_task_id: upstream.taskId,
      updated_at: new Date().toISOString(),
    }).eq('id', task.id)
    return {
        id: task.id,
        status: 'processing' as const,
        result_url: null,
        creditsUsed: credits,
        balance: debit.balance,
        duration_seconds: data.duration,
        resolution: data.resolution,
        aspect_ratio: data.aspectRatio,
        generate_audio: data.generateAudio,
        prompt: data.prompt.trim(),
      }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GENERATION_SUBMIT_FAILED'
    if (message === 'INSUFFICIENT_CREDITS') {
      await admin.from('generation_tasks').delete().eq('id', task.id)
      throw error
    }
    await admin.from('generation_tasks').update({
      status: 'failed',
      failure_message: message,
      failure_code: 'SUBMIT_FAILED',
      updated_at: new Date().toISOString(),
    }).eq('id', task.id)
    await refundTaskIfNeeded(task.id, userId, message)
    throw error
  }
}

export const createGeneration = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateGenerationInput) => input)
  .handler(async ({ data }) => {
    const user = await authUser()
    if (!data.imageAAssetId || !data.imageAAssetToken || !data.imageBAssetId || !data.imageBAssetToken) {
      throw new Error('REFERENCE_IMAGES_NOT_READY')
    }

    if (data.referenceTemplateId) {
      const template = HOTEL_LOBBY_GENERATION_CONFIG.templates.find(
        item => item.id === data.referenceTemplateId && item.duration === data.duration,
      )
      if (!template || template.sourceVideoUrl !== data.referenceVideoUrl) {
        throw new Error('REFERENCE_VIDEO_NOT_READY')
      }
    } else if (!data.referenceVideoAssetId || !data.referenceVideoAssetToken) {
      throw new Error('REFERENCE_VIDEO_NOT_READY')
    }

    await verifyPreparedAssets({
      userId: user.id,
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

    return submitGenerationForUser(user.id, data)
  })

export const retryGenerationTask = createServerFn({ method: 'POST' })
  .inputValidator((input: { taskId: string }) => input)
  .handler(async ({ data }) => {
    const user = await authUser()
    const admin = getSupabaseAdminClient()
    const { data: previous, error } = await admin.from('generation_tasks')
      .select('id,user_id,status,image_a_url,image_b_url,image_a_asset_id,image_b_asset_id,reference_template_id,reference_video_url,reference_video_asset_id,prompt,duration_seconds,resolution,aspect_ratio,generate_audio,generation_order_id')
      .eq('id', data.taskId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error || !previous) throw new Error('TASK_NOT_FOUND')
    if (previous.status !== 'failed') throw new Error('TASK_NOT_RETRYABLE')

    if (previous.generation_order_id) {
      return retryPaidGenerationOrderForUser(user.id, previous.id)
    }

    return submitGenerationForUser(user.id, {
      imageAAssetId: previous.image_a_asset_id,
      imageBAssetId: previous.image_b_asset_id,
      referenceVideoAssetId: previous.reference_video_asset_id,
      imageAUrl: previous.image_a_url,
      imageBUrl: previous.image_b_url,
      referenceTemplateId: previous.reference_template_id,
      referenceVideoUrl: previous.reference_video_url,
      prompt: previous.prompt,
      duration: previous.duration_seconds,
      resolution: previous.resolution as CreateGenerationInput['resolution'],
      aspectRatio: previous.aspect_ratio as CreateGenerationInput['aspectRatio'],
      generateAudio: Boolean(previous.generate_audio),
    })
  })

export const listGenerationTasks = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await authUser()
  const admin = getSupabaseAdminClient()
  const { data, error } = await admin.from('generation_tasks')
    .select('id,status,result_url,provider_result_url,storage_status,failure_message,created_at,provider_task_id,provider,credits_used,duration_seconds,resolution,aspect_ratio,generate_audio,prompt,generation_order_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)

  const tasks = (data || []) as GenerationTask[]
  const orderIds = Array.from(new Set(tasks.map(task => task.generation_order_id).filter(Boolean))) as string[]
  if (!orderIds.length) return tasks

  const { data: orders, error: orderError } = await admin.from('generation_orders')
    .select('id,status,amount_usd,refund_error,refund_ticket_id,latest_task_id')
    .eq('user_id', user.id)
    .in('id', orderIds)
  if (orderError) throw new Error(orderError.message)

  const orderMap = new Map((orders || []).map(order => [String(order.id), order]))
  return tasks
    .filter(task => {
      if (!task.generation_order_id) return true
      const order = orderMap.get(task.generation_order_id)
      return !order?.latest_task_id || String(order.latest_task_id) === task.id
    })
    .map(task => {
      const order = task.generation_order_id ? orderMap.get(task.generation_order_id) : null
      return {
        ...task,
        generation_order_status: order?.status || null,
        generation_price_usd: order ? Number(order.amount_usd) : null,
        refund_error: order?.refund_error || null,
        refund_ticket_id: order?.refund_ticket_id || null,
      } as GenerationTask
    })
    .slice(0, 20)
})

export const refreshGenerationTask = createServerFn({ method: 'POST' })
  .inputValidator((input: { taskId: string }) => input)
  .handler(async ({ data }) => {
    const user = await authUser()
    const admin = getSupabaseAdminClient()
    const { data: task, error } = await admin.from('generation_tasks')
      .select('id,user_id,status,provider,provider_task_id,result_url,provider_result_url,storage_status,failure_message,created_at,credits_used,duration_seconds,resolution,aspect_ratio,generate_audio,prompt,generation_order_id')
      .eq('id', data.taskId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error || !task) throw new Error('TASK_NOT_FOUND')
    if (!task.generation_order_id) return task as GenerationTask

    const { data: order, error: orderError } = await admin.from('generation_orders')
      .select('status,amount_usd,refund_error,refund_ticket_id')
      .eq('id', task.generation_order_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (orderError) throw new Error(orderError.message)

    return {
      ...task,
      generation_order_status: order?.status || null,
      generation_price_usd: order ? Number(order.amount_usd) : null,
      refund_error: order?.refund_error || null,
      refund_ticket_id: order?.refund_ticket_id || null,
    } as GenerationTask
  })
