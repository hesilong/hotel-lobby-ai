import { useState } from 'react'
import { ArrowLeft, Loader2, Mail, X } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useI18n } from '@/i18n/useI18n'

function GoogleMark() {
  return <span className="google-mark" aria-hidden="true">G</span>
}

export function AuthModal({ open, onClose, onAuthed }: { open: boolean; onClose: () => void; onAuthed: () => void }) {
  const { messages } = useI18n()
  const m = messages.auth
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
      setError(m.passwordsMismatch)
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
      setError(m.confirmEmail)
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
      <button className="auth-close" onClick={closeModal} aria-label={m.close}><X size={18}/></button>
      <h3>{mode === 'signin' ? m.signIn : m.createAccountTitle}</h3>
      <p>{mode === 'signin' ? m.signInDescription : m.signUpDescription}</p>

      {showOptions ? <>
        <button className="auth-google" disabled={googleBusy || busy} onClick={() => void signInWithGoogle()}>
          {googleBusy ? <Loader2 className="spin" size={16}/> : <GoogleMark/>}
          {m.continueGoogle}
        </button>

        <div className="auth-divider"><span>{m.or}</span></div>

        <button className="auth-email-option" disabled={googleBusy || busy} onClick={showEmailSignin}>
          <Mail size={17}/>
          {m.continueEmail}
        </button>

        {error && <div className="auth-error">{error}</div>}

        <button className="auth-switch" onClick={showSignup}>
          {m.newHere}
        </button>
      </> : <>
        <input type="email" placeholder={m.email} value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" placeholder={m.password} value={password} onChange={e=>setPassword(e.target.value)} />
        {mode === 'signup' && (
          <input
            type="password"
            placeholder={m.confirmPassword}
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
          {mode === 'signin' ? m.signIn : m.createAccount}
        </button>

        {mode === 'signin' ? (
          <>
            <button className="auth-back" onClick={showSigninOptions}>
              <ArrowLeft size={14}/>
              {m.backToOptions}
            </button>
            <button className="auth-switch" onClick={showSignup}>
              {m.newHere}
            </button>
          </>
        ) : (
          <button className="auth-switch" onClick={showSigninOptions}>
            {m.alreadyHaveAccount}
          </button>
        )}
      </>}
    </div>
  </div>
}
