import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { refundCredits } from '@/server/credits'
import { getKieTask } from '@/server/kie'
import { persistGeneratedVideo } from '@/server/storage'
import { mediaUrl } from '@/config/site'

export type GenerationWorkerBindings = {
  AI_MEDIA_BUCKET: R2Bucket
}

type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed'
type StorageStatus = 'pending' | 'persisted' | 'fallback'

type GenerationTaskRow = {
  id: string
  user_id: string
  status: TaskStatus
  provider: string | null
  provider_task_id: string | null
  result_url: string | null
  provider_result_url: string | null
  storage_status: StorageStatus
  storage_attempts: number
  storage_last_error: string | null
  storage_updated_at: string | null
  failure_message: string | null
  created_at: string
  updated_at: string
  credits_used: number | null
  credits_refunded: number | null
  duration_seconds: number | null
  resolution: string | null
  aspect_ratio: string | null
  generate_audio: boolean | null
  prompt: string | null
  generation_order_id: string | null
}

const TASK_SELECT = [
  'id',
  'user_id',
  'status',
  'provider',
  'provider_task_id',
  'result_url',
  'provider_result_url',
  'storage_status',
  'storage_attempts',
  'storage_last_error',
  'storage_updated_at',
  'failure_message',
  'created_at',
  'updated_at',
  'credits_used',
  'credits_refunded',
  'duration_seconds',
  'resolution',
  'aspect_ratio',
  'generate_audio',
  'prompt',
  'generation_order_id',
].join(',')

const mockResultUrl = () =>
  process.env.MOCK_RESULT_VIDEO_URL ||
  mediaUrl('/demo/5/hotel-lobby-ai-480p-5.mp4')

async function readTask(taskId: string): Promise<GenerationTaskRow | null> {
  const admin = getSupabaseAdminClient()
  const { data, error } = await admin
    .from('generation_tasks')
    .select(TASK_SELECT)
    .eq('id', taskId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as GenerationTaskRow | null
}

async function refundTaskIfNeeded(taskId: string, userId: string, reason: string) {
  const admin = getSupabaseAdminClient()
  const { data: task, error } = await admin
    .from('generation_tasks')
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

    await admin
      .from('generation_tasks')
      .update({
        credits_refunded: used,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('user_id', userId)
  } catch (error) {
    console.error('[generation] refund failed', { taskId, userId, reason, error })
  }
}

async function persistCompletedTask(
  task: GenerationTaskRow,
  bindings: GenerationWorkerBindings,
): Promise<GenerationTaskRow> {
  if (task.storage_status === 'persisted') return task

  const sourceUrl = task.provider_result_url || task.result_url
  if (!sourceUrl) return task

  const admin = getSupabaseAdminClient()
  const attemptedAt = new Date().toISOString()
  const attempts = Number(task.storage_attempts || 0) + 1

  try {
    const persistedUrl = await persistGeneratedVideo({
      taskId: task.id,
      sourceUrl,
      bucket: bindings.AI_MEDIA_BUCKET,
    })

    const { data, error } = await admin
      .from('generation_tasks')
      .update({
        result_url: persistedUrl,
        storage_status: 'persisted',
        storage_attempts: attempts,
        storage_last_error: null,
        storage_updated_at: attemptedAt,
        updated_at: attemptedAt,
      })
      .eq('id', task.id)
      .eq('status', 'completed')
      .neq('storage_status', 'persisted')
      .select(TASK_SELECT)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return (data as GenerationTaskRow | null) || (await readTask(task.id)) || task
  } catch (error) {
    const message = error instanceof Error ? error.message : 'RESULT_PERSIST_FAILED'
    const logPayload = { taskId: task.id, attempts, message }
    if (attempts >= 5) {
      console.error('[generation] repeated result persistence failure', logPayload)
    } else {
      console.warn('[generation] result persistence fallback', logPayload)
    }

    const fallbackUrl = task.provider_result_url || task.result_url
    const { data, error: updateError } = await admin
      .from('generation_tasks')
      .update({
        result_url: fallbackUrl,
        storage_status: 'fallback',
        storage_attempts: attempts,
        storage_last_error: message,
        storage_updated_at: attemptedAt,
        updated_at: attemptedAt,
      })
      .eq('id', task.id)
      .eq('status', 'completed')
      .neq('storage_status', 'persisted')
      .select(TASK_SELECT)
      .maybeSingle()

    if (updateError) throw new Error(updateError.message)
    return (data as GenerationTaskRow | null) || (await readTask(task.id)) || task
  }
}

async function completeProviderTask(
  task: GenerationTaskRow,
  sourceUrl: string,
  bindings: GenerationWorkerBindings,
) {
  const admin = getSupabaseAdminClient()
  const now = new Date().toISOString()

  const { data, error } = await admin
    .from('generation_tasks')
    .update({
      status: 'completed',
      provider_result_url: sourceUrl,
      result_url: sourceUrl,
      storage_status: 'pending',
      storage_last_error: null,
      storage_updated_at: now,
      failure_code: null,
      failure_message: null,
      updated_at: now,
    })
    .eq('id', task.id)
    .eq('user_id', task.user_id)
    .in('status', ['pending', 'processing'])
    .select(TASK_SELECT)
    .maybeSingle()

  if (error) throw new Error(error.message)

  const completed =
    (data as GenerationTaskRow | null) ||
    (await readTask(task.id))

  if (!completed) throw new Error('TASK_NOT_FOUND')
  if (completed.status !== 'completed') return completed

  if (completed.generation_order_id) {
    const { error: orderError } = await admin.from('generation_orders').update({
      status: 'fulfilled',
      fulfilled_at: now,
      updated_at: now,
    })
      .eq('id', completed.generation_order_id)
      .eq('user_id', completed.user_id)
      .eq('status', 'processing')
      .eq('latest_task_id', completed.id)

    if (orderError) throw new Error(orderError.message)
  }

  return persistCompletedTask(completed, bindings)
}

async function failProviderTask(
  task: GenerationTaskRow,
  failureCode: string | null,
  failureMessage: string,
) {
  const admin = getSupabaseAdminClient()
  const now = new Date().toISOString()

  const { data, error } = await admin
    .from('generation_tasks')
    .update({
      status: 'failed',
      failure_code: failureCode,
      failure_message: failureMessage,
      updated_at: now,
    })
    .eq('id', task.id)
    .eq('user_id', task.user_id)
    .in('status', ['pending', 'processing'])
    .select('id')
    .maybeSingle()

  if (error) throw new Error(error.message)

  if (data?.id) {
    if (task.generation_order_id) {
      const { error: orderError } = await admin.from('generation_orders').update({
        status: 'failed',
        updated_at: now,
      })
        .eq('id', task.generation_order_id)
        .eq('user_id', task.user_id)
        .eq('status', 'processing')
        .eq('latest_task_id', task.id)

      if (orderError) throw new Error(orderError.message)
    } else {
      await refundTaskIfNeeded(task.id, task.user_id, failureMessage)
    }
  }

  return (await readTask(task.id)) || task
}

async function completeMockTask(
  task: GenerationTaskRow,
  bindings: GenerationWorkerBindings,
) {
  const startedAt = Number(task.provider_task_id?.split(':')[1] || Date.parse(task.created_at))
  if (Date.now() - startedAt < 4000) return task
  return completeProviderTask(task, mockResultUrl(), bindings)
}

export async function processGenerationTask(
  taskId: string,
  bindings: GenerationWorkerBindings,
): Promise<GenerationTaskRow | null> {
  const task = await readTask(taskId)
  if (!task) return null

  if (task.status === 'failed') return task

  if (task.status === 'completed') {
    if (task.storage_status === 'persisted') return task
    return persistCompletedTask(task, bindings)
  }

  if (task.provider === 'mock') {
    return completeMockTask(task, bindings)
  }

  if (task.provider !== 'kie' || !task.provider_task_id) return task

  const upstream = await getKieTask(task.provider_task_id)

  if (upstream.state === 'success' && upstream.resultUrl) {
    return completeProviderTask(task, upstream.resultUrl, bindings)
  }

  if (upstream.state === 'fail') {
    return failProviderTask(
      task,
      upstream.failCode || null,
      upstream.failMessage || 'Generation failed',
    )
  }

  return task
}

export async function processGenerationByProviderTaskId(
  providerTaskId: string,
  bindings: GenerationWorkerBindings,
) {
  const admin = getSupabaseAdminClient()
  const { data, error } = await admin
    .from('generation_tasks')
    .select('id')
    .eq('provider', 'kie')
    .eq('provider_task_id', providerTaskId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data?.id) return null
  return processGenerationTask(String(data.id), bindings)
}

export async function reconcileGenerationTasks(bindings: GenerationWorkerBindings) {
  const admin = getSupabaseAdminClient()
  const staleCutoff = new Date(Date.now() - 60_000).toISOString()
  const unboundCutoff = new Date(Date.now() - 5 * 60_000).toISOString()

  const [
    { data: active, error: activeError },
    { data: unbound, error: unboundError },
    { data: fallback, error: fallbackError },
  ] = await Promise.all([
    admin
      .from('generation_tasks')
      .select('id')
      .in('status', ['pending', 'processing'])
      .not('provider_task_id', 'is', null)
      .lt('updated_at', staleCutoff)
      .order('updated_at', { ascending: true })
      .limit(20),
    admin
      .from('generation_tasks')
      .select('id')
      .eq('status', 'pending')
      .is('provider_task_id', null)
      .lt('updated_at', unboundCutoff)
      .order('updated_at', { ascending: true })
      .limit(20),
    admin
      .from('generation_tasks')
      .select('id')
      .eq('status', 'completed')
      .in('storage_status', ['pending', 'fallback'])
      .not('provider_result_url', 'is', null)
      .order('storage_updated_at', { ascending: true, nullsFirst: true })
      .limit(20),
  ])

  if (activeError) throw new Error(activeError.message)
  if (unboundError) throw new Error(unboundError.message)
  if (fallbackError) throw new Error(fallbackError.message)

  const unboundResults = await Promise.allSettled(
    (unbound || []).map(async row => {
      const task = await readTask(String(row.id))
      if (!task || task.status !== 'pending' || task.provider_task_id) return task
      return failProviderTask(task, 'PROVIDER_TASK_NOT_BOUND', 'Generation could not be started')
    }),
  )

  unboundResults.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error('[generation] stale unbound recovery failed', {
        taskId: String((unbound || [])[index]?.id || ''),
        error: result.reason,
      })
    }
  })

  const ids = Array.from(
    new Set([
      ...(active || []).map(row => String(row.id)),
      ...(fallback || []).map(row => String(row.id)),
    ]),
  )

  const results = await Promise.allSettled(
    ids.map(id => processGenerationTask(id, bindings)),
  )

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error('[generation] cron reconcile failed', {
        taskId: ids[index],
        error: result.reason,
      })
    }
  })

  return {
    scanned: ids.length + (unbound || []).length,
    unboundScanned: (unbound || []).length,
    failed: results.filter(result => result.status === 'rejected').length +
      unboundResults.filter(result => result.status === 'rejected').length,
  }
}
