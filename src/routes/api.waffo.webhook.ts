import { createFileRoute } from '@tanstack/react-router'
import { verifyWebhook, type WebhookEventData } from '@waffo/pancake-ts'
import { waitUntil } from 'cloudflare:workers'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { waffoEnvironment } from '@/server/waffo'
import { retryWaffoEvents, validateWaffoEnvelope } from '@/server/waffo-webhooks'

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
      // Acknowledge only after durable storage, then fulfill outside the response.
      waitUntil(retryWaffoEvents().catch(() => console.error('[Waffo] inbox retry failed')))
      return new Response('OK')
    },
  } },
})
