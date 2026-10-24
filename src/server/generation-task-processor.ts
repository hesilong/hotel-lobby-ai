import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { refundCredits } from '@/server/credits'
import { getKieTask } from '@/providers/kie'
import {
  cloudConvertAudioConfigured,
  createCloudConvertAudioJob,
  getCloudConvertAudioJob,
} from '@/providers/cloudconvert'
import { persistGeneratedVideo } from '@/server/storage'
import { mediaUrl } from '@/config/site'
import { reconcileGenerationPurchaseOrders } from '@/server/generation-purchases'
import {
  maybeSendGenerationReadyNotification,
  reconcileGenerationNotifications,
} from '@/server/generation-notifications'

export type GenerationWorkerBindings = {
  AI_MEDIA_BUCKET: R2Bucket
}

type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed'
type StorageStatus = 'pending' | 'persisted' | 'fallback'
type AudioStatus = 'not_requested' | 'pending' | 'processing' | 'mixed' | 'fallback'

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
  audio_status: AudioStatus
  audio_job_id: string | null
  audio_result_url: string | null
  audio_attempts: number
  audio_last_error: string | null
  audio_updated_at: string | null
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

const AUDIO_CREATE_LEASE_MS = 5 * 60_000
const MAX_STORAGE_ATTEMPTS = 5
const cloudConvertAudioEnabled = () =>
  process.env.CLOUDCONVERT_AUDIO_ENABLED?.trim().toLowerCase() !== 'false'

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
  'audio_status',
  'audio_job_id',
  'audio_result_url',
  'audio_attempts',
  'audio_last_error',
  'audio_updated_at',
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

async function syncPaidOrderTerminalState(task: GenerationTaskRow) {
  if (!task.generation_order_id || (task.status !== 'completed' && task.status !== 'failed')) return

  const now = new Date().toISOString()
  const update = task.status === 'completed'
    ? {
        status: 'fulfilled',
        fulfilled_at: now,
        updated_at: now,
      }
    : {
        status: 'failed',
        updated_at: now,
      }

  const { error } = await getSupabaseAdminClient()
    .from('generation_orders')
    .update(update)
    .eq('id', task.generation_order_id)
    .eq('user_id', task.user_id)
    .eq('status', 'processing')
    .eq('latest_task_id', task.id)

  if (error) throw new Error(error.message)
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
  if (
    task.storage_status === 'fallback' &&
    Number(task.storage_attempts || 0) >= MAX_STORAGE_ATTEMPTS
  ) return task
  if (task.audio_status === 'pending' || task.audio_status === 'processing') return task

  const sourceUrl =
    task.audio_status === 'mixed' && task.audio_result_url
      ? task.audio_result_url
      : task.provider_result_url || task.result_url
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
        audio_result_url: task.audio_status === 'mixed' ? null : task.audio_result_url,
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
    const storageExhausted = attempts >= MAX_STORAGE_ATTEMPTS
    const logPayload = { taskId: task.id, attempts, message }
    if (storageExhausted) {
      console.error('[generation] result persistence exhausted; using provider fallback', logPayload)
    } else {
      console.warn('[generation] result persistence retry scheduled', logPayload)
    }

    const providerFallbackUrl = task.provider_result_url || task.result_url
    const mixedAudioSource =
      task.audio_status === 'mixed' &&
      Boolean(task.audio_result_url) &&
      task.audio_result_url === sourceUrl
    const exportUnavailable =
      mixedAudioSource &&
      /^RESULT_DOWNLOAD_FAILED_(401|403|404|410)$/.test(message)
    const audioRecovery =
      mixedAudioSource && (exportUnavailable || storageExhausted)
        ? {
            // Never expose a CloudConvert export URL as the user-facing result.
            // If the export is already unavailable, switch future persistence
            // attempts to the provider video. If storage retries are exhausted,
            // the provider video becomes the final user-facing fallback.
            audio_status: 'fallback' as const,
            audio_result_url: null,
            audio_last_error: message,
            audio_updated_at: attemptedAt,
          }
        : {}

    const { data, error: updateError } = await admin
      .from('generation_tasks')
      .update({
        // Keep the provider result as the only fallback URL visible to clients.
        // While retries remain, storage_status stays pending so the UI keeps
        // showing Generating instead of exposing a partial delivery.
        result_url: providerFallbackUrl,
        storage_status: storageExhausted ? 'fallback' : 'pending',
        storage_attempts: attempts,
        storage_last_error: message,
        storage_updated_at: attemptedAt,
        ...audioRecovery,
        updated_at: attemptedAt,
      })
      .eq('id', task.id)
      .eq('status', 'completed')
      .neq('storage_status', 'persisted')
      .select(TASK_SELECT)
      .maybeSingle()

    if (updateError) throw new Error(updateError.message)

    if (exportUnavailable) {
      console.warn('[generation] CloudConvert export unavailable; retrying persistence from provider video', {
        taskId: task.id,
        cloudConvertJobId: task.audio_job_id,
      })
    }

    return (data as GenerationTaskRow | null) || (await readTask(task.id)) || task
  }
}

async function markAudioNotRequested(
  task: GenerationTaskRow,
): Promise<GenerationTaskRow> {
  if (!task.generate_audio && task.audio_status === 'not_requested') return task

  const admin = getSupabaseAdminClient()
  const now = new Date().toISOString()

  const { data, error } = await admin
    .from('generation_tasks')
    .update({
      generate_audio: false,
      audio_status: 'not_requested',
      audio_job_id: null,
      audio_result_url: null,
      audio_last_error: null,
      audio_updated_at: now,
      updated_at: now,
    })
    .eq('id', task.id)
    .eq('status', 'completed')
    .select(TASK_SELECT)
    .maybeSingle()

  if (error) throw new Error(error.message)
  console.info('[generation] soundtrack disabled; using provider video', {
    taskId: task.id,
  })
  return (data as GenerationTaskRow | null) || (await readTask(task.id)) || task
}

async function markAudioFallback(
  task: GenerationTaskRow,
  message: string,
): Promise<GenerationTaskRow> {
  const admin = getSupabaseAdminClient()
  const now = new Date().toISOString()
  const fallbackUrl = task.provider_result_url || task.result_url

  const { data, error } = await admin
    .from('generation_tasks')
    .update({
      audio_status: 'fallback',
      audio_job_id: null,
      audio_result_url: null,
      audio_attempts: Number(task.audio_attempts || 0),
      audio_last_error: message,
      audio_updated_at: now,
      result_url: fallbackUrl,
      updated_at: now,
    })
    .eq('id', task.id)
    .eq('status', 'completed')
    .select(TASK_SELECT)
    .maybeSingle()

  if (error) throw new Error(error.message)
  console.warn('[generation] soundtrack fallback', { taskId: task.id, message })
  return (data as GenerationTaskRow | null) || (await readTask(task.id)) || task
}

async function recordAudioAttemptFailure(
  task: GenerationTaskRow,
  attempts: number,
  message: string,
): Promise<GenerationTaskRow> {
  if (
    attempts >= 3 ||
    message === 'CLOUDCONVERT_API_KEY_MISSING' ||
    message === 'CLOUDCONVERT_SOUNDTRACK_URL_MISSING' ||
    message === 'CLOUDCONVERT_SOUNDTRACK_URL_INVALID'
  ) {
    return markAudioFallback({ ...task, audio_attempts: attempts }, message)
  }

  const admin = getSupabaseAdminClient()
  const now = new Date().toISOString()
  const { data, error } = await admin
    .from('generation_tasks')
    .update({
      audio_status: 'pending',
      audio_job_id: null,
      audio_result_url: null,
      audio_attempts: attempts,
      audio_last_error: message,
      audio_updated_at: now,
      updated_at: now,
    })
    .eq('id', task.id)
    .eq('status', 'completed')
    .select(TASK_SELECT)
    .maybeSingle()

  if (error) throw new Error(error.message)
  console.warn('[generation] soundtrack attempt failed; queued for retry', {
    taskId: task.id,
    attempts,
    message,
  })
  return (data as GenerationTaskRow | null) || (await readTask(task.id)) || task
}

async function claimAudioJobCreation(
  task: GenerationTaskRow,
): Promise<GenerationTaskRow | null> {
  if (task.audio_job_id) return task

  const admin = getSupabaseAdminClient()
  const now = new Date()
  const nowIso = now.toISOString()
  const attempts = Number(task.audio_attempts || 0) + 1

  let query = admin
    .from('generation_tasks')
    .update({
      audio_status: 'processing',
      audio_attempts: attempts,
      audio_last_error: null,
      audio_updated_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', task.id)
    .eq('status', 'completed')
    .is('audio_job_id', null)

  if (task.audio_status === 'pending') {
    query = query.eq('audio_status', 'pending')
  } else if (task.audio_status === 'processing') {
    const updatedAt = task.audio_updated_at
      ? Date.parse(task.audio_updated_at)
      : 0

    if (
      Number.isFinite(updatedAt) &&
      updatedAt > 0 &&
      Date.now() - updatedAt < AUDIO_CREATE_LEASE_MS
    ) {
      return null
    }

    query = query.eq('audio_status', 'processing')

    if (Number.isFinite(updatedAt) && updatedAt > 0) {
      query = query.lt(
        'audio_updated_at',
        new Date(now.getTime() - AUDIO_CREATE_LEASE_MS).toISOString(),
      )
    }
  } else {
    return null
  }

  const { data, error } = await query
    .select(TASK_SELECT)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as GenerationTaskRow | null
}

async function mixCompletedTaskAudio(
  task: GenerationTaskRow,
): Promise<GenerationTaskRow> {
  if (!cloudConvertAudioEnabled()) return markAudioNotRequested(task)
  if (!task.generate_audio) return task
  if (task.audio_status === 'mixed' || task.audio_status === 'fallback') return task

  // Compatibility with tasks already re-queued by the previous implementation:
  // an expired CloudConvert export URL must never trigger another paid mix.
  if (
    !task.audio_job_id &&
    /^RESULT_DOWNLOAD_FAILED_(401|403|404|410)$/.test(task.audio_last_error || '')
  ) {
    return markAudioFallback(task, task.audio_last_error || 'CLOUDCONVERT_EXPORT_UNAVAILABLE')
  }

  const sourceUrl = task.provider_result_url || task.result_url
  if (!sourceUrl) return task

  if (!cloudConvertAudioConfigured()) {
    return markAudioFallback(task, 'CLOUDCONVERT_NOT_CONFIGURED')
  }

  const admin = getSupabaseAdminClient()
  let current = task

  if (!current.audio_job_id) {
    const claimed = await claimAudioJobCreation(current)

    // Another browser poll / callback / Cron worker already owns the creation
    // lease. Do not create a second CloudConvert job.
    if (!claimed) {
      return (await readTask(current.id)) || current
    }

    current = claimed
    const attempts = Number(current.audio_attempts || 0)

    try {
      const job = await createCloudConvertAudioJob({
        taskId: current.id,
        videoUrl: sourceUrl,
      })
      const now = new Date().toISOString()

      const { data, error } = await admin
        .from('generation_tasks')
        .update({
          audio_job_id: job.id,
          audio_last_error: null,
          audio_updated_at: now,
          updated_at: now,
        })
        .eq('id', current.id)
        .eq('status', 'completed')
        .eq('audio_status', 'processing')
        .eq('audio_attempts', attempts)
        .is('audio_job_id', null)
        .select(TASK_SELECT)
        .maybeSingle()

      if (error) throw new Error(error.message)

      if (!data) {
        console.warn('[generation] soundtrack job created after lease was lost', {
          taskId: current.id,
          cloudConvertJobId: job.id,
          attempts,
        })
        return (await readTask(current.id)) || current
      }

      current = (await readTask(current.id)) || current

      // Do not block this request waiting for CloudConvert. The browser poll,
      // KIE callback recovery, or Cron will pick up the processing job.
      return current
    } catch (error) {
      const message = error instanceof Error ? error.message : 'CLOUDCONVERT_CREATE_FAILED'
      return recordAudioAttemptFailure(current, attempts, message)
    }
  }

  if (!current.audio_job_id) return current

  try {
    const job = await getCloudConvertAudioJob(current.audio_job_id)

    if (job.status === 'waiting' || job.status === 'processing') return current

    if (job.status === 'error' || !job.resultUrl) {
      return recordAudioAttemptFailure(
        current,
        Number(current.audio_attempts || 1),
        job.error || 'CLOUDCONVERT_RESULT_MISSING',
      )
    }

    const now = new Date().toISOString()
    const { data, error } = await admin
      .from('generation_tasks')
      .update({
        audio_status: 'mixed',
        audio_result_url: job.resultUrl,
        audio_last_error: null,
        audio_updated_at: now,
        updated_at: now,
      })
      .eq('id', current.id)
      .eq('status', 'completed')
      .eq('audio_status', 'processing')
      .eq('audio_job_id', current.audio_job_id)
      .select(TASK_SELECT)
      .maybeSingle()

    if (error) throw new Error(error.message)
    console.info('[generation] soundtrack mixed', {
      taskId: current.id,
      cloudConvertJobId: current.audio_job_id,
    })
    return (data as GenerationTaskRow | null) || (await readTask(current.id)) || current
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CLOUDCONVERT_STATUS_FAILED'
    const now = new Date().toISOString()
    const { data, error: updateError } = await admin
      .from('generation_tasks')
      .update({
        audio_last_error: message,
        audio_updated_at: now,
        updated_at: now,
      })
      .eq('id', current.id)
      .eq('status', 'completed')
      .select(TASK_SELECT)
      .maybeSingle()

    if (updateError) throw new Error(updateError.message)
    console.warn('[generation] soundtrack status check failed; will retry', {
      taskId: current.id,
      cloudConvertJobId: current.audio_job_id,
      message,
    })
    return (data as GenerationTaskRow | null) || current
  }
}

async function finalizeCompletedTask(
  task: GenerationTaskRow,
  bindings: GenerationWorkerBindings,
) {
  let deliverable = task
  const wasSoundtrackPending =
    task.generate_audio &&
    (task.audio_status === 'pending' || task.audio_status === 'processing')

  if (wasSoundtrackPending) {
    deliverable = await mixCompletedTaskAudio(task)
  }

  if (
    deliverable.audio_status === 'pending' ||
    deliverable.audio_status === 'processing'
  ) {
    return deliverable
  }

  // When CloudConvert just moved the task to mixed, return immediately so the
  // browser can observe that state. R2 persistence happens on the next
  // lifecycle tick instead of keeping the same request open.
  if (wasSoundtrackPending && deliverable.audio_status === 'mixed') {
    return deliverable
  }

  const persisted = await persistCompletedTask(deliverable, bindings)

  if (persisted.storage_status === 'persisted') {
    await maybeSendGenerationReadyNotification(persisted)
  }

  return persisted
}

async function completeProviderTask(
  task: GenerationTaskRow,
  sourceUrl: string,
  bindings: GenerationWorkerBindings,
) {
  const admin = getSupabaseAdminClient()
  const now = new Date().toISOString()
  const shouldGenerateAudio = Boolean(task.generate_audio && cloudConvertAudioEnabled())

  const { data, error } = await admin
    .from('generation_tasks')
    .update({
      status: 'completed',
      provider_result_url: sourceUrl,
      result_url: sourceUrl,
      storage_status: 'pending',
      storage_last_error: null,
      storage_updated_at: now,
      generate_audio: shouldGenerateAudio,
      audio_status: shouldGenerateAudio ? 'pending' : 'not_requested',
      audio_job_id: null,
      audio_result_url: null,
      audio_attempts: 0,
      audio_last_error: null,
      audio_updated_at: now,
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

  return finalizeCompletedTask(completed, bindings)
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

  if (task.status === 'failed') {
    await syncPaidOrderTerminalState(task)
    return task
  }

  if (task.status === 'completed') {
    await syncPaidOrderTerminalState(task)
    if (
      task.storage_status === 'persisted' &&
      task.audio_status !== 'pending' &&
      task.audio_status !== 'processing'
    ) {
      await maybeSendGenerationReadyNotification(task)
      return task
    }
    return finalizeCompletedTask(task, bindings)
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
      .lt('storage_attempts', MAX_STORAGE_ATTEMPTS)
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

  const purchaseRecovery = await reconcileGenerationPurchaseOrders()
  const notificationRecovery = await reconcileGenerationNotifications()

  return {
    scanned:
      ids.length +
      (unbound || []).length +
      purchaseRecovery.paidScanned +
      purchaseRecovery.orphanedProcessing +
      notificationRecovery.scanned,
    unboundScanned: (unbound || []).length,
    paidOrdersScanned: purchaseRecovery.paidScanned,
    notificationsScanned: notificationRecovery.scanned,
    notificationsSent: notificationRecovery.sent,
    failed: results.filter(result => result.status === 'rejected').length +
      unboundResults.filter(result => result.status === 'rejected').length +
      purchaseRecovery.failed,
  }
}
