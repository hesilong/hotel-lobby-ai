import { createFileRoute } from '@tanstack/react-router'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const allowedOrigins = new Set([
  'https://www.clothmotion.app',
  'https://clothmotion.app',
  'http://localhost:3000',
  'http://localhost:3001',
])

function corsHeaders(request: Request) {
  const origin = request.headers.get('origin') || ''
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Vary': 'Origin',
  })
  if (allowedOrigins.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
  }
  return headers
}

export const Route = createFileRoute('/api/handoff/$token')({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const headers = corsHeaders(request)
        headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
        headers.set('Access-Control-Allow-Headers', 'Content-Type')
        return new Response(null, { status: 204, headers })
      },
      GET: async ({ request, params }) => {
        const headers = corsHeaders(request)
        const origin = request.headers.get('origin')
        if (origin && !allowedOrigins.has(origin)) {
          return new Response(JSON.stringify({ error: 'Origin not allowed' }), { status: 403, headers })
        }

        const token = params.token?.trim()
        if (!token || !/^[a-f0-9]{32}$/i.test(token)) {
          return new Response(JSON.stringify({ error: 'Invalid handoff' }), { status: 400, headers })
        }

        const admin = getSupabaseAdminClient()
        const { data, error } = await admin
          .from('generation_handoffs')
          .select('payload,expires_at')
          .eq('token', token)
          .maybeSingle()

        if (error || !data) {
          return new Response(JSON.stringify({ error: 'Handoff not found' }), { status: 404, headers })
        }

        if (Date.parse(data.expires_at) <= Date.now()) {
          await admin.from('generation_handoffs').delete().eq('token', token)
          return new Response(JSON.stringify({ error: 'Handoff expired' }), { status: 410, headers })
        }

        return new Response(JSON.stringify({ handoff: data.payload }), { status: 200, headers })
      },
    },
  },
})
