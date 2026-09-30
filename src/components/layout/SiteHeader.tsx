import { useEffect, useState } from 'react'
import { LogOut, UserRound } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export function SiteHeader() {
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    void supabase.auth.getSession().then(({ data }) => {
      setAuthed(Boolean(data.session))
      setEmail(data.session?.user.email ?? null)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(Boolean(session))
      setEmail(session?.user.email ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await getSupabaseBrowserClient().auth.signOut()
  }

  return (
    <header className="site-header">
      <a className="brand" href="/">Hotel Lobby AI</a>
      <div className="header-right">
        <nav>
          <a href="#templates">Templates</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        {authed ? (
          <button className="header-account" onClick={() => void signOut()} title={email || 'Signed in'}>
            <UserRound size={14} />
            <span className="header-email">{email || 'Account'}</span>
            <LogOut size={14} />
          </button>
        ) : null}
      </div>
    </header>
  )
}
