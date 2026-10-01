import { useEffect, useRef, useState } from 'react'
import { Loader2, Play, Plus, Upload, X, Zap } from 'lucide-react'
import { HOTEL_LOBBY_DEFAULT_PROMPT, HOTEL_LOBBY_TEMPLATES, type MotionTemplate } from '@/config/hotel-lobby'
import { calculateGenerationCredits } from '@/config/generation-cost'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { AuthModal } from '@/components/auth/AuthModal'
import { PricingPanel } from '@/components/billing/PricingPanel'
import { ResultsGallery } from '@/components/hotel-lobby/ResultsGallery'
import { createUploadUrl } from '@/server/storage'
import { getBillingState } from '@/server/billing'
import { createGeneration, listGenerationTasks, refreshGenerationTask, retryGenerationTask, type CreateGenerationInput, type GenerationTask } from '@/server/generation'

type ImageState = { file: File | null; previewUrl: string | null }
const emptyImage: ImageState = { file: null, previewUrl: null }
const RECOVERY_KEY = 'hotel_lobby_generation_recovery_v1'

export function HotelLobbyWorkbench() {
  const [personA, setPersonA] = useState<ImageState>(emptyImage)
  const [personB, setPersonB] = useState<ImageState>(emptyImage)
  const [template, setTemplate] = useState<MotionTemplate | null>(null)
  const [referenceVideo, setReferenceVideo] = useState<{ file: File | null; previewUrl: string | null }>({ file: null, previewUrl: null })
  const [prompt, setPrompt] = useState(HOTEL_LOBBY_DEFAULT_PROMPT)
  const [duration, setDuration] = useState(10)
  const [resolution, setResolution] = useState<'720p'|'1080p'|'4k'>('720p')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [sourceOpen, setSourceOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [pricingOpen, setPricingOpen] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [pendingGenerate, setPendingGenerate] = useState(false)
  const [submitStage, setSubmitStage] = useState<'idle'|'uploading'|'moderating'|'starting'|'syncing'>('idle')
  const [error, setError] = useState('')
  const [tasks, setTasks] = useState<GenerationTask[]>([])
  const [credits, setCredits] = useState<number | null>(null)
  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null)
  const videoInput = useRef<HTMLInputElement>(null)

  const selectedVideo = referenceVideo.previewUrl || template?.previewVideoUrl || null
  const ratio = template?.defaultRatio || '16:9'
  const cost = calculateGenerationCredits(duration, resolution)
  const isSubmitting = submitStage !== 'idle'
  const canGenerate = Boolean(personA.file && personB.file && (template || referenceVideo.file) && !isSubmitting)

  const loadBilling = async () => {
    try {
      const state = await getBillingState()
      setCredits(state.credits)
      return state.credits
    } catch {
      setCredits(null)
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
        setCredits(null)
        setTasks([])
      }
    })
    return () => listener.subscription.unsubscribe()
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
          setSubmitStage('starting')
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
          setCredits(task.balance)
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

  const setImage = (file: File | undefined, setter: (state: ImageState) => void) => {
    if (!file) return
    setter({ file, previewUrl: URL.createObjectURL(file) })
  }

  const upload = async (file: File, kind: 'image'|'video') => {
    const signed = await createUploadUrl({ data: { fileName: file.name, mimeType: file.type, kind } })
    const res = await fetch(signed.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
    if (!res.ok) throw new Error('Upload failed')
    return signed.publicUrl
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
      setCredits(task.balance)
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

  const submitAfterAuth = async () => {
    if (!personA.file || !personB.file || (!template && !referenceVideo.file) || isSubmitting) return
    setSubmitStage('uploading')
    setError('')
    try {
      const [imageAUrl, imageBUrl] = await Promise.all([upload(personA.file, 'image'), upload(personB.file, 'image')])
      const referenceVideoUrl = template?.sourceVideoUrl || (referenceVideo.file ? await upload(referenceVideo.file, 'video') : '')
      setSubmitStage('starting')
      await runGeneration({
        imageAUrl,
        imageBUrl,
        referenceTemplateId: template?.id || null,
        referenceVideoUrl,
        prompt,
        duration,
        resolution,
        aspectRatio: ratio,
      })
    } catch (e) {
      setError(friendlyError(e instanceof Error ? e.message : 'Generation failed'))
      setSubmitStage('idle')
    }
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
      setCredits(task.balance)
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
    <div className="workbench">
      <div className="workbench-balance">
        <span>{authed ? <>Balance <strong>⚡ {credits ?? '—'}</strong></> : 'Sign in when you are ready to generate'}</span>
        {authed && <button type="button" onClick={() => setPricingOpen(true)}>Buy credits</button>}
      </div>

      <div className="asset-row">
        <ImageUpload label="Person A" state={personA} onPick={(f) => setImage(f, setPersonA)} onClear={() => setPersonA(emptyImage)} />
        <ImageUpload label="Person B" state={personB} onPick={(f) => setImage(f, setPersonB)} onClear={() => setPersonB(emptyImage)} />
        <div className="reference-slot">
          <button className="asset-tile portrait" onClick={() => setSourceOpen(v => !v)} type="button">
            {selectedVideo ? <><video src={selectedVideo} muted loop playsInline /><span className="asset-overlay"><Play size={15} fill="currentColor" /></span></> : <Plus size={22} />}
          </button>
          {selectedVideo && <button className="remove-asset" onClick={() => { setReferenceVideo({ file: null, previewUrl: null }); setTemplate(null) }}><X size={11}/></button>}
          <span>Video<br/>Reference</span>
          {sourceOpen && <div className="source-menu">
            <button onClick={() => { setSourceOpen(false); videoInput.current?.click() }}><Upload size={15}/> Upload video</button>
            <button onClick={() => { setSourceOpen(false); setPickerOpen(true) }}><Play size={15}/> Choose template</button>
          </div>}
          <input hidden ref={videoInput} type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => {
            const f=e.target.files?.[0]
            if(f){ setTemplate(null); setReferenceVideo({file:f, previewUrl:URL.createObjectURL(f)}) }
          }} />
        </div>
      </div>

      <textarea className="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} aria-label="Prompt" />
      {error && <div className="generation-error">{error}</div>}
      <div className="controls">
        <select value={duration} onChange={e=>setDuration(Number(e.target.value))}><option value={5}>5s</option><option value={10}>10s</option><option value={15}>15s</option></select>
        <select value={resolution} onChange={e=>setResolution(e.target.value as typeof resolution)}><option>720p</option><option>1080p</option><option>4k</option></select>
        <select value={ratio} disabled><option>{ratio}</option></select>
        <button disabled={!canGenerate} className="generate" onClick={() => void onGenerate()}>
          {isSubmitting ? <Loader2 size={16} className="spin"/> : <Zap size={16} fill="currentColor"/>}
          {submitStage === 'uploading' ? 'Uploading…' :
           submitStage === 'moderating' ? 'Checking…' :
           submitStage === 'starting' ? 'Starting…' :
           submitStage === 'syncing' ? 'Syncing credits…' :
           <>⚡ {cost} Generate</>}
        </button>
      </div>
    </div>

    <ResultsGallery tasks={tasks} onRetry={(taskId) => void handleRetry(taskId)} retryingTaskId={retryingTaskId}/>
    <AuthModal open={authOpen} onClose={() => { setAuthOpen(false); setPendingGenerate(false) }} onAuthed={handleAuthed}/>

    {pricingOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.currentTarget === e.target) setPricingOpen(false) }}>
      <div className="pricing-modal-shell">
        <PricingPanel
          modal
          requiredCredits={cost}
          returnPath="/"
          onClose={() => setPricingOpen(false)}
          onBalanceChange={setCredits}
        />
      </div>
    </div>}

    {pickerOpen && <TemplatePicker onClose={() => setPickerOpen(false)} onSelect={(t) => {
      setTemplate(t)
      setReferenceVideo({file:null,previewUrl:null})
      setPrompt(t.defaultPrompt)
      setPickerOpen(false)
    }} />}
  </div>
}

function friendlyError(message: string) {
  if (message.includes('PROMPT_REJECTED')) return 'This prompt cannot be used. Please revise it and try again.'
  if (message.includes('MODERATION_UNAVAILABLE')) return 'Safety check is temporarily unavailable. Please try again shortly.'
  if (message.includes('IMAGE_REJECTED')) return 'One of the reference images cannot be used. Please choose another image.'
  if (message.includes('IMAGE_MODERATION')) return 'Unable to verify the reference image right now. Please try again shortly.'
  if (message.includes('AUTH_REQUIRED')) return 'Please sign in and try again.'
  return message
}

function ImageUpload({ label, state, onPick, onClear }: { label: string; state: ImageState; onPick: (file?: File) => void; onClear: () => void }) {
  return <label className="image-slot">
    <div className="asset-tile">{state.previewUrl ? <img src={state.previewUrl} alt=""/> : <Plus size={22}/>}</div>
    {state.previewUrl && <button type="button" className="remove-asset" onClick={(e) => { e.preventDefault(); onClear() }}><X size={11}/></button>}
    <span>{label}</span><input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onPick(e.target.files?.[0])}/>
  </label>
}

function TemplatePicker({ onClose, onSelect }: { onClose: () => void; onSelect: (t: MotionTemplate) => void }) {
  return <div className="modal-backdrop" onMouseDown={(e) => { if(e.currentTarget===e.target) onClose() }}>
    <div className="modal"><div className="modal-head"><div><h3>Choose a reference video</h3><p>Preview is lightweight; the full reference is sent to the model.</p></div><button onClick={onClose}><X/></button></div>
      <div className="template-grid">{HOTEL_LOBBY_TEMPLATES.map(t => <button key={t.id} onClick={() => onSelect(t)}>
        <video src={t.previewVideoUrl} muted playsInline preload="metadata"/><span>{t.name}</span>
      </button>)}</div>
    </div>
  </div>
}
