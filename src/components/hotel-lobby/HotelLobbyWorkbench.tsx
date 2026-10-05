import { useEffect, useRef, useState } from 'react'
import { Loader2, Plus, X, Zap } from 'lucide-react'
import { HOTEL_LOBBY_GENERATION_TEMPLATE, HOTEL_LOBBY_SCENES } from '@/config/hotel-lobby'
import { calculateGenerationCredits } from '@/config/generation-cost'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { AuthModal } from '@/components/auth/AuthModal'
import { PricingPanel } from '@/components/billing/PricingPanel'
import { ResultsGallery } from '@/components/hotel-lobby/ResultsGallery'
import { createUploadUrl, finalizeUploadedAsset } from '@/server/storage'
import { getBillingState } from '@/server/billing'
import { createGeneration, listGenerationTasks, refreshGenerationTask, retryGenerationTask, type CreateGenerationInput, type GenerationTask } from '@/server/generation'

type ImageAssetState = {
  previewUrl: string | null
  publicUrl: string | null
  assetId: string | null
  assetToken: string | null
  status: 'empty' | 'uploading' | 'moderating' | 'approved'
}

const emptyImage: ImageAssetState = { previewUrl: null, publicUrl: null, assetId: null, assetToken: null, status: 'empty' }
const RECOVERY_KEY = 'hotel_lobby_generation_recovery_v1'

export function HotelLobbyWorkbench() {
  const [personA, setPersonA] = useState<ImageAssetState>(emptyImage)
  const [personB, setPersonB] = useState<ImageAssetState>(emptyImage)
  const [selectedSceneId, setSelectedSceneId] = useState(HOTEL_LOBBY_SCENES[0].id)
  const [duration, setDuration] = useState(10)
  const [resolution, setResolution] = useState<'480p'|'720p'|'1080p'>('720p')
  const [aspectRatio, setAspectRatio] = useState<'16:9'|'9:16'|'1:1'>('16:9')
  const [generateAudio, setGenerateAudio] = useState(true)
  const [authOpen, setAuthOpen] = useState(false)
  const [pricingOpen, setPricingOpen] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [pendingGenerate, setPendingGenerate] = useState(false)
  const [submitStage, setSubmitStage] = useState<'idle'|'moderating'|'starting'|'syncing'|'redirecting'>('idle')
  const [error, setError] = useState('')
  const [assetError, setAssetError] = useState('')
  const [tasks, setTasks] = useState<GenerationTask[]>([])
  const [credits, setCredits] = useState<number | null>(null)
  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null)
  const personARequest = useRef<string | null>(null)
  const personBRequest = useRef<string | null>(null)
  const assetErrorTimer = useRef<number | null>(null)

  const selectedScene = HOTEL_LOBBY_SCENES.find(scene => scene.id === selectedSceneId) || HOTEL_LOBBY_SCENES[0]
  const fixedTemplate = HOTEL_LOBBY_GENERATION_TEMPLATE
  const cost = calculateGenerationCredits(duration, resolution)
  const isSubmitting = submitStage !== 'idle'
  const imagesReady = personA.status === 'approved' && personB.status === 'approved'
  const canGenerate = Boolean(imagesReady && selectedScene && !isSubmitting)

  const publishCredits = (value: number | null) => {
    setCredits(value)
    if (typeof window !== 'undefined' && value !== null) {
      window.dispatchEvent(new CustomEvent('hla:credits-changed', { detail: value }))
    }
  }

  const showAssetError = (message: string) => {
    setAssetError(message)
    if (assetErrorTimer.current) window.clearTimeout(assetErrorTimer.current)
    assetErrorTimer.current = window.setTimeout(() => setAssetError(''), 6000)
  }

  const loadBilling = async () => {
    try {
      const state = await getBillingState()
      publishCredits(state.credits)
      return state.credits
    } catch {
      publishCredits(null)
      return null
    }
  }

  const loadTasks = async () => {
    try { setTasks(await listGenerationTasks()) } catch { setTasks([]) }
  }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    void supabase.auth.getSession().then(({ data }) => {
      const yes = Boolean(data.session)
      setAuthed(yes)
      if (yes) {
        void loadTasks()
        void loadBilling()
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const yes = Boolean(session)
      setAuthed(yes)
      if (yes) {
        void loadTasks()
        void loadBilling()
      } else {
        publishCredits(null)
        setTasks([])
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
    if (!authed || !tasks.some(t => t.status === 'pending' || t.status === 'processing')) return
    const timer = window.setInterval(() => void refreshActiveTasks(), 3000)
    return () => window.clearInterval(timer)
  }, [authed, tasks])

  useEffect(() => {
    if (!authed || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('purchase_return') !== '1') return
    const raw = window.sessionStorage.getItem(RECOVERY_KEY)
    if (!raw) return

    let draft: CreateGenerationInput | null = null
    try { draft = JSON.parse(raw) as CreateGenerationInput } catch { window.sessionStorage.removeItem(RECOVERY_KEY) }
    if (!draft) return

    let stopped = false
    setSubmitStage('syncing')
    const required = calculateGenerationCredits(draft.duration, draft.resolution)
    const recover = async (attempt = 0) => {
      if (stopped) return
      const balance = await loadBilling()
      if (balance !== null && balance >= required) {
        try {
          setSubmitStage('moderating')
          const task = await createGeneration({ data: draft! })
          window.sessionStorage.removeItem(RECOVERY_KEY)
          setTasks(current => [{
            id: task.id,
            status: task.status,
            result_url: null,
            failure_message: null,
            created_at: new Date().toISOString(),
            provider_task_id: null,
            credits_used: task.creditsUsed,
          }, ...current])
          publishCredits(task.balance)
          const url = new URL(window.location.href)
          url.searchParams.delete('purchase_return')
          url.searchParams.delete('purchase_type')
          window.history.replaceState({}, '', url.pathname + url.search + url.hash)
          setSubmitStage('idle')
          return
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Generation failed'
          if (message.includes('INSUFFICIENT_CREDITS') && attempt < 12) {
            window.setTimeout(() => void recover(attempt + 1), 1500)
            return
          }
          setError(friendlyError(message))
          setSubmitStage('idle')
          return
        }
      }
      if (attempt < 12) {
        window.setTimeout(() => void recover(attempt + 1), 1500)
      } else {
        setError('Payment completed, but your credits are still syncing. Refresh in a moment.')
        setSubmitStage('idle')
      }
    }
    void recover()
    return () => { stopped = true }
  }, [authed])

  const refreshActiveTasks = async () => {
    const active = tasks.filter(t => t.status === 'pending' || t.status === 'processing')
    if (!active.length) return
    const updates = await Promise.all(active.map(t => refreshGenerationTask({ data: { taskId: t.id } }).catch(() => t)))
    const map = new Map(updates.map(t => [t.id, t]))
    setTasks(current => current.map(t => map.get(t.id) || t))
    void loadBilling()
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
      setter(current => ({ ...current, publicUrl: signed.publicUrl, assetId: signed.assetId, assetToken: signed.assetToken, status: 'moderating' }))

      const finalized = await finalizeUploadedAsset({ data: { assetId: signed.assetId, assetToken: signed.assetToken } })
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

  const runGeneration = async (data: CreateGenerationInput) => {
    setSubmitStage('moderating')
    window.sessionStorage.setItem(RECOVERY_KEY, JSON.stringify(data))
    try {
      const task = await createGeneration({ data })
      window.sessionStorage.removeItem(RECOVERY_KEY)
      setTasks(current => [{
        id: task.id,
        status: task.status,
        result_url: null,
        failure_message: null,
        created_at: new Date().toISOString(),
        provider_task_id: null,
        credits_used: task.creditsUsed,
      }, ...current])
      publishCredits(task.balance)
      setPendingGenerate(false)
      setSubmitStage('idle')
      return true
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Generation failed'
      if (message.includes('INSUFFICIENT_CREDITS')) {
        setError('')
        setPricingOpen(true)
      } else {
        window.sessionStorage.removeItem(RECOVERY_KEY)
        setError(friendlyError(message))
      }
      setSubmitStage('idle')
      return false
    }
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

  const submitAfterAuth = async () => {
    if (isSubmitting) return
    const data = buildGenerationInput()
    if (!data) return

    setError('')
    setSubmitStage('starting')
    await runGeneration(data)
  }

  const onGenerate = async () => {
    if (!canGenerate) return
    if (!authed) {
      setPendingGenerate(true)
      setAuthOpen(true)
      return
    }
    if (credits !== null && credits < cost) {
      setPricingOpen(true)
      return
    }
    await submitAfterAuth()
  }

  const handleRetry = async (taskId: string) => {
    if (retryingTaskId) return
    setRetryingTaskId(taskId)
    setError('')
    try {
      const task = await retryGenerationTask({ data: { taskId } })
      setTasks(current => [{
        id: task.id,
        status: task.status,
        result_url: null,
        failure_message: null,
        created_at: new Date().toISOString(),
        provider_task_id: null,
        credits_used: task.creditsUsed,
      }, ...current])
      publishCredits(task.balance)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Retry failed'
      if (message.includes('INSUFFICIENT_CREDITS')) setPricingOpen(true)
      else setError(friendlyError(message))
    } finally { setRetryingTaskId(null) }
  }

  const handleAuthed = () => {
    setAuthed(true)
    void loadTasks()
    void loadBilling()
    if (pendingGenerate) window.setTimeout(() => void submitAfterAuth(), 150)
  }

  return <div className="workbench-shell">
    <div className="generator-layout">
      <div className="workbench generator-workbench">
        <div className="asset-row">
          <ImageUpload
            label="Left Performer"
            state={personA}
            onPick={(file) => void prepareImage(file, 'A')}
            onClear={() => clearImage('A')}
          />
          <ImageUpload
            label="Right Performer"
            state={personB}
            onPick={(file) => void prepareImage(file, 'B')}
            onClear={() => clearImage('B')}
          />
        </div>
        <p className="performer-help">One clear person or pet per photo. Keep the face or muzzle visible and use an original, well-lit image.</p>

        {assetError && <div className="asset-error" role="alert">{assetError}</div>}

        <div className="scene-picker">
          <div className="scene-picker-head">
            <div>
              <span>Choose a scene</span>
              <small>The performance motion is preset automatically.</small>
            </div>
            <label className="soundtrack-toggle">
              <span>Soundtrack</span>
              <input
                type="checkbox"
                checked={generateAudio}
                onChange={e => setGenerateAudio(e.target.checked)}
              />
              <i aria-hidden="true"/>
            </label>
          </div>
          <div className="scene-grid">
            {HOTEL_LOBBY_SCENES.map(scene => (
              <button
                key={scene.id}
                type="button"
                className={`scene-card ${scene.id === selectedScene.id ? 'active' : ''}`}
                aria-pressed={scene.id === selectedScene.id}
                onClick={() => setSelectedSceneId(scene.id)}
              >
                <strong>{scene.name}</strong>
                <span>{scene.description}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="generation-error">{error}</div>}

        <div className="parameter-grid">
          <label>
            <span>Duration</span>
            <select value={duration} onChange={e=>setDuration(Number(e.target.value))}>
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
              <option value={20}>20 seconds</option>
              <option value={25}>25 seconds</option>
              <option value={30}>30 seconds</option>
            </select>
          </label>
          <label>
            <span>Resolution</span>
            <select value={resolution} onChange={e=>setResolution(e.target.value as typeof resolution)}>
              <option value="480p">480P</option>
              <option value="720p">720P</option>
              <option value="1080p">1080P</option>
            </select>
          </label>
          <label>
            <span>Orientation</span>
            <select value={aspectRatio} onChange={e=>setAspectRatio(e.target.value as typeof aspectRatio)}>
              <option value="16:9">Landscape · 16:9</option>
              <option value="9:16">Portrait · 9:16</option>
              <option value="1:1">Square · 1:1</option>
            </select>
          </label>
        </div>

        <button disabled={!canGenerate} className="generate generator-submit" onClick={() => void onGenerate()}>
          {isSubmitting ? <Loader2 size={16} className="spin"/> : <Zap size={16} fill="currentColor"/>}
          {submitStage === 'moderating' ? 'Checking…' :
           submitStage === 'starting' ? 'Starting…' :
           submitStage === 'syncing' ? 'Syncing credits…' :
           `Generate · ${cost} credits`}
        </button>

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
        />
      </div>
    </div>

    <AuthModal open={authOpen} onClose={() => { setAuthOpen(false); setPendingGenerate(false) }} onAuthed={handleAuthed}/>

    {pricingOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.currentTarget === e.target) setPricingOpen(false) }}>
      <div className="pricing-modal-shell">
        <PricingPanel
          modal
          requiredCredits={cost}
          returnPath="/"
          onClose={() => setPricingOpen(false)}
          onBalanceChange={publishCredits}
        />
      </div>
    </div>}
  </div>
}

function friendlyError(message: string) {
  if (message.includes('PROMPT_REJECTED')) return 'This scene cannot be generated. Please choose another scene and try again.'
  if (message.includes('MODERATION_UNAVAILABLE')) return 'Safety check is temporarily unavailable. Please try again shortly.'
  if (message.includes('REFERENCE_IMAGES_NOT_READY') || message.includes('IMAGE_A_NOT_READY') || message.includes('IMAGE_B_NOT_READY')) {
    return 'Please choose your two reference images again.'
  }
  if (message.includes('REFERENCE_VIDEO_NOT_READY')) return 'The preset performance is temporarily unavailable. Please try again shortly.'
  if (message.includes('AUTH_REQUIRED')) return 'Please sign in and try again.'
  return message
}

function ImageUpload({
  label,
  state,
  onPick,
  onClear,
}: {
  label: string
  state: ImageAssetState
  onPick: (file?: File) => void
  onClear: () => void
}) {
  return <label className="image-slot">
    <span className="image-slot-label">{label}</span>
    <div className="asset-tile">
      {state.previewUrl ? <img src={state.previewUrl} alt=""/> : <Plus size={22}/>}
      {state.status === 'uploading' && (
        <span className="asset-uploading" aria-label="Uploading">
          <Loader2 size={18} className="spin" />
        </span>
      )}
    </div>
    {state.previewUrl && <button type="button" className="remove-asset" onClick={(e) => { e.preventDefault(); onClear() }}><X size={11}/></button>}
    <input
      hidden
      type="file"
      accept="image/jpeg,image/png,image/webp"
      onChange={(e) => {
        const file = e.target.files?.[0]
        e.currentTarget.value = ''
        onPick(file)
      }}
    />
  </label>
}
