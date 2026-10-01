import { useEffect, useState } from 'react'
import { LogIn, LogOut, UserRound } from 'lucide-react'
import { AuthModal } from '@/components/auth/AuthModal'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { getBillingState } from '@/server/billing'

export function SiteHeader() {
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [credits, setCredits] = useState<number | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    void supabase.auth.getSession().then(({ data }) => {
      const yes = Boolean(data.session)
      setAuthed(yes)
      setEmail(data.session?.user.email ?? null)
      if (yes) void getBillingState().then(state => setCredits(state.credits)).catch(() => setCredits(null))
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const yes = Boolean(session)
      setAuthed(yes)
      setEmail(session?.user.email ?? null)
      if (session) {
        setAuthOpen(false)
        void getBillingState().then(state => setCredits(state.credits)).catch(() => setCredits(null))
      } else {
        setCredits(null)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await getSupabaseBrowserClient().auth.signOut()
    setCredits(null)
  }

  return (
    <>
      <header className="site-header">
        <a className="brand" href="/">Hotel Lobby AI</a>
        <div className="header-right">
          <nav>
            <a href="/#templates">Templates</a>
            <a href="/#how-it-works">How it works</a>
            <a href="/migos-ai-video">Migos AI</a>
            <a href="/pricing">Pricing</a>
          </nav>

          {authed ? (<>
            <a className="header-credits" href="/pricing" title="Credits">⚡ {credits ?? '—'}</a>
            <button className="header-account" onClick={() => void signOut()} title={email || 'Signed in'}>
              <UserRound size={14} />
              <span className="header-email">{email || 'Account'}</span>
              <LogOut size={14} />
            </button>
          </>) : (
            <button className="header-signin" onClick={() => setAuthOpen(true)}>
              <LogIn size={14} />
              Sign in
            </button>
          )}
        </div>
      </header>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthed={() => setAuthed(true)}
      />
    </>
  )
}
