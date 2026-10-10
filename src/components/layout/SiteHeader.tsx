import { useEffect, useRef, useState } from 'react'
import { LogIn, LogOut, UserRound } from 'lucide-react'
import { AuthModal } from '@/components/auth/AuthModal'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { getBillingState } from '@/server/billing'
import { SITE_CONFIG } from '@/config/site'

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [credits, setCredits] = useState<number | null>(null)
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const applySession = (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      const yes = Boolean(session)
      setAuthed(yes)
      setEmail(session?.user.email ?? null)
      const metadata = session?.user.user_metadata || {}
      setAvatarUrl((metadata.avatar_url || metadata.picture || null) as string | null)
      if (!yes) {
        setCredits(null)
        setAccountOpen(false)
      }
    }

    void supabase.auth.getSession().then(({ data }) => {
      applySession(data.session)
      if (data.session) {
        void getBillingState().then(state => setCredits(state.credits)).catch(() => setCredits(null))
      }
    })

    const onCreditsChanged = (event: Event) => {
      const value = (event as CustomEvent<number>).detail
      if (Number.isFinite(value)) setCredits(value)
    }
    window.addEventListener('hla:credits-changed', onCreditsChanged)

    const onPointerDown = (event: PointerEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false)
      }
    }
    window.addEventListener('pointerdown', onPointerDown)

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session)
      if (session) {
        setAuthOpen(false)
        void getBillingState().then(state => setCredits(state.credits)).catch(() => setCredits(null))
      }
    })

    return () => {
      window.removeEventListener('hla:credits-changed', onCreditsChanged)
      window.removeEventListener('pointerdown', onPointerDown)
      listener.subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    setAccountOpen(false)
    await getSupabaseBrowserClient().auth.signOut()
    setCredits(null)
  }

  const initial = email?.trim().charAt(0).toUpperCase() || 'U'

  return (
    <>
      <header className={overlay ? 'site-header site-header-overlay' : 'site-header'}>
        <a className="brand" href="/">
          <img className="brand-icon" src={SITE_CONFIG.faviconPath} alt="" aria-hidden="true"/>
          <span>{SITE_CONFIG.name}</span>
        </a>

        <nav className="header-nav">
          <a href="/#templates">Templates</a>
          <a href="/#how-it-works">How it works</a>
          <a href="/blog">Blog</a>
          <a href="/migos-ai-video">Migos AI</a>
          <a href="/pricing">Pricing</a>
        </nav>

        <div className="header-right">
          {authed ? (<>
            <a className="header-credits" href="/pricing" title="Credits">⚡ {credits ?? '—'}</a>
            <div className="header-account-menu" ref={accountRef}>
              <button
                type="button"
                className="header-avatar"
                onClick={() => setAccountOpen(open => !open)}
                aria-label="Account"
                aria-expanded={accountOpen}
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" />
                  : <span>{initial}</span>}
              </button>

              {accountOpen && (
                <div className="header-account-popover">
                  <div className="header-account-email">
                    <UserRound size={14} />
                    <span>{email || 'Account'}</span>
                  </div>
                  <button type="button" className="header-signout" onClick={() => void signOut()}>
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
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
