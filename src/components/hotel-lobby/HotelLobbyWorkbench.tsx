import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, Loader2, Plus, X, Zap } from 'lucide-react'
import { getHotelLobbyGenerationTemplate, HOTEL_LOBBY_SCENES } from '@/config/hotel-lobby'
import type { GenerationAspectRatio, GenerationResolution } from '@/config/generation'
import { HOTEL_LOBBY_GENERATION_CONFIG } from '@/config/hotel-lobby-generation'
import { GENERATION_PURCHASE_OPTIONS, generationPriceLabel } from '@/config/generation-purchase'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { AuthModal } from '@/components/auth/AuthModal'
import { ResultsGallery } from '@/components/hotel-lobby/ResultsGallery'
import { createUploadUrl, finalizeUploadedAsset } from '@/server/storage'
import { listGenerationTasks, refreshGenerationTask, retryGenerationTask, type CreateGenerationInput, type GenerationTask } from '@/server/generation'
import { createGenerationPurchase, getGenerationPurchase, requestGenerationRefund } from '@/server/generation-purchases'

type ImageAssetState = {
  previewUrl: string | null
  publicUrl: string | null
  assetId: string | null
  assetToken: string | null
  status: 'empty' | 'uploading' | 'moderating' | 'approved'
}

const emptyImage: ImageAssetState = {
  previewUrl: null,
  publicUrl: null,
  assetId: null,
  assetToken: null,
  status: 'empty',
}

const PURCHASE_RECOVERY_KEY = 'hotel_lobby_generation_purchase_v1'

export function HotelLobbyWorkbench() {
  const [personA, setPersonA] = useState<ImageAssetState>(emptyImage)
  const [personB, setPersonB] = useState<ImageAssetState>(emptyImage)
  const duration = HOTEL_LOBBY_GENERATION_CONFIG.defaultDuration
  const [resolution, setResolution] = useState<GenerationResolution>(HOTEL_LOBBY_GENERATION_CONFIG.defaultResolution)
  const [aspectRatio, setAspectRatio] = useState<GenerationAspectRatio>(HOTEL_LOBBY_GENERATION_CONFIG.defaultAspectRatio)
  const generateAudio = HOTEL_LOBBY_GENERATION_CONFIG.defaultGenerateAudio

  const [authOpen, setAuthOpen] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [pendingGenerate, setPendingGenerate] = useState(false)
  const [submitStage, setSubmitStage] = useState<'idle' | 'checking' | 'checkout' | 'waiting'>('idle')
  const [purchaseOrderId, setPurchaseOrderId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [assetError, setAssetError] = useState('')
  const [tasks, setTasks] = useState<GenerationTask[]>([])
  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null)
  const [refundingTaskId, setRefundingTaskId] = useState<string | null>(null)

  const personARequest = useRef<string | null>(null)
  const personBRequest = useRef<string | null>(null)
  const assetErrorTimer = useRef<number | null>(null)
  const paymentWindowRef = useRef<Window | null>(null)
  const checkoutLockRef = useRef(false)

  const selectedScene = HOTEL_LOBBY_SCENES[0]
  const fixedTemplate = getHotelLobbyGenerationTemplate(duration)
  const priceLabel = generationPriceLabel(resolution)
  const isSubmitting = submitStage !== 'idle'
  const imagesReady = personA.status === 'approved' && personB.status === 'approved'
  const canGenerate = Boolean(imagesReady && !isSubmitting)
  const swapBusy = [personA.status, personB.status].some(status => status === 'uploading' || status === 'moderating')
  const canSwap = Boolean(!isSubmitting && !swapBusy && (personA.previewUrl || personB.previewUrl))

  const showAssetError = (message: string) => {
    setAssetError(message)
    if (assetErrorTimer.current) window.clearTimeout(assetErrorTimer.current)
    assetErrorTimer.current = window.setTimeout(() => setAssetError(''), 6000)
  }

  const loadTasks = async () => {
    try {
      setTasks(await listGenerationTasks())
    } catch {
      setTasks([])
    }
  }

  const clearPurchaseRecovery = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(PURCHASE_RECOVERY_KEY)
      const url = new URL(window.location.href)
      url.searchParams.delete('purchase_return')
      url.searchParams.delete('generation_order')
      window.history.replaceState({}, '', url.pathname + url.search + url.hash)
    }
    setPurchaseOrderId(null)
    checkoutLockRef.current = false
  }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    void supabase.auth.getSession().then(({ data }) => {
      const yes = Boolean(data.session)
      setAuthed(yes)
      if (yes) void loadTasks()
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const yes = Boolean(session)
      setAuthed(yes)
      if (yes) {
        setAuthOpen(false)
        void loadTasks()
      } else {
        setTasks([])
        setPurchaseOrderId(null)
        checkoutLockRef.current = false
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    return () => {
      if (assetErrorTimer.current) window.clearTimeout(assetErrorTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!authed || !tasks.some(task =>
      task.status === 'pending' ||
      task.status === 'processing' ||
      task.generation_order_status === 'refund_requested'
    )) return
    const timer = window.setInterval(() => void refreshActiveTasks(), 3000)
    return () => window.clearInterval(timer)
  }, [authed, tasks])

  useEffect(() => {
    if (!authed || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const queryOrderId = params.get('generation_order')
    const storedOrderId = window.sessionStorage.getItem(PURCHASE_RECOVERY_KEY)
    const orderId = queryOrderId || storedOrderId
    if (orderId) setPurchaseOrderId(orderId)
  }, [authed])

  useEffect(() => {
    if (!authed || !purchaseOrderId) return

    let stopped = false
    let closedPendingChecks = 0
    let detachedPendingChecks = 0
    const poll = async () => {
      if (stopped) return
      try {
        const order = await getGenerationPurchase({ data: { orderId: purchaseOrderId } })

        if (order.status === 'pending_payment' || order.status === 'paid') {
          if (order.status === 'pending_payment' && paymentWindowRef.current?.closed) {
            closedPendingChecks += 1
            // Give Waffo/webhook delivery a short grace period after the buyer
            // closes the checkout tab; payment confirmation can arrive slightly later.
            if (closedPendingChecks >= 10) {
              clearPurchaseRecovery()
              setSubmitStage('idle')
              return
            }
          } else {
            closedPendingChecks = 0
          }

          if (order.status === 'pending_payment' && !paymentWindowRef.current) {
            detachedPendingChecks += 1
            // A reload loses the checkout-window handle. Do not lock the draft
            // forever if the stored checkout was abandoned.
            if (detachedPendingChecks >= 40) {
              clearPurchaseRecovery()
              setSubmitStage('idle')
              return
            }
          } else {
            detachedPendingChecks = 0
          }

          window.setTimeout(() => void poll(), 1500)
          return
        }

        if (order.status === 'processing' || order.status === 'failed' || order.status === 'fulfilled') {
          paymentWindowRef.current?.close()
          paymentWindowRef.current = null
          await loadTasks()
          clearPurchaseRecovery()
          setSubmitStage('idle')
          return
        }

        if (order.status === 'refund_requested' || order.status === 'refunded') {
          await loadTasks()
          clearPurchaseRecovery()
          setSubmitStage('idle')
          return
        }
      } catch {
        window.setTimeout(() => void poll(), 1800)
      }
    }

    setSubmitStage('waiting')
    void poll()
    return () => {
      stopped = true
    }
  }, [authed, purchaseOrderId])

  const refreshActiveTasks = async () => {
    const active = tasks.filter(task =>
      task.status === 'pending' ||
      task.status === 'processing' ||
      task.generation_order_status === 'refund_requested'
    )
    if (!active.length) return
    const updates = await Promise.all(
      active.map(task => refreshGenerationTask({ data: { taskId: task.id } }).catch(() => task)),
    )
    const map = new Map(updates.map(task => [task.id, task]))
    setTasks(current => current.map(task => map.get(task.id) || task))
  }

  const uploadFile = async (file: File) => {
    const signed = await createUploadUrl({ data: { fileName: file.name, mimeType: file.type, kind: 'image' } })
    const response = await fetch(signed.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    if (!response.ok) throw new Error('UPLOAD_FAILED')
    return signed
  }

  const prepareImage = async (
    file: File | undefined,
    slot: 'A' | 'B',
  ) => {
    if (!file) return
    const requestId = crypto.randomUUID()
    const requestRef = slot === 'A' ? personARequest : personBRequest
    const setter = slot === 'A' ? setPersonA : setPersonB
    requestRef.current = requestId
    setError('')
    setAssetError('')

    const previewUrl = URL.createObjectURL(file)
    setter(current => {
      if (current.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(current.previewUrl)
      return { previewUrl, publicUrl: null, assetId: null, assetToken: null, status: 'uploading' }
    })

    try {
      const signed = await uploadFile(file)
      if (requestRef.current !== requestId) return
      setter(current => ({
        ...current,
        publicUrl: signed.publicUrl,
        assetId: signed.assetId,
        assetToken: signed.assetToken,
        status: 'moderating',
      }))

      const finalized = await finalizeUploadedAsset({
        data: { assetId: signed.assetId, assetToken: signed.assetToken },
      })
      if (requestRef.current !== requestId) return

      setter(current => ({
        ...current,
        publicUrl: finalized.publicUrl,
        assetId: finalized.assetId,
        assetToken: finalized.assetToken,
        status: 'approved',
      }))
    } catch (e) {
      if (requestRef.current !== requestId) return
      requestRef.current = null
      setter(current => {
        if (current.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(current.previewUrl)
        return emptyImage
      })
      const message = e instanceof Error ? e.message : 'IMAGE_MODERATION_UNAVAILABLE'
      showAssetError(
        message.includes('IMAGE_REJECTED')
          ? 'This image can’t be used. Please choose another image.'
          : message.includes('UNSUPPORTED_FILE_TYPE')
            ? 'Please choose a JPG, PNG, or WebP image.'
            : 'We couldn’t verify this image right now. Please try again shortly.',
      )
    }
  }

  const clearImage = (slot: 'A' | 'B') => {
    const requestRef = slot === 'A' ? personARequest : personBRequest
    const setter = slot === 'A' ? setPersonA : setPersonB
    requestRef.current = null
    setter(current => {
      if (current.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(current.previewUrl)
      return emptyImage
    })
  }

  const swapPerformers = () => {
    if (!canSwap) return
    setError('')
    setAssetError('')
    setPersonA(personB)
    setPersonB(personA)
  }

  const buildGenerationInput = (): CreateGenerationInput | null => {
    if (
      personA.status !== 'approved' ||
      personB.status !== 'approved' ||
      !personA.publicUrl ||
      !personB.publicUrl ||
      !personA.assetId ||
      !personB.assetId ||
      !personA.assetToken ||
      !personB.assetToken
    ) return null

    return {
      imageAAssetId: personA.assetId,
      imageAAssetToken: personA.assetToken,
      imageBAssetId: personB.assetId,
      imageBAssetToken: personB.assetToken,
      referenceVideoAssetId: null,
      referenceVideoAssetToken: null,
      imageAUrl: personA.publicUrl,
      imageBUrl: personB.publicUrl,
      referenceTemplateId: fixedTemplate.id,
      referenceVideoUrl: fixedTemplate.sourceVideoUrl,
      prompt: selectedScene.prompt,
      duration,
      resolution,
      aspectRatio,
      generateAudio,
    }
  }

  const startCheckout = async () => {
    if (isSubmitting || checkoutLockRef.current) return
    const data = buildGenerationInput()
    if (!data) return

    checkoutLockRef.current = true
    const paymentTab = window.open('about:blank', '_blank')
    if (!paymentTab) {
      checkoutLockRef.current = false
      setError('Please allow popups so we can open the secure Waffo checkout.')
      return
    }
    paymentTab.opener = null
    paymentWindowRef.current = paymentTab

    setError('')
    setSubmitStage('checking')

    try {
      const purchase = await createGenerationPurchase({ data })
      window.sessionStorage.setItem(PURCHASE_RECOVERY_KEY, purchase.orderId)
      setPurchaseOrderId(purchase.orderId)
      setSubmitStage('checkout')
      paymentTab.location.replace(purchase.checkoutUrl)
      setPendingGenerate(false)
    } catch (e) {
      paymentTab.close()
      paymentWindowRef.current = null
      checkoutLockRef.current = false
      setSubmitStage('idle')
      setError(friendlyError(e instanceof Error ? e.message : 'Unable to start checkout'))
    }
  }

  const onGenerate = async () => {
    if (!canGenerate) return
    if (!authed) {
      setPendingGenerate(true)
      setAuthOpen(true)
      return
    }
    await startCheckout()
  }

  const handleRetry = async (taskId: string) => {
    if (retryingTaskId || refundingTaskId) return
    setRetryingTaskId(taskId)
    setError('')

    try {
      const task = await retryGenerationTask({ data: { taskId } }) as GenerationTask
      setTasks(current => [
        task,
        ...current.filter(item =>
          item.id !== taskId &&
          (!task.generation_order_id || item.generation_order_id !== task.generation_order_id)
        ),
      ])
    } catch (e) {
      setError(friendlyError(e instanceof Error ? e.message : 'Retry failed'))
    } finally {
      setRetryingTaskId(null)
    }
  }

  const handleRefund = async (taskId: string) => {
    if (retryingTaskId || refundingTaskId) return
    setRefundingTaskId(taskId)
    setError('')

    try {
      await requestGenerationRefund({ data: { taskId } })
      const refreshed = await refreshGenerationTask({ data: { taskId } })
      setTasks(current => current.map(task => task.id === taskId ? refreshed : task))
    } catch (e) {
      setError(friendlyError(e instanceof Error ? e.message : 'Refund request failed'))
    } finally {
      setRefundingTaskId(null)
    }
  }

  const handleAuthed = () => {
    setAuthed(true)
    void loadTasks()
    if (pendingGenerate) window.setTimeout(() => void startCheckout(), 150)
  }

  return <div className="workbench-shell">
    <div className="generator-layout">
      <div className="workbench generator-workbench">
        <div className="generator-section-heading">
          <span className="generator-step">01</span>
          <div>
            <strong>Add your performers</strong>
            <small>Upload one clear photo for each side.</small>
          </div>
        </div>

        <div className="performer-pair">
          <ImageUpload
            label="Left Performer"
            state={personA}
            onPick={(file) => void prepareImage(file, 'A')}
            onClear={() => clearImage('A')}
            disabled={isSubmitting}
          />
          <button
            type="button"
            className="performer-swap"
            disabled={!canSwap}
            onClick={swapPerformers}
            title="Swap left and right performers"
            aria-label="Swap left and right performers"
          >
            <ArrowLeftRight size={17} />
          </button>
          <ImageUpload
            label="Right Performer"
            state={personB}
            onPick={(file) => void prepareImage(file, 'B')}
            onClear={() => clearImage('B')}
            disabled={isSubmitting}
          />
        </div>
        <p className="performer-help">One clear person or pet per photo. Keep the face or muzzle visible and use an original, well-lit image.</p>

        {assetError && <div className="asset-error" role="alert">{assetError}</div>}

        <div className="generator-divider" />

        <div className="generator-section-heading output-heading">
          <span className="generator-step">02</span>
          <div>
            <strong>Choose your output</strong>
            <small>Hotel Lobby motion is preset for a consistent result.</small>
          </div>
        </div>

        <div className="fixed-output-meta" aria-label="Included output settings">
          <span><b>15 sec</b> video</span>
          <span>Template motion</span>
          <span>Soundtrack included</span>
        </div>

        <div className="output-control">
          <div className="output-control-head">
            <span>Format</span>
            <small>Choose where you plan to post</small>
          </div>
          <div className="format-options">
            {(['9:16', '16:9'] as GenerationAspectRatio[]).map(value => (
              <button
                key={value}
                type="button"
                className={`format-option ${aspectRatio === value ? 'active' : ''}`}
                aria-pressed={aspectRatio === value}
                disabled={isSubmitting}
                onClick={() => setAspectRatio(value)}
              >
                <strong>{value === '9:16' ? 'Vertical' : 'Landscape'}</strong>
                <span>{value}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="output-control">
          <div className="output-control-head">
            <span>Quality</span>
            <small>One-time price per generated video</small>
          </div>
          <div className="quality-options">
            {HOTEL_LOBBY_GENERATION_CONFIG.resolutions.map(value => {
              const option = GENERATION_PURCHASE_OPTIONS[value]
              return (
                <button
                  key={value}
                  type="button"
                  className={`quality-option ${resolution === value ? 'active' : ''}`}
                  aria-pressed={resolution === value}
                  disabled={isSubmitting}
                  onClick={() => setResolution(value)}
                >
                  <strong>{value.toUpperCase()}</strong>
                  <span>{option.name}{option.recommended ? ' · Recommended' : ''}</span>
                  <small>{generationPriceLabel(value)}</small>
                </button>
              )
            })}
          </div>
        </div>

        {error && <div className="generation-error">{error}</div>}

        <div className="generation-summary generation-price-summary">
          <span>15-second video</span>
          <span>One-time payment <b>{priceLabel}</b></span>
        </div>

        <button disabled={!canGenerate} className="generate generator-submit" onClick={() => void onGenerate()}>
          {isSubmitting ? <Loader2 size={16} className="spin"/> : <Zap size={16} fill="currentColor"/>}
          {submitStage === 'checking' ? 'Checking your images…' :
           submitStage === 'checkout' ? 'Opening secure checkout…' :
           submitStage === 'waiting' ? 'Waiting for payment…' :
           `Generate for ${priceLabel}`}
        </button>

        <div className="generator-trust-row">
          <span>No subscription</span>
          <span>Free retries if generation fails</span>
          <span>Refund available after a failed attempt</span>
        </div>

        <p className="generator-safety-note">
          For human performers, only upload images of adults whose likeness you have permission to use. Pets are supported. NSFW content, minors, deceptive impersonation, and unauthorized likeness use are prohibited.{' '}
          <a href="/terms-of-service#acceptable-use">Content policy</a>{' · '}
          <a href="/terms-of-service#reporting">Report content</a>
        </p>
      </div>

      <div className="generator-results">
        <ResultsGallery
          tasks={tasks}
          latestOnly
          onRetry={(taskId) => void handleRetry(taskId)}
          retryingTaskId={retryingTaskId}
          onRefund={(taskId) => void handleRefund(taskId)}
          refundingTaskId={refundingTaskId}
        />
      </div>
    </div>

    <AuthModal
      open={authOpen}
      onClose={() => {
        setAuthOpen(false)
        setPendingGenerate(false)
      }}
      onAuthed={handleAuthed}
    />
  </div>
}

function friendlyError(message: string) {
  if (message.includes('PROMPT_REJECTED')) return 'This request can’t be generated. Please try again with different source photos.'
  if (message.includes('MODERATION_UNAVAILABLE')) return 'Safety check is temporarily unavailable. Please try again shortly.'
  if (message.includes('REFERENCE_IMAGES_NOT_READY') || message.includes('IMAGE_A_NOT_READY') || message.includes('IMAGE_B_NOT_READY')) {
    return 'Please choose your two reference images again.'
  }
  if (message.includes('REFERENCE_VIDEO_NOT_READY')) return 'The preset performance is temporarily unavailable. Please try again shortly.'
  if (message.includes('WAFFO_GENERATION_PRODUCT_NOT_CONFIGURED')) return 'This video quality is not connected to checkout yet.'
  if (message.includes('DIRECT_GENERATION_REQUIRES_WAFFO')) return 'Secure checkout is temporarily unavailable.'
  if (message.includes('REFUND_NOT_AVAILABLE')) return 'A refund is only available after a failed paid generation.'
  if (message.includes('REFUND_SUPPORT_REQUIRED')) return 'The previous refund request could not complete. Please contact support for this payment.'
  if (message.includes('PAYMENT_NOT_READY')) return 'Payment confirmation is still syncing. Please try again in a moment.'
  if (message.includes('AUTH_REQUIRED')) return 'Please sign in and try again.'
  return message
}

function ImageUpload({
  label,
  state,
  onPick,
  onClear,
  disabled = false,
}: {
  label: string
  state: ImageAssetState
  onPick: (file?: File) => void
  onClear: () => void
  disabled?: boolean
}) {
  return <label className={`image-slot ${disabled ? 'image-slot-disabled' : ''}`}>
    <span className="image-slot-label">{label}</span>
    <div className="asset-tile">
      {state.previewUrl ? <img src={state.previewUrl} alt=""/> : <Plus size={22}/>}
      {state.status === 'uploading' && (
        <span className="asset-uploading" aria-label="Uploading">
          <Loader2 size={18} className="spin" />
        </span>
      )}
    </div>
    {state.previewUrl && <button type="button" className="remove-asset" disabled={disabled} onClick={(event) => {
      event.preventDefault()
      if (!disabled) onClear()
    }}><X size={11}/></button>}
    <input
      hidden
      disabled={disabled}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      onChange={(event) => {
        const file = event.target.files?.[0]
        event.currentTarget.value = ''
        onPick(file)
      }}
    />
  </label>
}
