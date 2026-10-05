import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { assertPromptAllowed } from '@/server/moderation'
import { deductCredits, refundCredits, reconcileYearlySubscriptionCredits } from '@/server/credits'
import { calculateGenerationCredits } from '@/config/generation-cost'
import { getKieTask, KIE_VIDEO_MODEL, submitKieSeedanceVideo } from '@/server/kie'
import { persistGeneratedVideo, verifyPreparedAssets } from '@/server/storage'
import { HOTEL_LOBBY_TEMPLATES } from '@/config/hotel-lobby'

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
  resolution: '480p' | '720p' | '1080p'
  aspectRatio: '16:9' | '9:16' | '1:1'
}

export type GenerationTask = {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result_url: string | null
  failure_message: string | null
  created_at: string
  provider_task_id: string | null
  provider?: string | null
  credits_used?: number
}

const mockEnabled = () => process.env.MOCK_GENERATION === 'true'
const mockResultUrl = () =>
  process.env.MOCK_RESULT_VIDEO_URL ||
  'https://cdn.clothmotion.app/templates/hotel-lobby-ai/preview/hotel-lobby-ai-1.mp4'

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
  if (![5, 10, 15, 20, 25, 30].includes(data.duration)) throw new Error('INVALID_DURATION')
  if (!['480p', '720p', '1080p'].includes(data.resolution)) throw new Error('INVALID_RESOLUTION')
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

  const credits = calculateGenerationCredits(data.duration, data.resolution)
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
    provider: isMock ? 'mock' : 'kie',
    model_id: isMock ? 'mock/reference-to-video' : KIE_VIDEO_MODEL,
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
        model: isMock ? 'mock/reference-to-video' : KIE_VIDEO_MODEL,
      },
    })

    if (isMock) {
      await admin.from('generation_tasks').update({
        status: 'processing',
        provider_task_id: `mock:${Date.now()}`,
        updated_at: new Date().toISOString(),
      }).eq('id', task.id)
      return { id: task.id, status: 'processing' as const, creditsUsed: credits, balance: debit.balance }
    }

    const upstream = await submitKieSeedanceVideo({
      imageUrls: [data.imageAUrl, data.imageBUrl],
      videoUrl: data.referenceVideoUrl,
      prompt: data.prompt.trim(),
      duration: data.duration,
      resolution: data.resolution,
      aspectRatio: data.aspectRatio,
    })
    await admin.from('generation_tasks').update({
      status: 'processing',
      provider_task_id: upstream.taskId,
      updated_at: new Date().toISOString(),
    }).eq('id', task.id)
    return { id: task.id, status: 'processing' as const, creditsUsed: credits, balance: debit.balance }
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
      const template = HOTEL_LOBBY_TEMPLATES.find(item => item.id === data.referenceTemplateId)
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
      .select('id,user_id,status,image_a_url,image_b_url,image_a_asset_id,image_b_asset_id,reference_template_id,reference_video_url,reference_video_asset_id,prompt,duration_seconds,resolution,aspect_ratio')
      .eq('id', data.taskId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error || !previous) throw new Error('TASK_NOT_FOUND')
    if (previous.status !== 'failed') throw new Error('TASK_NOT_RETRYABLE')

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
    })
  })

export const listGenerationTasks = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await authUser()
  const admin = getSupabaseAdminClient()
  const { data, error } = await admin.from('generation_tasks')
    .select('id,status,result_url,failure_message,created_at,provider_task_id,provider,credits_used')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(error.message)
  return (data || []) as GenerationTask[]
})

export const refreshGenerationTask = createServerFn({ method: 'POST' })
  .inputValidator((input: { taskId: string }) => input)
  .handler(async ({ data }) => {
    const user = await authUser()
    const admin = getSupabaseAdminClient()
    const { data: task, error } = await admin.from('generation_tasks')
      .select('id,user_id,status,provider,provider_task_id,result_url,failure_message,created_at,credits_used')
      .eq('id', data.taskId).eq('user_id', user.id).maybeSingle()
    if (error || !task) throw new Error('TASK_NOT_FOUND')
    if (task.status === 'completed' || task.status === 'failed') return task as GenerationTask

    if (task.provider === 'mock') {
      const startedAt = Number(task.provider_task_id?.split(':')[1] || Date.parse(task.created_at))
      if (Date.now() - startedAt < 4000) return task as GenerationTask

      const { data: updated, error: updateError } = await admin.from('generation_tasks').update({
        status: 'completed',
        result_url: mockResultUrl(),
        updated_at: new Date().toISOString(),
      }).eq('id', task.id)
        .select('id,status,result_url,failure_message,created_at,provider_task_id,provider,credits_used')
        .single()
      if (updateError || !updated) throw new Error(updateError?.message || 'MOCK_TASK_UPDATE_FAILED')
      return updated as GenerationTask
    }

    if (!task.provider_task_id) return task as GenerationTask

    const upstream = await getKieTask(task.provider_task_id)
    if (upstream.state === 'success' && upstream.resultUrl) {
      try {
        const persistedUrl = await persistGeneratedVideo({ taskId: task.id, sourceUrl: upstream.resultUrl })
        const { data: updated } = await admin.from('generation_tasks').update({
          status: 'completed',
          result_url: persistedUrl,
          updated_at: new Date().toISOString(),
        }).eq('id', task.id)
          .select('id,status,result_url,failure_message,created_at,provider_task_id,provider,credits_used')
          .single()
        return updated as GenerationTask
      } catch (error) {
        const message = error instanceof Error ? error.message : 'RESULT_PERSIST_FAILED'
        const { data: updated } = await admin.from('generation_tasks').update({
          status: 'failed',
          failure_message: message,
          failure_code: 'RESULT_PERSIST_FAILED',
          updated_at: new Date().toISOString(),
        }).eq('id', task.id)
          .select('id,status,result_url,failure_message,created_at,provider_task_id,provider,credits_used')
          .single()
        await refundTaskIfNeeded(task.id, user.id, message)
        return updated as GenerationTask
      }
    }

    if (upstream.state === 'fail') {
      const message = upstream.failMessage || 'Generation failed'
      const { data: updated } = await admin.from('generation_tasks').update({
        status: 'failed',
        failure_code: upstream.failCode || null,
        failure_message: message,
        updated_at: new Date().toISOString(),
      }).eq('id', task.id)
        .select('id,status,result_url,failure_message,created_at,provider_task_id,provider,credits_used')
        .single()
      await refundTaskIfNeeded(task.id, user.id, message)
      return updated as GenerationTask
    }

    return task as GenerationTask
  })
