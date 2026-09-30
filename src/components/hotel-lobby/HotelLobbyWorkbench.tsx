import { useEffect, useRef, useState } from 'react'
import { Loader2, Play, Plus, Upload, X, Zap } from 'lucide-react'
import { HOTEL_LOBBY_DEFAULT_PROMPT, HOTEL_LOBBY_TEMPLATES, type MotionTemplate } from '@/config/hotel-lobby'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { AuthModal } from '@/components/auth/AuthModal'
import { ResultsGallery } from '@/components/hotel-lobby/ResultsGallery'
import { createUploadUrl } from '@/server/storage'
import { createGeneration, listGenerationTasks, refreshGenerationTask, retryGenerationTask, type GenerationTask } from '@/server/generation'

type ImageState = { file: File | null; previewUrl: string | null }
const emptyImage: ImageState = { file: null, previewUrl: null }

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
  const [authed, setAuthed] = useState(false)
  const [pendingGenerate, setPendingGenerate] = useState(false)
  const [submitStage, setSubmitStage] = useState<'idle' | 'uploading' | 'starting'>('idle')
  const [error, setError] = useState('')
  const [tasks, setTasks] = useState<GenerationTask[]>([])
  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null)
  const videoInput = useRef<HTMLInputElement>(null)

  const selectedVideo = referenceVideo.previewUrl || template?.previewVideoUrl || null
  const ratio = template?.defaultRatio || '16:9'
  const isSubmitting = submitStage !== 'idle'
  const canGenerate = Boolean(personA.file && personB.file && (template || referenceVideo.file) && !isSubmitting)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    void supabase.auth.getSession().then(({ data }) => {
      const yes = Boolean(data.session)
      setAuthed(yes)
      if (yes) void loadTasks()
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(Boolean(session))
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!authed || !tasks.some(t => t.status === 'pending' || t.status === 'processing')) return
    const timer = window.setInterval(() => void refreshActiveTasks(), 3000)
    return () => window.clearInterval(timer)
  }, [authed, tasks])

  const setImage = (file: File | undefined, setter: (state: ImageState) => void) => {
    if (!file) return
    setter({ file, previewUrl: URL.createObjectURL(file) })
  }

  const loadTasks = async () => {
    try { setTasks(await listGenerationTasks()) } catch { setTasks([]) }
  }

  const refreshActiveTasks = async () => {
    const active = tasks.filter(t => t.status === 'pending' || t.status === 'processing')
    if (!active.length) return
    const updates = await Promise.all(active.map(t => refreshGenerationTask({ data: { taskId: t.id } }).catch(() => t)))
    const map = new Map(updates.map(t => [t.id, t]))
    setTasks(current => current.map(t => map.get(t.id) || t))
  }

  const upload = async (file: File, kind: 'image'|'video') => {
    const signed = await createUploadUrl({ data: { fileName: file.name, mimeType: file.type, kind } })
    const res = await fetch(signed.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
    if (!res.ok) throw new Error('Upload failed')
    return signed.publicUrl
  }

  const submitAfterAuth = async () => {
    if (!personA.file || !personB.file || (!template && !referenceVideo.file) || isSubmitting) return
    setSubmitStage('uploading'); setError('')
    try {
      const [imageAUrl, imageBUrl] = await Promise.all([upload(personA.file, 'image'), upload(personB.file, 'image')])
      const referenceVideoUrl = template?.sourceVideoUrl || (referenceVideo.file ? await upload(referenceVideo.file, 'video') : '')
      setSubmitStage('starting')
      const task = await createGeneration({ data: {
        imageAUrl, imageBUrl,
        referenceTemplateId: template?.id || null,
        referenceVideoUrl,
        prompt,
        duration,
        resolution,
        aspectRatio: ratio,
      } })
      // The generation button is only responsible for handing the job off.
      // As soon as the server returns a task id, let the user start another job;
      // ongoing generation progress belongs to the result task card.
      setSubmitStage('idle')
      setTasks(current => [{
        id: task.id, status: task.status, result_url: null, failure_message: null,
        created_at: new Date().toISOString(), provider_task_id: null,
      }, ...current])
      setPendingGenerate(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally { setSubmitStage('idle') }
  }

  const onGenerate = async () => {
    if (!canGenerate) return
    if (!authed) { setPendingGenerate(true); setAuthOpen(true); return }
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
      }, ...current])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Retry failed')
    } finally {
      setRetryingTaskId(null)
    }
  }

  const handleAuthed = () => {
    setAuthed(true)
    void loadTasks()
    if (pendingGenerate) window.setTimeout(() => void submitAfterAuth(), 150)
  }


  return <div className="workbench-shell">
    <div className="workbench">

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
            const f=e.target.files?.[0]; if(f){ setTemplate(null); setReferenceVideo({file:f, previewUrl:URL.createObjectURL(f)}) }
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
          {submitStage === 'uploading' ? 'Uploading…' : submitStage === 'starting' ? 'Starting…' : 'Generate'}
        </button>
      </div>
    </div>
    <ResultsGallery tasks={tasks} onRetry={(taskId) => void handleRetry(taskId)} retryingTaskId={retryingTaskId}/>
    <AuthModal open={authOpen} onClose={() => { setAuthOpen(false); setPendingGenerate(false) }} onAuthed={handleAuthed}/>
    {pickerOpen && <TemplatePicker onClose={() => setPickerOpen(false)} onSelect={(t) => {
      setTemplate(t); setReferenceVideo({file:null,previewUrl:null}); setPrompt(t.defaultPrompt); setPickerOpen(false)
    }} />}
  </div>
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
    <div className="modal"><div className="modal-head"><div><h3>Choose a reference video</h3><p>Preview is lightweight; the full source is sent to the model.</p></div><button onClick={onClose}><X/></button></div>
      <div className="template-grid">{HOTEL_LOBBY_TEMPLATES.map(t => <button key={t.id} onClick={() => onSelect(t)}>
        <video src={t.previewVideoUrl} muted playsInline preload="metadata"/><span>{t.name}</span>
      </button>)}</div>
    </div>
  </div>
}
