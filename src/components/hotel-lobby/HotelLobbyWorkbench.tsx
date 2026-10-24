import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, Loader2, Mail, Plus, X, Zap } from 'lucide-react'
import { getHotelLobbyGenerationTemplate, HOTEL_LOBBY_SCENES } from '@/config/hotel-lobby'
import type { GenerationAspectRatio, GenerationResolution } from '@/config/generation'
import { HOTEL_LOBBY_GENERATION_CONFIG } from '@/config/hotel-lobby-generation'
import { GENERATION_PURCHASE_OPTIONS, generationPriceLabel } from '@/config/generation-purchase'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { AuthModal } from '@/components/auth/AuthModal'
import { ResultsGallery } from '@/components/hotel-lobby/ResultsGallery'
import { createUploadUrl, finalizeUploadedAsset, recordUploadFailure } from '@/server/storage'
import { listGenerationTasks, refreshGenerationTask, retryGenerationTask, type CreateGenerationInput, type GenerationTask } from '@/server/generation'
import { createGenerationPurchase, getGenerationPurchase, requestGenerationRefund } from '@/server/generation-purchases'
import { useI18n } from '@/i18n/useI18n'
import type { Messages } from '@/i18n/messages'

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
const PURCHASE_CHECKOUT_MODE_KEY = 'hotel_lobby_generation_checkout_mode_v1'

export function HotelLobbyWorkbench() {
  const { messages } = useI18n()
  const m = messages.workbench
  const [personA, setPersonA] = useState<ImageAssetState>(emptyImage)
  const [personB, setPersonB] = useState<ImageAssetState>(emptyImage)
  const duration = HOTEL_LOBBY_GENERATION_CONFIG.defaultDuration
  const [resolution, setResolution] = useState<GenerationResolution>(HOTEL_LOBBY_GENERATION_CONFIG.defaultResolution)
  const [aspectRatio, setAspectRatio] = useState<GenerationAspectRatio>(HOTEL_LOBBY_GENERATION_CONFIG.defaultAspectRatio)
  const [notifyOnComplete, setNotifyOnComplete] = useState(true)
  const generateAudio = HOTEL_LOBBY_GENERATION_CONFIG.defaultIncludeSoundtrack

  const [authOpen, setAuthOpen] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [pendingGenerate, setPendingGenerate] = useState(false)
  const [submitStage, setSubmitStage] = useState<'idle' | 'checking' | 'checkout' | 'waiting' | 'payment-check'>('idle')
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
  const generatorResultsRef = useRef<HTMLDivElement | null>(null)
  const paymentScrollOrderRef = useRef<string | null>(null)

  const selectedScene = HOTEL_LOBBY_SCENES[0]
  const fixedTemplate = getHotelLobbyGenerationTemplate(duration)

  const shouldUseSamePageCheckout = () => {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent || ''
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
    const inAppBrowser =
      /FBAN|FBAV|Instagram|Line\/|TikTok|BytedanceWebview|GSA\/|GoogleApp/i.test(ua)
    return mobile || inAppBrowser
  }
  const scrollToGenerationResultsAfterPayment = (orderId: string) => {
    if (
      typeof window === 'undefined' ||
      !shouldUseSamePageCheckout() ||
      paymentScrollOrderRef.current === orderId
    ) return

    paymentScrollOrderRef.current = orderId
    window.requestAnimationFrame(() => {
      generatorResultsRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

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
      window.sessionStorage.removeItem(PURCHASE_CHECKOUT_MODE_KEY)
      const url = new URL(window.location.href)
      url.searchParams.delete('purchase_return')
      url.searchParams.delete('generation_order')
      window.history.replaceState({}, '', url.pathname + url.search + url.hash)
    }
    setPurchaseOrderId(null)
    checkoutLockRef.current = false
  }

  const checkoutReturnState = (orderId: string) => {
    const checkout = paymentWindowRef.current
    if (!checkout || checkout.closed || typeof window === 'undefined') return null

    try {
      const url = new URL(checkout.location.href)
      if (url.origin !== window.location.origin) return null

      const returnedOrderId = url.searchParams.get('generation_order')
      const successfulReturn =
        url.searchParams.get('purchase_return') === '1' &&
        returnedOrderId === orderId

      return successfulReturn ? 'success' as const : 'cancelled' as const
    } catch {
      // Reading location throws while the checkout is still cross-origin on Waffo.
      return null
    }
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
      task.audio_status === 'pending' ||
      task.audio_status === 'processing' ||
      (task.status === 'completed' &&
        (task.storage_status === 'pending' || task.storage_status === 'fallback')) ||
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
    if (!authed || !purchaseOrderId || typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const checkoutMode = window.sessionStorage.getItem(PURCHASE_CHECKOUT_MODE_KEY)
    const successfulReturn =
      params.get('purchase_return') === '1' &&
      params.get('generation_order') === purchaseOrderId

    const legacySamePageReturn =
      !checkoutMode && shouldUseSamePageCheckout()

    if ((checkoutMode !== 'same-page' && !legacySamePageReturn) || successfulReturn) return

    let stopped = false
    setSubmitStage('payment-check')

    const resolveSamePageReturn = async () => {
      // Browser Back from a same-page Waffo checkout has no success marker.
      // Allow a short webhook grace period, then release an unpaid order.
      for (let attempt = 0; attempt < 3 && !stopped; attempt += 1) {
        try {
          const order = await getGenerationPurchase({ data: { orderId: purchaseOrderId } })

          if (order.status !== 'pending_payment') {
            await loadTasks()
            scrollToGenerationResultsAfterPayment(purchaseOrderId)
            clearPurchaseRecovery()
            setSubmitStage('idle')
            return
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : ''
          if (message.includes('GENERATION_ORDER_NOT_FOUND')) {
            clearPurchaseRecovery()
            setSubmitStage('idle')
            return
          }
        }

        if (attempt < 2) {
          await new Promise(resolve => window.setTimeout(resolve, 800))
        }
      }

      if (!stopped) {
        clearPurchaseRecovery()
        setSubmitStage('idle')
      }
    }

    void resolveSamePageReturn()

    return () => {
      stopped = true
    }
  }, [authed, purchaseOrderId])

  useEffect(() => {
    if (!authed || !purchaseOrderId || typeof window === 'undefined') return

    let stopped = false
    let recovering = false

    const resolveClosedCheckout = async () => {
      const checkout = paymentWindowRef.current
      if (!checkout || !checkout.closed || recovering || stopped) return

      recovering = true
      paymentWindowRef.current = null
      setSubmitStage('payment-check')

      // Closing the checkout can race with a successful payment webhook.
      // Give the backend a short grace period before treating the checkout
      // as abandoned.
      for (let attempt = 0; attempt < 6 && !stopped; attempt += 1) {
        try {
          const order = await getGenerationPurchase({ data: { orderId: purchaseOrderId } })

          if (order.status !== 'pending_payment') {
            await loadTasks()
            scrollToGenerationResultsAfterPayment(purchaseOrderId)
            clearPurchaseRecovery()
            setSubmitStage('idle')
            return
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : ''
          if (message.includes('GENERATION_ORDER_NOT_FOUND')) {
            clearPurchaseRecovery()
            setSubmitStage('idle')
            return
          }
        }

        await new Promise(resolve => window.setTimeout(resolve, 800))
      }

      if (!stopped) {
        clearPurchaseRecovery()
        setSubmitStage('idle')
      }
    }

    const timer = window.setInterval(() => void resolveClosedCheckout(), 400)
    const onFocus = () => void resolveClosedCheckout()
    window.addEventListener('focus', onFocus)

    return () => {
      stopped = true
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [authed, purchaseOrderId])

  useEffect(() => {
    if (!authed || !purchaseOrderId) return

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const checkoutMode = window.sessionStorage.getItem(PURCHASE_CHECKOUT_MODE_KEY)
      const successfulReturn =
        params.get('purchase_return') === '1' &&
        params.get('generation_order') === purchaseOrderId

      // Same-page browser-back recovery is handled by the dedicated effect
      // above. Do not let the generic popup recovery re-lock the UI as
      // "Waiting for payment".
      const legacySamePageReturn =
        !checkoutMode && shouldUseSamePageCheckout()

      if ((checkoutMode === 'same-page' || legacySamePageReturn) && !successfulReturn) return
    }

    let stopped = false
    let detachedPendingChecks = 0
    const poll = async () => {
      if (stopped) return
      try {
        const order = await getGenerationPurchase({ data: { orderId: purchaseOrderId } })

        if (order.status === 'pending_payment' || order.status === 'paid') {
          if (order.status === 'paid') {
            scrollToGenerationResultsAfterPayment(purchaseOrderId)
          }

          const returnState =
            order.status === 'pending_payment'
              ? checkoutReturnState(purchaseOrderId)
              : null

          // A canceled Waffo checkout can navigate the checkout tab back to our
          // homepage without closing that tab. In that case the order remains
          // pending_payment forever because no payment webhook is emitted.
          // Release the local draft immediately so the buyer can try again.
          if (returnState === 'cancelled') {
            paymentWindowRef.current?.close()
            paymentWindowRef.current = null
            clearPurchaseRecovery()
            setSubmitStage('idle')
            return
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
          scrollToGenerationResultsAfterPayment(purchaseOrderId)
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
      task.audio_status === 'pending' ||
      task.audio_status === 'processing' ||
      (task.status === 'completed' &&
        (task.storage_status === 'pending' || task.storage_status === 'fallback')) ||
      task.generation_order_status === 'refund_requested'
    )
    if (!active.length) return

    let advancedMock = false

    await Promise.all(
      active.map(async task => {
        if (import.meta.env.DEV && task.provider === 'mock') {
          try {
            await fetch(`/api/dev/mock-generation/${encodeURIComponent(task.id)}/process`, {
              method: 'POST',
            })
            advancedMock = true
          } catch (error) {
            console.warn('[generation] local mock advance request failed', {
              taskId: task.id,
              error,
            })
          }
        }
      }),
    )

    // Mock processing mutates several lifecycle fields at once (audio/storage/
    // result URL). Reload the canonical task list after advancing it so the UI
    // cannot remain stuck on a stale pre-persist snapshot.
    if (advancedMock) {
      await loadTasks()
      return
    }

    const updates = await Promise.all(
      active.map(async task => {
        try {
          return await refreshGenerationTask({ data: { taskId: task.id } })
        } catch (error) {
          console.warn('[generation] task refresh failed', {
            taskId: task.id,
            error,
          })
          return null
        }
      }),
    )

    if (updates.some(task => !task)) {
      // Recover from a transient single-task refresh failure by reloading the
      // canonical list. Otherwise the browser can keep rendering a stale
      // processing snapshot even after the backend has persisted the result.
      await loadTasks()
      return
    }

    const map = new Map(
      updates
        .filter((task): task is GenerationTask => Boolean(task))
        .map(task => [task.id, task]),
    )
    if (!map.size) return
    setTasks(current => current.map(task => map.get(task.id) || task))
  }

  const uploadFile = async (file: File) => {
    const signed = await createUploadUrl({
      data: { fileName: file.name, mimeType: file.type, kind: 'image' },
    })

    const maxAttempts = 3
    let finalErrorCode = 'UPLOAD_FAILED'

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await fetch(signed.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })

        if (response.ok) return signed

        finalErrorCode = `UPLOAD_HTTP_${response.status}`
        console.warn('[upload] R2 PUT failed', {
          assetId: signed.assetId,
          attempt,
          status: response.status,
          statusText: response.statusText,
        })

        const retryable =
          response.status === 408 ||
          response.status === 425 ||
          response.status === 429 ||
          response.status >= 500

        if (!retryable || attempt >= maxAttempts) break
      } catch (error) {
        finalErrorCode = 'UPLOAD_NETWORK_ERROR'
        console.warn('[upload] R2 PUT network error', {
          assetId: signed.assetId,
          attempt,
          error,
        })

        if (attempt >= maxAttempts) break
      }

      await new Promise(resolve =>
        window.setTimeout(resolve, attempt === 1 ? 500 : 1200),
      )
    }

    await recordUploadFailure({
      data: {
        assetId: signed.assetId,
        assetToken: signed.assetToken,
        errorCode: finalErrorCode,
      },
    }).catch(error => {
      console.warn('[upload] failed to persist upload error state', {
        assetId: signed.assetId,
        errorCode: finalErrorCode,
        error,
      })
    })

    throw new Error(finalErrorCode)
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
          ? m.imageRejected
          : message.includes('UNSUPPORTED_FILE_TYPE')
            ? m.unsupportedImage
            : message.includes('UPLOAD_') || message.includes('R2_')
              ? m.uploadFailed
              : m.moderationUnavailable,
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
      notifyOnComplete,
    }
  }

  const startCheckout = async () => {
    if (isSubmitting || checkoutLockRef.current) return
    const data = buildGenerationInput()
    if (!data) return

    checkoutLockRef.current = true
    const samePageCheckout = shouldUseSamePageCheckout()
    let paymentTab: Window | null = null

    if (!samePageCheckout) {
      paymentTab = window.open('about:blank', '_blank')
      if (paymentTab) {
        paymentTab.opener = null
        paymentWindowRef.current = paymentTab
      }
    }

    setError('')
    setSubmitStage('checking')

    try {
      const purchase = await createGenerationPurchase({ data })
      window.sessionStorage.setItem(PURCHASE_RECOVERY_KEY, purchase.orderId)
      setSubmitStage('checkout')
      setPendingGenerate(false)

      if (samePageCheckout) {
        window.sessionStorage.setItem(PURCHASE_CHECKOUT_MODE_KEY, 'same-page')
        paymentWindowRef.current = null
        window.location.assign(purchase.checkoutUrl)
        return
      }

      if (!paymentTab || paymentTab.closed) {
        window.sessionStorage.setItem(PURCHASE_CHECKOUT_MODE_KEY, 'same-page')
        paymentWindowRef.current = null
        window.location.assign(purchase.checkoutUrl)
        return
      }

      window.sessionStorage.setItem(PURCHASE_CHECKOUT_MODE_KEY, 'popup')
      setPurchaseOrderId(purchase.orderId)
      paymentTab.location.replace(purchase.checkoutUrl)

      // Some in-app browsers return a WindowProxy but discard the new window
      // immediately. Fall back to same-page checkout only during this initial
      // handoff window; later closures are treated as user cancellation.
      window.setTimeout(() => {
        if (
          paymentWindowRef.current === paymentTab &&
          paymentTab?.closed &&
          window.sessionStorage.getItem(PURCHASE_RECOVERY_KEY) === purchase.orderId
        ) {
          paymentWindowRef.current = null
          window.sessionStorage.setItem(PURCHASE_CHECKOUT_MODE_KEY, 'same-page')
          window.location.assign(purchase.checkoutUrl)
        }
      }, 700)
    } catch (e) {
      paymentTab?.close()
      paymentWindowRef.current = null
      checkoutLockRef.current = false
      setSubmitStage('idle')
      setError(friendlyError(e instanceof Error ? e.message : m.errors.checkoutFailed, m.errors))
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
      setError(friendlyError(e instanceof Error ? e.message : m.errors.retryFailed, m.errors))
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
      setError(friendlyError(e instanceof Error ? e.message : m.errors.refundFailed, m.errors))
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
            <strong>{m.addPerformers}</strong>
            <small>{m.addPerformersHelp}</small>
          </div>
        </div>

        <div className="performer-pair">
          <ImageUpload
            label={m.leftPerformer}
            state={personA}
            onPick={(file) => void prepareImage(file, 'A')}
            onClear={() => clearImage('A')}
            disabled={isSubmitting}
            uploadingLabel={m.uploading}
          />
          <button
            type="button"
            className="performer-swap"
            disabled={!canSwap}
            onClick={swapPerformers}
            title={m.swapPerformers}
            aria-label={m.swapPerformers}
          >
            <ArrowLeftRight size={17} />
          </button>
          <ImageUpload
            label={m.rightPerformer}
            state={personB}
            onPick={(file) => void prepareImage(file, 'B')}
            onClear={() => clearImage('B')}
            disabled={isSubmitting}
            uploadingLabel={m.uploading}
          />
        </div>
        <p className="performer-help">{m.sourceHelp}</p>

        {assetError && <div className="asset-error" role="alert">{assetError}</div>}

        <div className="generator-divider" />

        <div className="generator-section-heading output-heading">
          <span className="generator-step">02</span>
          <div>
            <strong>{m.chooseOutput}</strong>
            <small>{m.chooseOutputHelp}</small>
          </div>
        </div>

        <div className="fixed-output-meta" aria-label="Included output settings">
          <span><b>{m.seconds}</b><i>{m.video}</i></span>
          <span>{m.templateMotion}</span>
          <span>{m.soundtrackIncluded}</span>
        </div>

        <div className="output-control">
          <div className="output-control-head">
            <span>{m.format}</span>
            <small>{m.formatHelp}</small>
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
                <strong>{value === '9:16' ? m.vertical : m.landscape}</strong>
                <span>{value}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="output-control">
          <div className="output-control-head">
            <span>{m.quality}</span>
            <small>{m.qualityHelp}</small>
          </div>
          <div className="quality-options">
            {HOTEL_LOBBY_GENERATION_CONFIG.resolutions.map(value => {
              const option = GENERATION_PURCHASE_OPTIONS[value]
              return (
                <button
                  key={value}
                  type="button"
                  className={`quality-option ${resolution === value ? 'active' : ''}${option.recommended ? ' recommended' : ''}`}
                  aria-pressed={resolution === value}
                  disabled={isSubmitting}
                  onClick={() => setResolution(value)}
                >
                  <div className="quality-option-head">
                    <strong>{value.toUpperCase()}</strong>
                    {option.recommended && <em>{m.recommended}</em>}
                  </div>
                  <span>{option.name}</span>
                  <small>{generationPriceLabel(value)}</small>
                </button>
              )
            })}
          </div>
        </div>

        {error && <div className="generation-error">{error}</div>}

        <button disabled={!canGenerate} className="generate generator-submit" onClick={() => void onGenerate()}>
          {isSubmitting ? <Loader2 size={16} className="spin"/> : <Zap size={16} fill="currentColor"/>}
          {submitStage === 'checking' ? m.checkingImages :
           submitStage === 'checkout' ? m.openingCheckout :
           submitStage === 'waiting' ? m.waitingPayment :
           submitStage === 'payment-check' ? m.checkingPayment :
           m.generateFor(priceLabel)}
        </button>

        <label className={`generation-email-notify ${isSubmitting ? 'disabled' : ''}`}>
          <input
            type="checkbox"
            checked={notifyOnComplete}
            disabled={isSubmitting}
            onChange={event => setNotifyOnComplete(event.target.checked)}
          />
          <Mail size={15}/>
          <span>
            <strong>{m.emailReady}</strong>
            <small>{m.emailReadyHelp}</small>
          </span>
        </label>

        <div className="generator-trust-row">
          <span>{m.noSubscription}</span>
          <span>{m.freeRetries}</span>
          <span>{m.refundAvailable}</span>
        </div>

        <p className="generator-safety-note">
          {m.safetyPrefix}{' '}
          <a href="/terms-of-service#acceptable-use">{m.contentPolicy}</a>{' · '}
          <a href="/terms-of-service#reporting">{m.reportContent}</a>
        </p>
      </div>

      <div className="generator-results" ref={generatorResultsRef}>
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

function friendlyError(message: string, errors: Messages['workbench']['errors']) {
  if (message.includes('PROMPT_REJECTED')) return errors.promptRejected
  if (message.includes('MODERATION_UNAVAILABLE')) return errors.safetyUnavailable
  if (message.includes('REFERENCE_IMAGES_NOT_READY') || message.includes('IMAGE_A_NOT_READY') || message.includes('IMAGE_B_NOT_READY')) {
    return errors.imagesNotReady
  }
  if (message.includes('REFERENCE_VIDEO_NOT_READY')) return errors.presetUnavailable
  if (message.includes('WAFFO_GENERATION_PRODUCT_NOT_CONFIGURED')) return errors.checkoutNotConfigured
  if (message.includes('DIRECT_GENERATION_REQUIRES_WAFFO')) return errors.checkoutUnavailable
  if (message.includes('REFUND_NOT_AVAILABLE')) return errors.refundUnavailable
  if (message.includes('REFUND_SUPPORT_REQUIRED')) return errors.refundSupport
  if (message.includes('PAYMENT_NOT_READY')) return errors.paymentSyncing
  if (message.includes('AUTH_REQUIRED')) return errors.authRequired
  return message
}

function ImageUpload({
  label,
  state,
  onPick,
  onClear,
  disabled = false,
  uploadingLabel = 'Uploading',
}: {
  label: string
  state: ImageAssetState
  onPick: (file?: File) => void
  onClear: () => void
  disabled?: boolean
  uploadingLabel?: string
}) {
  return <label className={`image-slot ${disabled ? 'image-slot-disabled' : ''}`}>
    <span className="image-slot-label">{label}</span>
    <div className="asset-tile">
      {state.previewUrl ? <img src={state.previewUrl} alt=""/> : <Plus size={22}/>}
      {(state.status === 'uploading' || state.status === 'moderating') && (
        <span className="asset-uploading" aria-label={uploadingLabel}>
          <Loader2 size={18} className="spin" />
          <span className="asset-uploading-label">{uploadingLabel}</span>
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
