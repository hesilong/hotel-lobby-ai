import { useState } from 'react'
import { ArrowLeft, Loader2, Mail, X } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

function GoogleMark() {
  return <span className="google-mark" aria-hidden="true">G</span>
}

export function AuthModal({ open, onClose, onAuthed }: { open: boolean; onClose: () => void; onAuthed: () => void }) {
  const [mode, setMode] = useState<'signin'|'signup'>('signin')
  const [emailFormOpen, setEmailFormOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const resetToOptions = () => {
    setMode('signin')
    setEmailFormOpen(false)
    setPassword('')
    setConfirmPassword('')
    setError('')
  }

  const closeModal = () => {
    resetToOptions()
    onClose()
  }

  const signInWithGoogle = async () => {
    setGoogleBusy(true)
    setError('')
    const supabase = getSupabaseBrowserClient()
    const currentPath = `${window.location.pathname}${window.location.search}`
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(currentPath)}`
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })
    if (oauthError) {
      setGoogleBusy(false)
      setError(oauthError.message)
    }
  }

  const submit = async () => {
    setError('')

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setBusy(true)
    const supabase = getSupabaseBrowserClient()
    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    setBusy(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    if (!result.data.session && mode === 'signup') {
      setError('Check your email to confirm your account, then sign in.')
      setMode('signin')
      setConfirmPassword('')
      return
    }

    onAuthed()
    closeModal()
  }

  const showSignup = () => {
    setMode('signup')
    setEmailFormOpen(true)
    setPassword('')
    setConfirmPassword('')
    setError('')
  }

  const showSigninOptions = () => {
    setMode('signin')
    setEmailFormOpen(false)
    setPassword('')
    setConfirmPassword('')
    setError('')
  }

  const showEmailSignin = () => {
    setMode('signin')
    setEmailFormOpen(true)
    setPassword('')
    setConfirmPassword('')
    setError('')
  }

  const showOptions = mode === 'signin' && !emailFormOpen

  return <div className="modal-backdrop">
    <div className="auth-modal">
      <button className="auth-close" onClick={closeModal} aria-label="Close"><X size={18}/></button>
      <h3>{mode === 'signin' ? 'Sign in' : 'Create your account'}</h3>
      <p>{mode === 'signin'
        ? 'Sign in to continue with generation, billing, and your saved results.'
        : 'Create an account to save results, manage credits, and generate videos.'}</p>

      {showOptions ? <>
        <button className="auth-google" disabled={googleBusy || busy} onClick={() => void signInWithGoogle()}>
          {googleBusy ? <Loader2 className="spin" size={16}/> : <GoogleMark/>}
          Continue with Google
        </button>

        <div className="auth-divider"><span>or</span></div>

        <button className="auth-email-option" disabled={googleBusy || busy} onClick={showEmailSignin}>
          <Mail size={17}/>
          Continue with Email
        </button>

        {error && <div className="auth-error">{error}</div>}

        <button className="auth-switch" onClick={showSignup}>
          New here? Create an account
        </button>
      </> : <>
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        {mode === 'signup' && (
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={e=>setConfirmPassword(e.target.value)}
          />
        )}

        {error && <div className="auth-error">{error}</div>}

        <button
          className="auth-submit"
          disabled={
            busy ||
            googleBusy ||
            !email ||
            password.length < 6 ||
            (mode === 'signup' && confirmPassword.length < 6)
          }
          onClick={() => void submit()}
        >
          {busy ? <Loader2 className="spin" size={16}/> : null}
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        {mode === 'signin' ? (
          <>
            <button className="auth-back" onClick={showSigninOptions}>
              <ArrowLeft size={14}/>
              Back to sign-in options
            </button>
            <button className="auth-switch" onClick={showSignup}>
              New here? Create an account
            </button>
          </>
        ) : (
          <button className="auth-switch" onClick={showSigninOptions}>
            Already have an account? Sign in
          </button>
        )}
      </>}
    </div>
  </div>
}
