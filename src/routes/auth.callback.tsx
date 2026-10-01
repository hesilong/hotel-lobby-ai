import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { completeOAuthSignIn } from '@/server/auth'

export const Route = createFileRoute('/auth/callback')({
  head: () => ({
    meta: [
      { title: 'Signing in – Hotel Lobby AI' },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: AuthCallbackPage,
})

function AuthCallbackPage() {
  const [error, setError] = useState('')

  useEffect(() => {
    const complete = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const flowId = params.get('sb_flow_id')
      const nextParam = params.get('next')
      const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/'

      if (!code) {
        setError('Google sign-in did not return an authorization code.')
        return
      }

      try {
        await completeOAuthSignIn({ data: { code, flowId } })
        window.location.replace(next)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to complete Google sign-in.')
      }
    }

    void complete()
  }, [])

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
