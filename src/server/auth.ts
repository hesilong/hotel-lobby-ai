import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export const completeOAuthSignIn = createServerFn({ method: 'POST' })
  .inputValidator((input: { code: string; flowId?: string | null }) => input)
  .handler(async ({ data }) => {
    if (!data.code) throw new Error('OAUTH_CODE_MISSING')

    const supabase = getSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(
      data.code,
      data.flowId ? { flowId: data.flowId } : undefined,
    )

    if (error) throw new Error(error.message)
    return { ok: true }
  })
