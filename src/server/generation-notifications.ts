import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { SITE_CONFIG } from '@/config/site'

type ReadyTask = {
  id: string
  user_id: string
  generation_order_id: string | null
  status: string
  result_url: string | null
  storage_status: string | null
  audio_status: string | null
}

type GenerationOrderNotificationRow = {
  id: string
  user_id: string
  status: string
  latest_task_id: string | null
  notify_on_complete: boolean
  notification_status: 'pending' | 'sending' | 'sent' | 'failed' | 'disabled'
  notification_attempts: number
  notification_sent_at: string | null
}

const MAX_NOTIFICATION_ATTEMPTS = 3

function resendApiKey() {
  return process.env.RESEND_API_KEY?.trim()
}

function resendFrom() {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    `${SITE_CONFIG.name} <${SITE_CONFIG.supportEmail}>`
  )
}

function readyUrl() {
  return `${SITE_CONFIG.url}/#generator`
}

function deliverableReady(task: ReadyTask) {
  return (
    task.status === 'completed' &&
    Boolean(task.result_url) &&
    task.storage_status === 'persisted' &&
    task.audio_status !== 'pending' &&
    task.audio_status !== 'processing'
  )
}

async function sendReadyEmail(params: {
  orderId: string
  to: string
}) {
  const key = resendApiKey()
  if (!key) return { skipped: true as const, id: null }

  const url = readyUrl()
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `generation-ready/${params.orderId}`,
    },
    body: JSON.stringify({
      from: resendFrom(),
      to: [params.to],
      reply_to: SITE_CONFIG.supportEmail,
      subject: 'Your Hotel Lobby AI video is ready',
      text: [
        'Your Hotel Lobby AI video has finished generating.',
        '',
        'View your video:',
        url,
        '',
        'You can also find it in your generation history.',
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#20242c;line-height:1.6">
          <h1 style="font-size:24px;line-height:1.25;margin:0 0 16px">Your video is ready</h1>
          <p style="margin:0 0 22px;color:#5f6672">Your Hotel Lobby AI video has finished generating.</p>
          <p style="margin:0 0 24px">
            <a href="${url}" style="display:inline-block;background:#f25d0d;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px">
              View your video
            </a>
          </p>
          <p style="margin:0;color:#818792;font-size:13px">You can also find it in your generation history.</p>
        </div>
      `,
    }),
  })

  const raw = await response.text()
  let parsed: { id?: string; message?: string } = {}
  try {
    parsed = JSON.parse(raw) as { id?: string; message?: string }
  } catch {}

  if (!response.ok || !parsed.id) {
    throw new Error(parsed.message || `RESEND_SEND_FAILED_${response.status}`)
  }

  return { skipped: false as const, id: parsed.id }
}

async function markNotificationFailed(
  orderId: string,
  attempts: number,
  message: string,
) {
  const admin = getSupabaseAdminClient()
  await admin
    .from('generation_orders')
    .update({
      notification_status: 'failed',
      notification_attempts: attempts,
      notification_error: message.slice(0, 1000),
      notification_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('notification_status', 'sending')
    .is('notification_sent_at', null)
}

export async function maybeSendGenerationReadyNotification(task: ReadyTask) {
  if (!task.generation_order_id || !deliverableReady(task)) return { sent: false }

  // If Resend is intentionally not configured (common in local dev), leave the
  // order pending instead of burning retry attempts.
  if (!resendApiKey()) {
    console.info('[notification] Resend not configured; ready email deferred', {
      taskId: task.id,
      orderId: task.generation_order_id,
    })
    return { sent: false }
  }

  const admin = getSupabaseAdminClient()

  try {
    const { data: order, error } = await admin
      .from('generation_orders')
      .select('id,user_id,status,latest_task_id,notify_on_complete,notification_status,notification_attempts,notification_sent_at')
      .eq('id', task.generation_order_id)
      .eq('user_id', task.user_id)
      .eq('latest_task_id', task.id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!order) return { sent: false }

    const current = order as GenerationOrderNotificationRow
    if (
      !current.notify_on_complete ||
      current.notification_status === 'disabled' ||
      current.notification_status === 'sent' ||
      current.notification_sent_at ||
      current.notification_attempts >= MAX_NOTIFICATION_ATTEMPTS
    ) {
      return { sent: current.notification_status === 'sent' }
    }

    const attempts = Number(current.notification_attempts || 0) + 1
    const now = new Date().toISOString()
    const { data: claimed, error: claimError } = await admin
      .from('generation_orders')
      .update({
        notification_status: 'sending',
        notification_attempts: attempts,
        notification_error: null,
        notification_updated_at: now,
        updated_at: now,
      })
      .eq('id', current.id)
      .eq('notify_on_complete', true)
      .in('notification_status', ['pending', 'failed'])
      .is('notification_sent_at', null)
      .select('id,user_id')
      .maybeSingle()

    if (claimError) throw new Error(claimError.message)
    if (!claimed) return { sent: false }

    const { data: auth, error: authError } = await admin.auth.admin.getUserById(current.user_id)
    if (authError) throw new Error(authError.message)
    const email = auth.user?.email?.trim()
    if (!email) throw new Error('GENERATION_NOTIFICATION_EMAIL_MISSING')

    const result = await sendReadyEmail({ orderId: current.id, to: email })
    if (result.skipped) return { sent: false }

    const sentAt = new Date().toISOString()
    const { error: sentError } = await admin
      .from('generation_orders')
      .update({
        notification_status: 'sent',
        notification_sent_at: sentAt,
        notification_error: null,
        notification_updated_at: sentAt,
        updated_at: sentAt,
      })
      .eq('id', current.id)
      .eq('notification_status', 'sending')
      .is('notification_sent_at', null)

    if (sentError) throw new Error(sentError.message)

    console.info('[notification] generation ready email sent', {
      orderId: current.id,
      taskId: task.id,
      emailId: result.id,
    })

    return { sent: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GENERATION_NOTIFICATION_FAILED'
    const { data: current } = await admin
      .from('generation_orders')
      .select('notification_attempts')
      .eq('id', task.generation_order_id)
      .maybeSingle()
    const attempts = Number(current?.notification_attempts || 1)

    await markNotificationFailed(task.generation_order_id, attempts, message).catch(() => {})
    console.warn('[notification] generation ready email failed', {
      orderId: task.generation_order_id,
      taskId: task.id,
      attempts,
      message,
    })
    return { sent: false }
  }
}

export async function reconcileGenerationNotifications() {
  if (!resendApiKey()) return { scanned: 0, sent: 0 }

  const admin = getSupabaseAdminClient()
  const staleSendingCutoff = new Date(Date.now() - 5 * 60_000).toISOString()

  // A Worker can stop after claiming an email but before recording the result.
  // Recover those stale claims; Resend's idempotency key keeps the retry safe.
  const { error: staleError } = await admin
    .from('generation_orders')
    .update({
      notification_status: 'failed',
      notification_error: 'NOTIFICATION_SEND_INTERRUPTED',
      notification_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('notification_status', 'sending')
    .is('notification_sent_at', null)
    .lt('notification_updated_at', staleSendingCutoff)

  if (staleError) throw new Error(staleError.message)

  const { data: orders, error } = await admin
    .from('generation_orders')
    .select('id,user_id,latest_task_id')
    .eq('status', 'fulfilled')
    .eq('notify_on_complete', true)
    .in('notification_status', ['pending', 'failed'])
    .is('notification_sent_at', null)
    .lt('notification_attempts', MAX_NOTIFICATION_ATTEMPTS)
    .order('updated_at', { ascending: true })
    .limit(20)

  if (error) throw new Error(error.message)

  let sent = 0
  for (const order of orders || []) {
    if (!order.latest_task_id) continue
    const { data: task, error: taskError } = await admin
      .from('generation_tasks')
      .select('id,user_id,generation_order_id,status,result_url,storage_status,audio_status')
      .eq('id', order.latest_task_id)
      .eq('user_id', order.user_id)
      .maybeSingle()

    if (taskError) {
      console.warn('[notification] reconciliation task lookup failed', {
        orderId: order.id,
        message: taskError.message,
      })
      continue
    }

    if (!task) continue
    const result = await maybeSendGenerationReadyNotification(task as ReadyTask)
    if (result.sent) sent += 1
  }

  return { scanned: (orders || []).length, sent }
}
