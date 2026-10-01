import { createFileRoute } from '@tanstack/react-router'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export const Route = createFileRoute('/api/download/$taskId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const supabase = getSupabaseServerClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return new Response('Unauthorized', { status: 401 })

        const admin = getSupabaseAdminClient()
        const { data: task, error } = await admin
          .from('generation_tasks')
          .select('id,status,result_url')
          .eq('id', params.taskId)
          .eq('user_id', auth.user.id)
          .maybeSingle()

        if (error || !task || task.status !== 'completed' || !task.result_url) {
          return new Response('Video not found', { status: 404 })
        }

        const upstream = await fetch(task.result_url)
        if (!upstream.ok || !upstream.body) {
          return new Response('Unable to download video', { status: 502 })
        }

        const headers = new Headers()
        headers.set('Content-Type', upstream.headers.get('content-type') || 'video/mp4')
        headers.set('Content-Disposition', `attachment; filename="hotel-lobby-ai-${task.id}.mp4"`)
        const contentLength = upstream.headers.get('content-length')
        if (contentLength) headers.set('Content-Length', contentLength)
        headers.set('Cache-Control', 'private, no-store')
        headers.set('X-Content-Type-Options', 'nosniff')

        return new Response(upstream.body, { status: 200, headers })
      },
    },
  },
})
