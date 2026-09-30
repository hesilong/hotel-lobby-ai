import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ? { id: user.id, email: user.email ?? null } : null
})
