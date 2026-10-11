import { createFileRoute } from '@tanstack/react-router'
import { verifyWebhook, type WebhookEventData } from '@waffo/pancake-ts'
import { waitUntil } from 'cloudflare:workers'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { waffoEnvironment } from '@/server/waffo'
import { processWaffoEvent, retryWaffoEvents, validateWaffoEnvelope } from '@/server/waffo-webhooks'

export const Route = createFileRoute('/api/waffo/webhook')({
  server: { handlers: {
    POST: async ({ request }) => {
      if (Number(request.headers.get('content-length') || 0) > 128 * 1024) return new Response('Payload too large', { status: 413 })
      const raw = await request.text()
      if (new TextEncoder().encode(raw).length > 128 * 1024) return new Response('Payload too large', { status: 413 })
      let event
      try {
        event = verifyWebhook<WebhookEventData>(raw, request.headers.get('x-waffo-signature') || '', { environment: waffoEnvironment() })
        validateWaffoEnvelope(event)
      } catch {
        return new Response('Invalid webhook', { status: 401 })
      }
      const { error } = await getSupabaseAdminClient().from('waffo_webhook_events').upsert({
        delivery_id: event.id, event_type: event.eventType, environment: event.mode,
        payload: event, status: 'pending',
      }, { onConflict: 'delivery_id', ignoreDuplicates: true })
      if (error) return new Response('Unable to persist webhook', { status: 503 })
      // The event is durable now. Process this delivery immediately so local
      // TanStack dev does not depend on Cloudflare waitUntil semantics. If the
      // immediate attempt fails, keep the inbox row pending/failed and let the
      // normal retry worker/Cron recover it.
      try {
        await processWaffoEvent(event)
      } catch (processError) {
        console.error('[Waffo] immediate event processing failed; retained for retry', {
          deliveryId: event.id,
          error: processError,
        })
        waitUntil(
          retryWaffoEvents().catch(retryError =>
            console.error('[Waffo] inbox retry failed', retryError),
          ),
        )
      }
      return new Response('OK')
    },
  } },
})
