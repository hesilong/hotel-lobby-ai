import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export function AuthModal({ open, onClose, onAuthed }: { open: boolean; onClose: () => void; onAuthed: () => void }) {
  const [mode, setMode] = useState<'signin'|'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const submit = async () => {
    setBusy(true); setError('')
    const supabase = getSupabaseBrowserClient()
    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (result.error) return setError(result.error.message)
    if (!result.data.session && mode === 'signup') {
      setError('Check your email to confirm your account, then sign in.')
      setMode('signin')
      return
    }
    onAuthed(); onClose()
  }

  return <div className="modal-backdrop">
    <div className="auth-modal">
      <button className="auth-close" onClick={onClose}><X size={18}/></button>
      <h3>{mode === 'signin' ? 'Sign in to generate' : 'Create your account'}</h3>
      <p>Your uploads stay in this page. After signing in, generation continues with the same inputs.</p>
      <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
      {error && <div className="auth-error">{error}</div>}
      <button className="auth-submit" disabled={busy || !email || password.length < 6} onClick={submit}>
        {busy ? <Loader2 className="spin" size={16}/> : null}{mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>
      <button className="auth-switch" onClick={()=>setMode(mode==='signin'?'signup':'signin')}>
        {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>
    </div>
  </div>
}
