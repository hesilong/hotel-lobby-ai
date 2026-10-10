import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, X, Zap } from 'lucide-react'
import { AuthModal } from '@/components/auth/AuthModal'
import { REVIEW_MODE } from '@/config/feature-flags'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  cancelSubscription,
  createCheckout,
  getBillingState,
  getPricingCatalog,
  resumeSubscription,
} from '@/server/billing'
import type { CreditPackKey } from '@/config/products'

type BillingState = Awaited<ReturnType<typeof getBillingState>>
type Catalog = Awaited<ReturnType<typeof getPricingCatalog>>

export function PricingPanel({
  modal = false,
  requiredCredits,
  returnPath = '/pricing',
  onClose,
  onBalanceChange,
}: {
  modal?: boolean
  requiredCredits?: number
  returnPath?: string
  onClose?: () => void
  onBalanceChange?: (credits: number) => void
}) {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [billing, setBilling] = useState<BillingState | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [authed, setAuthed] = useState(false)
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const refresh = async () => {
    try {
      const state = await getBillingState()
      setBilling(state)
      onBalanceChange?.(state.credits)
      return state
    } catch {
      setBilling(null)
      return null
    }
  }

  useEffect(() => {
    void getPricingCatalog().then(setCatalog)
    void supabase.auth.getSession().then(({ data }) => {
      const yes = Boolean(data.session)
      setAuthed(yes)
      if (yes) void refresh()
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(Boolean(session))
      if (session) void refresh()
      else setBilling(null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!authed || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('purchase_return') !== '1') return
    let cancelled = false
    let attempts = 0
    const poll = async () => {
      if (cancelled) return
      attempts += 1
      await refresh()
      if (attempts < 12) window.setTimeout(() => void poll(), 1500)
    }
    void poll()
    return () => { cancelled = true }
  }, [authed])

  useEffect(() => {
    if (!authed) return
    const onFocus = () => { void refresh() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [authed])

  const requireAuth = () => {
    if (authed) return true
    setAuthOpen(true)
    return false
  }

  const checkout = async (key: CreditPackKey) => {
    if (REVIEW_MODE || !requireAuth()) return
    setBusy('pack-' + key)
    setError('')
    const paymentTab = catalog?.provider === 'waffo' ? window.open('about:blank', '_blank') : null
    if (catalog?.provider === 'waffo' && !paymentTab) {
      setError('Please allow popups to open the secure checkout.')
      setBusy('')
      return
    }
    if (paymentTab) paymentTab.opener = null

    try {
      const result = await createCheckout({ data: { type: 'credit_pack', key, returnPath } })
      if (paymentTab) paymentTab.location.replace(result.checkoutUrl)
      else window.location.assign(result.checkoutUrl)
    } catch (e) {
      paymentTab?.close()
      setError(e instanceof Error ? e.message : 'Unable to start checkout')
      setBusy('')
    }
  }

  const cancel = async () => {
    setBusy('cancel')
    setError('')
    try {
      await cancelSubscription()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to cancel subscription')
    } finally {
      setBusy('')
    }
  }

  const resume = async () => {
    setBusy('resume')
    setError('')
    try {
      await resumeSubscription()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to resume subscription')
    } finally {
      setBusy('')
    }
  }

  if (!catalog) {
    return <div className="pricing-loading"><Loader2 className="spin" size={22}/> Loading pricing…</div>
  }

  const packs = catalog.creditPacks as Record<CreditPackKey, {
    name: string
    credits: number
    priceUsd: number
    configured: boolean
  }>
  const packKeys = Object.keys(packs) as CreditPackKey[]
  const balance = billing?.credits ?? 0
  const shortfall = requiredCredits ? Math.max(0, requiredCredits - balance) : 0
  const recommendedKey = shortfall > 0
    ? packKeys.find(key => packs[key].credits >= shortfall)
    : 'creator'
  const current = billing?.subscription

  return <>
    <div className={modal ? 'pricing-panel pricing-panel-modal' : 'pricing-panel'}>
      {modal && <button type="button" className="pricing-close" onClick={onClose} aria-label="Close pricing"><X size={18}/></button>}

      <div className="pricing-head">
        <span className="section-kicker">{modal ? 'Add credits' : 'Pricing'}</span>
        <h2>{modal ? 'Get credits and continue creating' : 'Buy credits once. Create whenever you want.'}</h2>
        {requiredCredits ? (
          <p>
            This generation needs <strong>{requiredCredits}</strong> credits. Your balance is <strong>{balance}</strong>
            {shortfall ? <> · You need <strong>{shortfall}</strong> more.</> : null}
          </p>
        ) : (
          <p>One-time credit packs with no subscription and no automatic renewal. Choose the pack that fits how much you want to create.</p>
        )}
      </div>

      <div className="pricing-value-row" aria-label="Credit pack benefits">
        <span>No subscription</span>
        <span>No auto-renewal</span>
        <span>Failed generations return credits</span>
      </div>

      {error && <div className="pricing-error">{error}</div>}

      <div className="pricing-grid pricing-grid-packs">
        {packKeys.map(key => {
          const pack = packs[key]
          const featured = key === recommendedKey
          return <article key={key} className={featured ? 'pricing-card featured' : 'pricing-card'}>
            {featured && <span className="pricing-badge">{shortfall > 0 ? 'Recommended' : 'Most popular'}</span>}
            <h3>{pack.name}</h3>
            <p className="pricing-capacity"><span>{pack.credits.toLocaleString()}</span> credits</p>
            <div className="pricing-price">
              <strong>${pack.priceUsd.toFixed(2)}</strong>
              <span>one-time</span>
            </div>
            <div className="pricing-feature-title">What you get</div>
            <ul>
              <li><Check size={15}/> One-time purchase — no subscription</li>
              <li><Check size={15}/> Credits valid for 180 days</li>
              <li><Check size={15}/> Failed generations return credits</li>
              <li><Check size={15}/> Use credits on 480p, 720p, or 1080p</li>
            </ul>
            <button
              type="button"
              className="pricing-buy"
              disabled={REVIEW_MODE || Boolean(busy) || !pack.configured}
              onClick={() => void checkout(key)}
            >
              {busy === 'pack-' + key ? <Loader2 className="spin" size={16}/> : <Zap size={16}/>}
              {REVIEW_MODE ? 'Coming Soon' : pack.configured ? 'Buy ' + pack.credits.toLocaleString() + ' credits' : 'Coming soon'}
            </button>
          </article>
        })}
      </div>

      <p className="pricing-fine-print">
        Credits do not renew automatically. Generated videos are charged only when a generation is accepted for processing;
        failed generations return the reserved credits.
      </p>

      {current && <div className="subscription-manage legacy-subscription-manage">
        <div>
          <strong>Existing subscription · {current.plan_code === 'ultimate' ? 'Ultimate' : 'Pro'} · {current.billing_cycle}</strong>
          <span>
            New subscriptions are no longer offered.{' '}
            {current.status === 'scheduled_cancel'
              ? 'Your current subscription ends ' + (current.cancel_at ? new Date(current.cancel_at).toLocaleDateString() : 'at the end of the billing period') + '.'
              : 'Status: ' + current.status + '.'}
          </span>
        </div>
        {current.status === 'scheduled_cancel' && current.payment_provider !== 'waffo'
          ? <button disabled={Boolean(busy)} onClick={() => void resume()}>{busy === 'resume' ? 'Resuming…' : 'Resume existing plan'}</button>
          : current.status === 'scheduled_cancel'
            ? <span>Renewal canceled. Contact support if you need help.</span>
            : <button disabled={Boolean(busy)} onClick={() => void cancel()}>{busy === 'cancel' ? 'Canceling…' : 'Cancel renewal'}</button>}
      </div>}
    </div>

    <AuthModal
      open={authOpen}
      onClose={() => setAuthOpen(false)}
      onAuthed={() => {
        setAuthed(true)
        void refresh()
      }}
    />
  </>
}
