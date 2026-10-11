import handler from '@tanstack/react-start/server-entry'
import {
  processGenerationByProviderTaskId,
  processGenerationTask,
  reconcileGenerationTasks,
  type GenerationWorkerBindings,
} from './server/generation-task-processor'
import { retryWaffoEvents } from './server/waffo-webhooks'

type JsonObject = Record<string, unknown>
type WorkerEnv = GenerationWorkerBindings

const toObject = (value: unknown): JsonObject =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonObject
    : {}

const readString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined

function callbackProviderTaskId(payload: unknown) {
  const root = toObject(payload)
  const data = toObject(root.data)
  return (
    readString(root.taskId) ||
    readString(root.task_id) ||
    readString(data.taskId) ||
    readString(data.task_id)
  )
}

async function handleKieCallback(
  request: Request,
  workerEnv: WorkerEnv,
  ctx: ExecutionContext,
) {
  const payload = await request.json().catch(() => null)
  const providerTaskId = callbackProviderTaskId(payload)
  if (!providerTaskId) {
    return Response.json({ ok: false, error: 'TASK_ID_MISSING' }, { status: 400 })
  }

  ctx.waitUntil(
    processGenerationByProviderTaskId(providerTaskId, workerEnv)
      .then(result => {
        console.info('[generation] KIE callback processed', {
          providerTaskId,
          taskId: result?.id || null,
          status: result?.status || null,
          storageStatus: result?.storage_status || null,
        })
      })
      .catch(error => {
        console.error('[generation] KIE callback processing failed', {
          providerTaskId,
          error,
        })
      }),
  )

  return Response.json({ ok: true }, { status: 200 })
}

export default {
  async fetch(request: Request, workerEnv: WorkerEnv, ctx: ExecutionContext) {
    const url = new URL(request.url)

    if (
      request.method === 'POST' &&
      process.env.NODE_ENV !== 'production' &&
      process.env.MOCK_GENERATION === 'true'
    ) {
      const match = url.pathname.match(/^\/api\/dev\/mock-generation\/([^/]+)\/process$/)
      if (match) {
        const taskId = decodeURIComponent(match[1])
        try {
          const result = await processGenerationTask(taskId, workerEnv)
          if (!result || result.provider !== 'mock') {
            return Response.json({ ok: false, error: 'MOCK_TASK_NOT_FOUND' }, { status: 404 })
          }
          return Response.json({
            ok: true,
            taskId: result.id,
            status: result.status,
            audioStatus: result.audio_status,
            storageStatus: result.storage_status,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'MOCK_PROCESS_FAILED'
          console.error('[generation] local mock processing failed', { taskId, message })
          return Response.json({ ok: false, error: message }, { status: 500 })
        }
      }
    }

    if (request.method === 'POST' && url.pathname === '/api/kie/callback') {
      return handleKieCallback(request, workerEnv, ctx)
    }
    return handler.fetch(request)
  },

  async scheduled(
    _event: ScheduledController,
    workerEnv: WorkerEnv,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(
      Promise.allSettled([
        reconcileGenerationTasks(workerEnv),
        retryWaffoEvents(),
      ]).then(([generation, payments]) => {
        if (generation.status === 'fulfilled') {
          console.info('[generation] cron reconcile complete', generation.value)
        } else {
          console.error('[generation] cron reconcile failed', generation.reason)
        }

        if (payments.status === 'fulfilled') {
          console.info('[Waffo] cron inbox retry complete')
        } else {
          console.error('[Waffo] cron inbox retry failed', payments.reason)
        }
      }),
    )
  },
}
