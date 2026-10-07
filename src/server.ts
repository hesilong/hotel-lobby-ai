import handler from '@tanstack/react-start/server-entry'
import {
  processGenerationByProviderTaskId,
  reconcileGenerationTasks,
  type GenerationWorkerBindings,
} from './server/generation-task-processor'

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
    if (request.method === 'POST' && url.pathname === '/api/kie/callback') {
      return handleKieCallback(request, workerEnv, ctx)
    }
    return handler.fetch(request, workerEnv, ctx)
  },

  async scheduled(
    _event: ScheduledController,
    workerEnv: WorkerEnv,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(
      reconcileGenerationTasks(workerEnv)
        .then(result => {
          console.info('[generation] cron reconcile complete', result)
        })
        .catch(error => {
          console.error('[generation] cron reconcile failed', error)
        }),
    )
  },
}
