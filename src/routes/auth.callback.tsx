import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
})

function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const complete = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const next = params.get('next') || '/'

      if (!code) {
        setError('Google sign-in did not return an authorization code.')
        return
      }

      const supabase = getSupabaseBrowserClient()
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        setError(exchangeError.message)
        return
      }

      await navigate({ to: next as '/' })
    }

    void complete()
  }, [navigate])

  return <main className="auth-callback-page">
    {error ? <>
      <h1>Sign-in failed</h1>
      <p>{error}</p>
      <a href="/">Back to Hotel Lobby AI</a>
    </> : <>
      <Loader2 className="spin" size={28}/>
      <h1>Signing you in…</h1>
      <p>Finishing Google authentication.</p>
    </>}
  </main>
}
