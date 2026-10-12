import { createFileRoute } from '@tanstack/react-router'
import { verifyWebhook, type WebhookEventData } from '@waffo/pancake-ts'
import { waitUntil } from 'cloudflare:workers'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { waffoEnvironment } from '@/providers/waffo'
import { processWaffoEvent, validateWaffoEnvelope } from '@/server/waffo-webhooks'

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
      const processDelivery = async () => {
        try {
          await processWaffoEvent(event)
        } catch (processError) {
          console.error('[Waffo] event processing failed; retained for retry', {
            deliveryId: event.id,
            error: processError,
          })
        }
      }

      if (import.meta.env.DEV) {
        await processDelivery()
      } else {
        waitUntil(processDelivery())
      }

      return new Response('OK')
    },
  } },
})
