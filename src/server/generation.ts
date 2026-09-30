import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '@/lib/supabase/server'

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

export const createGeneration = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateGenerationInput) => input)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) throw new Error('AUTH_REQUIRED')

    const { data: task, error } = await supabase.from('generation_tasks').insert({
      user_id: auth.user.id,
      status: 'pending',
      image_a_url: data.imageAUrl,
      image_b_url: data.imageBUrl,
      reference_template_id: data.referenceTemplateId ?? null,
      reference_video_url: data.referenceVideoUrl,
      prompt: data.prompt,
      duration_seconds: data.duration,
      resolution: data.resolution,
      aspect_ratio: data.aspectRatio,
      provider: 'kie',
      model_id: 'kling-3.0-omni/reference-to-video',
    }).select('id,status').single()

    if (error) throw new Error(error.message)
    return task
  })
