import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { assertReferenceImagesAllowed } from '@/server/moderation'
import { getKieTask, submitKieReferenceVideo } from '@/server/kie'
import { persistGeneratedVideo } from '@/server/storage'

export type CreateGenerationInput = {
  imageAUrl: string
  imageBUrl: string
  referenceTemplateId?: string | null
  referenceVideoUrl: string
  prompt: string
  duration: number
  resolution: '720p' | '1080p' | '4k'
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

export const createGeneration = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateGenerationInput) => input)
  .handler(async ({ data }) => {
    const user = await authUser()
    if (!/^https?:\/\//.test(data.imageAUrl) || !/^https?:\/\//.test(data.imageBUrl) || !/^https?:\/\//.test(data.referenceVideoUrl)) {
      throw new Error('INVALID_ASSET_URL')
    }
    if (!data.prompt.trim() || data.prompt.length > 3072) throw new Error('INVALID_PROMPT')
    if (data.duration < 3 || data.duration > 15) throw new Error('INVALID_DURATION')

    await assertReferenceImagesAllowed([data.imageAUrl, data.imageBUrl])

    const isMock = mockEnabled()
    const admin = getSupabaseAdminClient()
    const { data: task, error } = await admin.from('generation_tasks').insert({
      user_id: user.id,
      status: isMock ? 'processing' : 'pending',
      image_a_url: data.imageAUrl,
      image_b_url: data.imageBUrl,
      reference_template_id: data.referenceTemplateId ?? null,
      reference_video_url: data.referenceVideoUrl,
      prompt: data.prompt.trim(),
      duration_seconds: data.duration,
      resolution: data.resolution,
      aspect_ratio: data.aspectRatio,
      provider: isMock ? 'mock' : 'kie',
      model_id: isMock ? 'mock/reference-to-video' : 'kling-3.0-omni/reference-to-video',
      provider_task_id: isMock ? `mock:${Date.now()}` : null,
    }).select('id,status').single()
    if (error || !task) throw new Error(error?.message || 'TASK_CREATE_FAILED')

    if (isMock) {
      return { id: task.id, status: 'processing' as const }
    }

    try {
      const upstream = await submitKieReferenceVideo({
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
      return { id: task.id, status: 'processing' as const }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'GENERATION_SUBMIT_FAILED'
      await admin.from('generation_tasks').update({
        status: 'failed',
        failure_message: message,
        updated_at: new Date().toISOString(),
      }).eq('id', task.id)
      throw error
    }
  })

export const listGenerationTasks = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await authUser()
  const admin = getSupabaseAdminClient()
  const { data, error } = await admin.from('generation_tasks')
    .select('id,status,result_url,failure_message,created_at,provider_task_id,provider')
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
      .select('id,user_id,status,provider,provider_task_id,result_url,failure_message,created_at')
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
        .select('id,status,result_url,failure_message,created_at,provider_task_id,provider')
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
          status: 'completed', result_url: persistedUrl, updated_at: new Date().toISOString(),
        }).eq('id', task.id).select('id,status,result_url,failure_message,created_at,provider_task_id,provider').single()
        return updated as GenerationTask
      } catch (error) {
        const message = error instanceof Error ? error.message : 'RESULT_PERSIST_FAILED'
        const { data: updated } = await admin.from('generation_tasks').update({
          status: 'failed', failure_message: message, updated_at: new Date().toISOString(),
        }).eq('id', task.id).select('id,status,result_url,failure_message,created_at,provider_task_id,provider').single()
        return updated as GenerationTask
      }
    }
    if (upstream.state === 'fail') {
      const { data: updated } = await admin.from('generation_tasks').update({
        status: 'failed',
        failure_code: upstream.failCode || null,
        failure_message: upstream.failMessage || 'Generation failed',
        updated_at: new Date().toISOString(),
      }).eq('id', task.id).select('id,status,result_url,failure_message,created_at,provider_task_id,provider').single()
      return updated as GenerationTask
    }
    return task as GenerationTask
  })
