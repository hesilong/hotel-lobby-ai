import { useEffect, useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { GENERATION_PURCHASE_OPTIONS, generationPriceLabel } from '@/config/generation-purchase'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cancelSubscription, getBillingState, resumeSubscription } from '@/server/billing'
import { useI18n } from '@/i18n/useI18n'

type BillingState = Awaited<ReturnType<typeof getBillingState>>

export function PricingPanel({
  modal = false,
  onClose,
}: {
  modal?: boolean
  onClose?: () => void
}) {
  const { messages, localize } = useI18n()
  const m = messages.pricing
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
      setError(e instanceof Error ? e.message : m.cancelError)
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
      setError(e instanceof Error ? e.message : m.resumeError)
    } finally {
      setBusy('')
    }
  }

  const current = billing?.subscription
  const options = Object.values(GENERATION_PURCHASE_OPTIONS)

  return <div className={modal ? 'pricing-panel pricing-panel-modal' : 'pricing-panel'}>
    {modal && <button type="button" className="pricing-close" onClick={onClose} aria-label={m.close}><X size={18}/></button>}

    <div className="pricing-head">
      <span className="section-kicker">{m.kicker}</span>
      <h2>{m.title}</h2>
      <p>{m.description}</p>
    </div>

    <div className="pricing-value-row" aria-label={m.title}>
      <span>{m.noSubscription}</span>
      <span>{m.freeRetries}</span>
      <span>{m.refundAfterFailure}</span>
    </div>

    {error && <div className="pricing-error">{error}</div>}

    <div className="pricing-grid pricing-grid-packs pricing-grid-generation">
      {options.map(option => (
        <article key={option.resolution} className={option.recommended ? 'pricing-card featured' : 'pricing-card'}>
          {option.recommended && <span className="pricing-badge">{m.recommended}</span>}
          <h3>{option.resolution.toUpperCase()}</h3>
          <p className="pricing-capacity"><span>{option.name}</span> · {m.videoLength}</p>

          <div className="pricing-price">
            <strong>{generationPriceLabel(option.resolution)}</strong>
            <span>{m.oneTime}</span>
          </div>

          <div className="pricing-feature-title">{m.included}</div>
          <ul>
            <li><Check size={15}/> {m.completedVideo}</li>
            <li><Check size={15}/> {m.formats}</li>
            <li><Check size={15}/> {m.motionSoundtrack}</li>
            <li><Check size={15}/> {m.freeRetries}</li>
            <li><Check size={15}/> {m.directDownload}</li>
          </ul>

          <a className="pricing-buy pricing-buy-link" href={localize('/#generator')}>
            {m.createVideo(option.resolution.toUpperCase())}
          </a>
        </article>
      ))}
    </div>

    <p className="pricing-fine-print">{m.finePrint}</p>

    {current && <div className="subscription-manage legacy-subscription-manage">
      <div>
        <strong>{m.existingSubscription} · {current.plan_code === 'ultimate' ? 'Ultimate' : 'Pro'} · {current.billing_cycle}</strong>
        <span>
          {m.subscriptionsClosed}{' '}
          {current.status === 'scheduled_cancel' ? m.renewalCanceled : `${m.status}: ${current.status}.`}
        </span>
      </div>
      {current.status === 'scheduled_cancel' && current.payment_provider !== 'waffo'
        ? <button disabled={Boolean(busy)} onClick={() => void resume()}>{busy === 'resume' ? m.resuming : m.resumePlan}</button>
        : current.status === 'scheduled_cancel'
          ? <span>{m.renewalCanceled}</span>
          : <button disabled={Boolean(busy)} onClick={() => void cancel()}>{busy === 'cancel' ? m.canceling : m.cancelRenewal}</button>}
    </div>}
  </div>
}
