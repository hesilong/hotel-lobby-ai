import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { assertPromptAllowed } from '@/server/moderation'
import { verifyPreparedAssets } from '@/server/storage'
import { submitKieSeedanceVideo } from '@/server/kie'
import { HOTEL_LOBBY_GENERATION_CONFIG } from '@/config/hotel-lobby-generation'
import { generationPriceUsd } from '@/config/generation-purchase'
import { generationProductId, paymentProvider } from '@/config/payments'
import { createWaffoGenerationCheckout, requestWaffoGenerationRefund } from '@/server/waffo'
import type { CreateGenerationInput, GenerationTask } from '@/server/generation'

export type GenerationOrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'failed'
  | 'fulfilled'
  | 'refund_requested'
  | 'refunded'

type GenerationOrderRow = {
  id: string
  user_id: string
  status: GenerationOrderStatus
  resolution: CreateGenerationInput['resolution']
  aspect_ratio: CreateGenerationInput['aspectRatio']
  duration_seconds: number
  generate_audio: boolean
  amount_usd: number | string
  currency: 'USD'
  image_a_url: string
  image_b_url: string
  image_a_asset_id: string | null
  image_b_asset_id: string | null
  reference_template_id: string | null
  reference_video_url: string
  prompt: string
  waffo_product_id: string
  waffo_order_id: string | null
  waffo_payment_id: string | null
  waffo_environment: 'test' | 'prod' | null
  charged_amount: string | null
  refund_ticket_id: string | null
  refund_error: string | null
  latest_task_id: string | null
  retry_count: number
  created_at: string
  updated_at: string
}

const ORDER_SELECT = 'id,user_id,status,resolution,aspect_ratio,duration_seconds,generate_audio,amount_usd,currency,image_a_url,image_b_url,image_a_asset_id,image_b_asset_id,reference_template_id,reference_video_url,prompt,waffo_product_id,waffo_order_id,waffo_payment_id,waffo_environment,charged_amount,refund_ticket_id,refund_error,latest_task_id,retry_count,created_at,updated_at' as const

const mockEnabled = () => process.env.MOCK_GENERATION === 'true'

const kieCallbackUrl = () => {
  const explicit = process.env.KIE_CALLBACK_URL?.trim()
  if (explicit) return explicit
  if (process.env.NODE_ENV !== 'production') return undefined
  const siteUrl = process.env.VITE_SITE_URL?.trim().replace(/\/+$/, '')
  return siteUrl ? `${siteUrl}/api/kie/callback` : undefined
}

const siteUrl = () =>
  (process.env.VITE_SITE_URL || 'https://hotel-lobby-ai.pro').replace(/\/+$/, '')

async function authUser() {
  const supabase = getSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('AUTH_REQUIRED')
  return auth.user
}

function validatePurchaseInput(data: CreateGenerationInput) {
  if (!/^https?:\/\//.test(data.imageAUrl) || !/^https?:\/\//.test(data.imageBUrl) || !/^https?:\/\//.test(data.referenceVideoUrl)) {
    throw new Error('INVALID_ASSET_URL')
  }
  if (!data.prompt.trim() || data.prompt.length > 3072) throw new Error('INVALID_PROMPT')
  if (data.duration !== HOTEL_LOBBY_GENERATION_CONFIG.defaultDuration || data.duration !== 15) {
    throw new Error('INVALID_DURATION')
  }
  if (!HOTEL_LOBBY_GENERATION_CONFIG.resolutions.includes(data.resolution)) {
    throw new Error('INVALID_RESOLUTION')
  }
  if (!['9:16', '16:9'].includes(data.aspectRatio)) {
    throw new Error('INVALID_ASPECT_RATIO')
  }
  if (!data.generateAudio) throw new Error('AUDIO_REQUIRED')
}

async function verifyPurchaseInput(userId: string, data: CreateGenerationInput) {
  validatePurchaseInput(data)

  if (!data.imageAAssetId || !data.imageAAssetToken || !data.imageBAssetId || !data.imageBAssetToken) {
    throw new Error('REFERENCE_IMAGES_NOT_READY')
  }

  if (!data.referenceTemplateId) throw new Error('REFERENCE_VIDEO_NOT_READY')
  const template = HOTEL_LOBBY_GENERATION_CONFIG.templates.find(
    item => item.id === data.referenceTemplateId && item.duration === data.duration,
  )
  if (!template || template.sourceVideoUrl !== data.referenceVideoUrl) {
    throw new Error('REFERENCE_VIDEO_NOT_READY')
  }

  await verifyPreparedAssets({
    userId,
    imageAAssetId: data.imageAAssetId,
    imageAAssetToken: data.imageAAssetToken,
    imageAUrl: data.imageAUrl,
    imageBAssetId: data.imageBAssetId,
    imageBAssetToken: data.imageBAssetToken,
    imageBUrl: data.imageBUrl,
    referenceVideoAssetId: null,
    referenceVideoAssetToken: null,
    referenceVideoUrl: data.referenceVideoUrl,
  })

  // Run prompt moderation before checkout so a buyer is never charged for a
  // request that the service already knows it cannot accept.
  await assertPromptAllowed({ prompt: data.prompt, userId })
}

async function readOrder(orderId: string): Promise<GenerationOrderRow | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from('generation_orders')
    .select(ORDER_SELECT)
    .eq('id', orderId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as GenerationOrderRow | null
}

function orderInput(order: GenerationOrderRow): CreateGenerationInput {
  return {
    imageAAssetId: order.image_a_asset_id,
    imageAAssetToken: null,
    imageBAssetId: order.image_b_asset_id,
    imageBAssetToken: null,
    referenceVideoAssetId: null,
    referenceVideoAssetToken: null,
    imageAUrl: order.image_a_url,
    imageBUrl: order.image_b_url,
    referenceTemplateId: order.reference_template_id,
    referenceVideoUrl: order.reference_video_url,
    prompt: order.prompt,
    duration: order.duration_seconds,
    resolution: order.resolution,
    aspectRatio: order.aspect_ratio,
    generateAudio: order.generate_audio,
  }
}

export async function startPaidGenerationOrder(
  orderId: string,
  expectedStatus: 'paid' | 'failed' = 'paid',
): Promise<GenerationTask | null> {
  const admin = getSupabaseAdminClient()
  const current = await readOrder(orderId)
  if (!current) throw new Error('GENERATION_ORDER_NOT_FOUND')

  if (current.status !== expectedStatus) {
    if (current.latest_task_id) {
      const { data: existing } = await admin.from('generation_tasks')
        .select('id,status,result_url,provider_result_url,storage_status,failure_message,created_at,provider_task_id,provider,credits_used,duration_seconds,resolution,aspect_ratio,generate_audio,prompt,generation_order_id')
        .eq('id', current.latest_task_id)
        .maybeSingle()
      return (existing as GenerationTask | null) || null
    }
    return null
  }

  const nextRetryCount = expectedStatus === 'failed'
    ? Number(current.retry_count || 0) + 1
    : Number(current.retry_count || 0)

  const { data: claimed, error: claimError } = await admin.from('generation_orders')
    .update({
      status: 'processing',
      retry_count: nextRetryCount,
      refund_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('status', expectedStatus)
    .select(ORDER_SELECT)
    .maybeSingle()

  if (claimError) throw new Error(claimError.message)
  if (!claimed) return null

  const order = claimed as GenerationOrderRow
  const input = orderInput(order)
  const isMock = mockEnabled()

  let taskId: string | null = null
  try {
    const { data: task, error: taskError } = await admin.from('generation_tasks').insert({
      user_id: order.user_id,
      status: 'pending',
      generation_order_id: order.id,
      image_a_url: input.imageAUrl,
      image_b_url: input.imageBUrl,
      image_a_asset_id: input.imageAAssetId,
      image_b_asset_id: input.imageBAssetId,
      reference_template_id: input.referenceTemplateId,
      reference_video_url: input.referenceVideoUrl,
      reference_video_asset_id: null,
      prompt: input.prompt.trim(),
      duration_seconds: input.duration,
      resolution: input.resolution,
      aspect_ratio: input.aspectRatio,
      generate_audio: input.generateAudio,
      provider: isMock ? 'mock' : HOTEL_LOBBY_GENERATION_CONFIG.provider,
      model_id: isMock ? 'mock/reference-to-video' : HOTEL_LOBBY_GENERATION_CONFIG.model,
      provider_task_id: null,
      credits_used: 0,
      credits_refunded: 0,
    }).select('id,status,created_at').single()

    if (taskError || !task) throw new Error(taskError?.message || 'TASK_CREATE_FAILED')
    taskId = task.id

    await admin.from('generation_orders')
      .update({ latest_task_id: task.id, updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('status', 'processing')

    if (isMock) {
      const mockProviderTaskId = `mock:${Date.now()}`
      await admin.from('generation_tasks').update({
        status: 'processing',
        provider_task_id: mockProviderTaskId,
        storage_status: 'pending',
        updated_at: new Date().toISOString(),
      }).eq('id', task.id)

      return {
        id: task.id,
        status: 'processing',
        result_url: null,
        failure_message: null,
        created_at: task.created_at,
        provider_task_id: mockProviderTaskId,
        provider: 'mock',
        credits_used: 0,
        duration_seconds: input.duration,
        resolution: input.resolution,
        aspect_ratio: input.aspectRatio,
        generate_audio: input.generateAudio,
        prompt: input.prompt.trim(),
        generation_order_id: order.id,
        generation_order_status: 'processing',
        generation_price_usd: Number(order.amount_usd),
      }
    }

    const upstream = await submitKieSeedanceVideo({
      model: HOTEL_LOBBY_GENERATION_CONFIG.model,
      imageUrls: [input.imageAUrl, input.imageBUrl],
      videoUrl: input.referenceVideoUrl,
      prompt: input.prompt.trim(),
      duration: input.duration,
      resolution: input.resolution,
      aspectRatio: input.aspectRatio,
      generateAudio: input.generateAudio,
      callBackUrl: kieCallbackUrl(),
    })

    await admin.from('generation_tasks').update({
      status: 'processing',
      provider_task_id: upstream.taskId,
      updated_at: new Date().toISOString(),
    }).eq('id', task.id)

    return {
      id: task.id,
      status: 'processing',
      result_url: null,
      failure_message: null,
      created_at: task.created_at,
      provider_task_id: upstream.taskId,
      provider: HOTEL_LOBBY_GENERATION_CONFIG.provider,
      credits_used: 0,
      duration_seconds: input.duration,
      resolution: input.resolution,
      aspect_ratio: input.aspectRatio,
      generate_audio: input.generateAudio,
      prompt: input.prompt.trim(),
      generation_order_id: order.id,
      generation_order_status: 'processing',
      generation_price_usd: Number(order.amount_usd),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GENERATION_SUBMIT_FAILED'
    if (taskId) {
      await admin.from('generation_tasks').update({
        status: 'failed',
        failure_code: 'SUBMIT_FAILED',
        failure_message: message,
        updated_at: new Date().toISOString(),
      }).eq('id', taskId)
    }
    if (taskId) {
      await admin.from('generation_orders').update({
        status: 'failed',
        latest_task_id: taskId,
        updated_at: new Date().toISOString(),
      }).eq('id', order.id).eq('status', 'processing')
    } else {
      // Payment is already confirmed but no attempt exists. Put the entitlement
      // back into the recoverable paid state so browser/Cron can safely retry.
      await admin.from('generation_orders').update({
        status: 'paid',
        updated_at: new Date().toISOString(),
      }).eq('id', order.id).eq('status', 'processing')
    }
    console.error('[generation purchase] submit failed', { orderId: order.id, taskId, message })
    return taskId
      ? {
          id: taskId,
          status: 'failed',
          result_url: null,
          failure_message: message,
          created_at: new Date().toISOString(),
          provider_task_id: null,
          credits_used: 0,
          duration_seconds: input.duration,
          resolution: input.resolution,
          aspect_ratio: input.aspectRatio,
          generate_audio: input.generateAudio,
          prompt: input.prompt.trim(),
          generation_order_id: order.id,
          generation_order_status: 'failed',
          generation_price_usd: Number(order.amount_usd),
        }
      : null
  }
}

export async function retryPaidGenerationOrderForUser(userId: string, taskId: string) {
  const admin = getSupabaseAdminClient()
  const { data: task, error } = await admin.from('generation_tasks')
    .select('id,user_id,status,generation_order_id')
    .eq('id', taskId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !task) throw new Error('TASK_NOT_FOUND')
  if (task.status !== 'failed' || !task.generation_order_id) throw new Error('TASK_NOT_RETRYABLE')

  const order = await readOrder(String(task.generation_order_id))
  if (!order || order.user_id !== userId) throw new Error('GENERATION_ORDER_NOT_FOUND')
  if (order.status !== 'failed' || order.latest_task_id !== taskId) throw new Error('TASK_NOT_RETRYABLE')

  const next = await startPaidGenerationOrder(order.id, 'failed')
  if (!next) throw new Error('TASK_RETRY_FAILED')
  return next
}

export async function reconcileGenerationPurchaseOrders() {
  const admin = getSupabaseAdminClient()
  const staleCutoff = new Date(Date.now() - 5 * 60_000).toISOString()

  const [
    { data: paidOrders, error: paidError },
    { data: orphanedProcessing, error: orphanedError },
  ] = await Promise.all([
    admin.from('generation_orders')
      .select('id')
      .eq('status', 'paid')
      .order('paid_at', { ascending: true, nullsFirst: true })
      .limit(20),
    admin.from('generation_orders')
      .select('id')
      .eq('status', 'processing')
      .is('latest_task_id', null)
      .lt('updated_at', staleCutoff)
      .order('updated_at', { ascending: true })
      .limit(20),
  ])

  if (paidError) throw new Error(paidError.message)
  if (orphanedError) throw new Error(orphanedError.message)

  if (orphanedProcessing?.length) {
    const ids = orphanedProcessing.map(row => String(row.id))
    const { error } = await admin.from('generation_orders').update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    }).in('id', ids).eq('status', 'processing').is('latest_task_id', null)
    if (error) throw new Error(error.message)
  }

  const results = await Promise.allSettled(
    (paidOrders || []).map(row => startPaidGenerationOrder(String(row.id), 'paid')),
  )

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error('[generation purchase] paid-order recovery failed', {
        orderId: String((paidOrders || [])[index]?.id || ''),
        error: result.reason,
      })
    }
  })

  return {
    paidScanned: (paidOrders || []).length,
    orphanedProcessing: (orphanedProcessing || []).length,
    failed: results.filter(result => result.status === 'rejected').length,
  }
}

export const createGenerationPurchase = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateGenerationInput) => input)
  .handler(async ({ data }) => {
    const user = await authUser()
    await verifyPurchaseInput(user.id, data)

    if (paymentProvider() !== 'waffo') {
      throw new Error('DIRECT_GENERATION_REQUIRES_WAFFO')
    }

    const productId = generationProductId('waffo', data.resolution)
    if (!productId) throw new Error('WAFFO_GENERATION_PRODUCT_NOT_CONFIGURED')

    const amountUsd = generationPriceUsd(data.resolution)
    const admin = getSupabaseAdminClient()
    const { data: order, error } = await admin.from('generation_orders').insert({
      user_id: user.id,
      status: 'pending_payment',
      resolution: data.resolution,
      aspect_ratio: data.aspectRatio,
      duration_seconds: data.duration,
      generate_audio: data.generateAudio,
      amount_usd: amountUsd,
      currency: 'USD',
      image_a_url: data.imageAUrl,
      image_b_url: data.imageBUrl,
      image_a_asset_id: data.imageAAssetId,
      image_b_asset_id: data.imageBAssetId,
      reference_template_id: data.referenceTemplateId,
      reference_video_url: data.referenceVideoUrl,
      prompt: data.prompt.trim(),
      waffo_product_id: productId,
    }).select('id').single()

    if (error || !order) throw new Error(error?.message || 'GENERATION_ORDER_CREATE_FAILED')

    const success = new URL('/', siteUrl())
    success.searchParams.set('purchase_return', '1')
    success.searchParams.set('generation_order', order.id)
    success.hash = 'generator'

    try {
      const checkout = await createWaffoGenerationCheckout({
        user: { id: user.id, email: user.email || undefined },
        generationOrderId: order.id,
        resolution: data.resolution,
        successUrl: success.toString(),
      })
      return {
        orderId: order.id,
        checkoutUrl: checkout.checkoutUrl,
        priceUsd: amountUsd,
        resolution: data.resolution,
      }
    } catch (error) {
      await admin.from('generation_orders').delete()
        .eq('id', order.id)
        .eq('status', 'pending_payment')
      throw error
    }
  })

export const getGenerationPurchase = createServerFn({ method: 'POST' })
  .inputValidator((input: { orderId: string }) => input)
  .handler(async ({ data }) => {
    const user = await authUser()
    const { data: order, error } = await getSupabaseAdminClient()
      .from('generation_orders')
      .select('id,status,resolution,aspect_ratio,duration_seconds,amount_usd,currency,latest_task_id,retry_count,refund_ticket_id,refund_error,created_at,updated_at')
      .eq('id', data.orderId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error || !order) throw new Error('GENERATION_ORDER_NOT_FOUND')

    if (order.status === 'paid') {
      await startPaidGenerationOrder(order.id, 'paid')
      const { data: refreshed, error: refreshedError } = await getSupabaseAdminClient()
        .from('generation_orders')
        .select('id,status,resolution,aspect_ratio,duration_seconds,amount_usd,currency,latest_task_id,retry_count,refund_ticket_id,refund_error,created_at,updated_at')
        .eq('id', data.orderId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (refreshedError || !refreshed) throw new Error('GENERATION_ORDER_NOT_FOUND')
      return {
        ...refreshed,
        amount_usd: Number(refreshed.amount_usd),
      }
    }

    return {
      ...order,
      amount_usd: Number(order.amount_usd),
    }
  })

export const requestGenerationRefund = createServerFn({ method: 'POST' })
  .inputValidator((input: { taskId: string }) => input)
  .handler(async ({ data }) => {
    const user = await authUser()
    const admin = getSupabaseAdminClient()
    const { data: task, error: taskError } = await admin.from('generation_tasks')
      .select('id,status,generation_order_id')
      .eq('id', data.taskId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (taskError || !task?.generation_order_id) throw new Error('REFUND_NOT_AVAILABLE')

    const order = await readOrder(String(task.generation_order_id))
    if (!order || order.user_id !== user.id) throw new Error('GENERATION_ORDER_NOT_FOUND')
    if (order.status === 'refunded') return { status: 'refunded' as const, ticketId: order.refund_ticket_id }
    if (order.status === 'refund_requested') return { status: 'refund_requested' as const, ticketId: order.refund_ticket_id }
    if (order.refund_ticket_id && order.refund_error) throw new Error('REFUND_SUPPORT_REQUIRED')
    if (task.status !== 'failed' || order.status !== 'failed' || order.latest_task_id !== task.id) {
      throw new Error('REFUND_NOT_AVAILABLE')
    }
    if (!order.waffo_payment_id || !order.waffo_order_id) throw new Error('PAYMENT_NOT_READY')

    const { data: claimed, error: claimError } = await admin.from('generation_orders')
      .update({
        status: 'refund_requested',
        refund_requested_at: new Date().toISOString(),
        refund_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('status', 'failed')
      .select('id')
      .maybeSingle()

    if (claimError) throw new Error(claimError.message)
    if (!claimed) throw new Error('REFUND_NOT_AVAILABLE')

    const amount = order.charged_amount || Number(order.amount_usd).toFixed(2)

    try {
      const refund = await requestWaffoGenerationRefund({
        userId: user.id,
        generationOrderId: order.id,
        paymentId: order.waffo_payment_id,
        amount,
        currency: 'USD',
      })

      await admin.from('generation_orders').update({
        refund_ticket_id: refund.ticketId,
        updated_at: new Date().toISOString(),
      }).eq('id', order.id).eq('status', 'refund_requested')

      return {
        status: 'refund_requested' as const,
        ticketId: refund.ticketId,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'REFUND_REQUEST_FAILED'
      await admin.from('generation_orders').update({
        status: 'failed',
        refund_error: message,
        updated_at: new Date().toISOString(),
      }).eq('id', order.id).eq('status', 'refund_requested')
      throw error
    }
  })
