import { useEffect, useMemo, useState } from 'react'
import { Check, CreditCard, Loader2, X, Zap } from 'lucide-react'
import { AuthModal } from '@/components/auth/AuthModal'
import { REVIEW_MODE } from '@/config/feature-flags'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  cancelSubscription,
  changeSubscription,
  createCheckout,
  getBillingState,
  getPricingCatalog,
  resumeSubscription,
} from '@/server/billing'
import type { BillingCycle, CreditPackKey } from '@/config/products'

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
  const [pricingMode, setPricingMode] = useState<'monthly' | 'yearly' | 'credits'>(modal ? 'credits' : 'monthly')
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

  const checkout = async (input:
    | { type: 'credit_pack'; key: CreditPackKey }
    | { type: 'subscription'; plan: 'pro' | 'ultimate'; cycle: BillingCycle }
  ) => {
    if (REVIEW_MODE) return
    if (!requireAuth()) return
    const key = input.type === 'credit_pack' ? `pack-${input.key}` : `plan-${input.plan}-${input.cycle}`
    setBusy(key)
    setError('')
    const paymentTab = catalog?.provider === 'waffo' ? window.open('about:blank', '_blank') : null
    if (catalog?.provider === 'waffo' && !paymentTab) {
      setError('Please allow popups to open the secure checkout.')
      setBusy('')
      return
    }
    if (paymentTab) paymentTab.opener = null
    try {
      const result = await createCheckout({ data: { ...input, returnPath } })
      if (paymentTab) paymentTab.location.replace(result.checkoutUrl)
      else window.location.assign(result.checkoutUrl)
      setBusy('')
    } catch (e) {
      paymentTab?.close()
      setError(e instanceof Error ? e.message : 'Unable to start checkout')
      setBusy('')
    }
  }

  const selectPlan = async (plan: 'pro' | 'ultimate') => {
    if (REVIEW_MODE) return
    if (!requireAuth()) return
    const current = billing?.subscription
    if (!current || !['active','trialing','scheduled_cancel'].includes(current.status)) {
      return checkout({ type: 'subscription', plan, cycle })
    }
    if (current.plan_code === plan && current.billing_cycle === cycle && current.status !== 'scheduled_cancel') return

    setBusy(`plan-${plan}-${cycle}`)
    setError('')
    const paymentTab = current.payment_provider === 'waffo' ? window.open('about:blank', '_blank') : null
    if (current.payment_provider === 'waffo' && !paymentTab) {
      setError('Please allow popups to confirm your plan change.')
      setBusy('')
      return
    }
    if (paymentTab) paymentTab.opener = null
    try {
      const result = await changeSubscription({ data: { plan, cycle } })
      if (result.checkoutUrl && paymentTab) paymentTab.location.replace(result.checkoutUrl)
      else paymentTab?.close()
      await refresh()
    } catch (e) {
      paymentTab?.close()
      setError(e instanceof Error ? e.message : 'Unable to change plan')
    } finally {
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
    } finally { setBusy('') }
  }

  const resume = async () => {
    setBusy('resume')
    setError('')
    try {
      await resumeSubscription()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to resume subscription')
    } finally { setBusy('') }
  }

  if (!catalog) {
    return <div className="pricing-loading"><Loader2 className="spin" size={22}/> Loading pricing…</div>
  }

  const packs = catalog.creditPacks as Record<CreditPackKey, { name: string; credits: number; priceUsd: number; configured: boolean }>
  const current = billing?.subscription
  const balance = billing?.credits ?? 0
  const shortfall = requiredCredits ? Math.max(0, requiredCredits - balance) : 0
  const cycle: BillingCycle = pricingMode === 'yearly' ? 'yearly' : 'monthly'

  return <>
    <div className={modal ? 'pricing-panel pricing-panel-modal' : 'pricing-panel'}>
      {modal && <button type="button" className="pricing-close" onClick={onClose}><X size={18}/></button>}
      <div className="pricing-head">
        <span className="section-kicker">{modal ? 'Continue creating' : 'Pricing'}</span>
        <h2>{modal ? 'Choose how to continue' : 'Simple plans for Hotel Lobby AI'}</h2>
        {requiredCredits ? <p>You need <strong>{requiredCredits}</strong> credits. Balance: <strong>{balance}</strong>{shortfall ? <> · Shortfall: <strong>{shortfall}</strong></> : null}</p> :
          <p>Subscribe for monthly credits or buy a one-time credit pack. Paid credits work across Hotel Lobby AI generations.</p>}
      </div>

      <div className="pricing-switcher" role="tablist" aria-label="Pricing options">
        <button
          type="button"
          className={pricingMode === 'monthly' ? 'active' : ''}
          onClick={() => setPricingMode('monthly')}
        >
          Monthly
        </button>
        <button
          type="button"
          className={pricingMode === 'yearly' ? 'active' : ''}
          onClick={() => setPricingMode('yearly')}
        >
          Yearly {!REVIEW_MODE && <span>Save 20%</span>}
        </button>
        <button
          type="button"
          className={pricingMode === 'credits' ? 'active' : ''}
          onClick={() => setPricingMode('credits')}
        >
          Credit Packs
        </button>
      </div>

      {error && <div className="pricing-error">{error}</div>}

      {pricingMode === 'credits' ? (
        <div className="pricing-grid pricing-grid-packs">
          {(Object.keys(packs) as CreditPackKey[]).map((key, index) => {
            const pack = packs[key]
            const recommended = shortfall > 0 && pack.credits >= shortfall &&
              (index === 0 || packs[(Object.keys(packs) as CreditPackKey[])[index - 1]].credits < shortfall)
            const featured = recommended || (!modal && key === 'creator')
            return <article key={key} className={featured ? 'pricing-card featured' : 'pricing-card'}>
              {featured && <span className="pricing-badge">{recommended ? 'Recommended' : 'Most popular'}</span>}
              <h3>{pack.name}</h3>
              <p className="pricing-capacity"><span>{pack.credits.toLocaleString()}</span> credits</p>
              <div className={REVIEW_MODE ? 'pricing-price pricing-price-pending' : 'pricing-price'}>
                <strong>{REVIEW_MODE ? 'Coming Soon' : `$${pack.priceUsd.toFixed(2)}`}</strong>
                {!REVIEW_MODE && <span>one-time</span>}
              </div>
              <div className="pricing-feature-title">Included</div>
              <ul>
                <li><Check size={15}/> Credits valid for 180 days</li>
                <li><Check size={15}/> No subscription required</li>
                <li><Check size={15}/> Use for any Hotel Lobby AI generation</li>
              </ul>
              <button
                type="button"
                className="pricing-buy"
                disabled={REVIEW_MODE || Boolean(busy) || !pack.configured}
                onClick={() => void checkout({ type: 'credit_pack', key })}
              >
                {busy === `pack-${key}` ? <Loader2 className="spin" size={16}/> : <Zap size={16}/>}
                {REVIEW_MODE ? 'Coming Soon' : pack.configured ? `Buy ${pack.name}` : 'Coming soon'}
              </button>
            </article>
          })}
        </div>
      ) : (
        <div className={modal ? 'pricing-grid pricing-grid-paid' : 'pricing-grid pricing-grid-plans'}>
          {(['pro','ultimate'] as const).map(planId => {
            const plan = catalog.plans[planId]
            const monthlyDisplay = cycle === 'monthly' ? plan.monthlyPriceUsd : plan.yearlyMonthlyEquivalentUsd
            const isCurrent = current?.plan_code === planId && current?.billing_cycle === cycle && current?.status !== 'scheduled_cancel'
            const configured = cycle === 'monthly' ? plan.monthlyConfigured : plan.yearlyConfigured
            return <article key={planId} className={planId === 'ultimate' ? 'pricing-card featured' : 'pricing-card'}>
              {planId === 'ultimate' && <span className="pricing-badge">Most popular</span>}
              <h3>{plan.name}</h3>
              <p className="pricing-capacity"><span>{plan.monthlyCredits.toLocaleString()}</span> credits / month</p>
              <div className={REVIEW_MODE ? 'pricing-price pricing-price-pending' : 'pricing-price'}>
                <strong>{REVIEW_MODE ? 'Coming Soon' : `$${monthlyDisplay.toFixed(2)}`}</strong>
                {!REVIEW_MODE && <span>/mo</span>}
              </div>
              {!REVIEW_MODE && cycle === 'yearly' && <p className="pricing-billed">Billed ${plan.yearlyPriceUsd.toFixed(2)} yearly</p>}
              <div className="pricing-feature-title">Supported features</div>
              <ul>
                <li><Check size={15}/> Two-performer AI video generation</li>
                <li><Check size={15}/> People and pet photo inputs</li>
                <li><Check size={15}/> Preset scenes and guided performances</li>
                <li><Check size={15}/> No watermark on generated results</li>
              </ul>
              <button
                type="button"
                className="pricing-buy"
                disabled={REVIEW_MODE || Boolean(busy) || isCurrent || !configured}
                onClick={() => void selectPlan(planId)}
              >
                {busy === `plan-${planId}-${cycle}` ? <Loader2 className="spin" size={16}/> : <CreditCard size={16}/>}
                {REVIEW_MODE ? 'Coming Soon' : isCurrent ? 'Current plan' : !configured ? 'Coming soon' : current ? 'Switch plan' : `Choose ${plan.name}`}
              </button>
            </article>
          })}
        </div>
      )}

      {current && <div className="subscription-manage">
        <div>
          <strong>{current.plan_code === 'ultimate' ? 'Ultimate' : 'Pro'} · {current.billing_cycle}</strong>
          <span>{current.status === 'scheduled_cancel' ? `Cancels ${current.cancel_at ? new Date(current.cancel_at).toLocaleDateString() : 'at period end'}` : `Status: ${current.status}`}</span>
        </div>
        {current.status === 'scheduled_cancel' && current.payment_provider === 'waffo'
          ? <span>Renewal canceled. Manage changes through Waffo or contact support.</span>
          : current.status === 'scheduled_cancel'
          ? <button disabled={Boolean(busy)} onClick={() => void resume()}>{busy === 'resume' ? 'Resuming…' : 'Resume subscription'}</button>
          : <button disabled={Boolean(busy)} onClick={() => void cancel()}>{busy === 'cancel' ? 'Canceling…' : 'Cancel renewal'}</button>}
      </div>}
    </div>

    <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthed={() => { setAuthed(true); void refresh() }} />
  </>
}
