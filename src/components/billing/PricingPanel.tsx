import { useEffect, useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { GENERATION_PURCHASE_OPTIONS, generationPriceLabel } from '@/config/generation-purchase'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cancelSubscription, getBillingState, resumeSubscription } from '@/server/billing'

type BillingState = Awaited<ReturnType<typeof getBillingState>>

export function PricingPanel({
  modal = false,
  onClose,
}: {
  modal?: boolean
  onClose?: () => void
}) {
  const [billing, setBilling] = useState<BillingState | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const refresh = async () => {
    try {
      const state = await getBillingState()
      setBilling(state)
      return state
    } catch {
      setBilling(null)
      return null
    }
  }

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void refresh()
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void refresh()
      else setBilling(null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

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

  const current = billing?.subscription
  const options = Object.values(GENERATION_PURCHASE_OPTIONS)

  return <div className={modal ? 'pricing-panel pricing-panel-modal' : 'pricing-panel'}>
    {modal && <button type="button" className="pricing-close" onClick={onClose} aria-label="Close pricing"><X size={18}/></button>}

    <div className="pricing-head">
      <span className="section-kicker">Pricing</span>
      <h2>Pay for one video. No subscription.</h2>
      <p>Every purchase creates one 15-second Hotel Lobby video at the quality you choose. If a technical generation fails, retry the same paid order for free or request a refund.</p>
    </div>

    <div className="pricing-value-row" aria-label="Purchase benefits">
      <span>No subscription</span>
      <span>Free retries after failed generations</span>
      <span>Refund request after a failed attempt</span>
    </div>

    {error && <div className="pricing-error">{error}</div>}

    <div className="pricing-grid pricing-grid-packs pricing-grid-generation">
      {options.map(option => (
        <article key={option.resolution} className={option.recommended ? 'pricing-card featured' : 'pricing-card'}>
          {option.recommended && <span className="pricing-badge">Recommended</span>}
          <h3>{option.resolution.toUpperCase()}</h3>
          <p className="pricing-capacity"><span>{option.name}</span> · 15-second video</p>

          <div className="pricing-price">
            <strong>{generationPriceLabel(option.resolution)}</strong>
            <span>one-time</span>
          </div>

          <div className="pricing-feature-title">Included</div>
          <ul>
            <li><Check size={15}/> One completed Hotel Lobby video</li>
            <li><Check size={15}/> 9:16 Vertical or 16:9 Landscape</li>
            <li><Check size={15}/> Template motion and soundtrack included</li>
            <li><Check size={15}/> Free retries if technical generation fails</li>
            <li><Check size={15}/> Direct MP4 download after completion</li>
          </ul>

          <a className="pricing-buy pricing-buy-link" href="/#generator">
            Create {option.resolution.toUpperCase()} video
          </a>
        </article>
      ))}
    </div>

    <p className="pricing-fine-print">
      A payment covers one successful result for the selected source images, performer positions, format, and quality.
      Changing those inputs starts a new purchase. Refunds are available after a technical generation failure and are submitted through Waffo.
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
}
