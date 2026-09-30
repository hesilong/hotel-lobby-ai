import { useMemo, useRef, useState } from 'react'
import { Play, Plus, Upload, X, Zap } from 'lucide-react'
import { HOTEL_LOBBY_DEFAULT_PROMPT, HOTEL_LOBBY_TEMPLATES, type MotionTemplate } from '@/config/hotel-lobby'

type ImageState = { file: File | null; previewUrl: string | null }
const emptyImage: ImageState = { file: null, previewUrl: null }

export function HotelLobbyWorkbench() {
  const [personA, setPersonA] = useState<ImageState>(emptyImage)
  const [personB, setPersonB] = useState<ImageState>(emptyImage)
  const [template, setTemplate] = useState<MotionTemplate | null>(null)
  const [referenceVideo, setReferenceVideo] = useState<{ file: File | null; previewUrl: string | null }>({ file: null, previewUrl: null })
  const [prompt, setPrompt] = useState(HOTEL_LOBBY_DEFAULT_PROMPT)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [sourceOpen, setSourceOpen] = useState(false)
  const videoInput = useRef<HTMLInputElement>(null)

  const selectedVideo = referenceVideo.previewUrl || template?.previewVideoUrl || null
  const ratio = template?.defaultRatio || '16:9'
  const canGenerate = Boolean(personA.file && personB.file && (template || referenceVideo.file))

  const setImage = (file: File | undefined, setter: (state: ImageState) => void) => {
    if (!file) return
    setter({ file, previewUrl: URL.createObjectURL(file) })
  }

  const payloadPreview = useMemo(() => ({ ratio, templateId: template?.id ?? null }), [ratio, template])

  return <div className="workbench-shell">
    <div className="workbench">
      <div className="asset-row">
        <ImageUpload label="Person A" state={personA} onPick={(f) => setImage(f, setPersonA)} onClear={() => setPersonA(emptyImage)} />
        <ImageUpload label="Person B" state={personB} onPick={(f) => setImage(f, setPersonB)} onClear={() => setPersonB(emptyImage)} />
        <div className="reference-slot">
          <button className="asset-tile portrait" onClick={() => setSourceOpen((v) => !v)} type="button">
            {selectedVideo ? <><video src={selectedVideo} muted loop playsInline /><span className="asset-overlay"><Play size={15} fill="currentColor" /></span></> : <Plus size={22} />}
          </button>
          {selectedVideo && <button className="remove-asset" onClick={() => { setReferenceVideo({ file: null, previewUrl: null }); setTemplate(null) }}><X size={11}/></button>}
          <span>Video<br/>Reference</span>
          {sourceOpen && <div className="source-menu">
            <button onClick={() => { setSourceOpen(false); videoInput.current?.click() }}><Upload size={15}/> Upload video</button>
            <button onClick={() => { setSourceOpen(false); setPickerOpen(true) }}><Play size={15}/> Choose template</button>
          </div>}
          <input hidden ref={videoInput} type="file" accept="video/*" onChange={(e) => { const f=e.target.files?.[0]; if(f){ setTemplate(null); setReferenceVideo({file:f, previewUrl:URL.createObjectURL(f)}) } }} />
        </div>
      </div>

      <textarea className="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} aria-label="Prompt" />
      <div className="controls">
        <select defaultValue="10"><option value="5">5s</option><option value="10">10s</option><option value="15">15s</option></select>
        <select defaultValue="720p"><option>720p</option><option>1080p</option><option>4k</option></select>
        <select value={ratio} disabled><option>{ratio}</option></select>
        <button disabled={!canGenerate} className="generate" title={JSON.stringify(payloadPreview)}><Zap size={16} fill="currentColor"/> Generate</button>
      </div>
    </div>
    {pickerOpen && <TemplatePicker onClose={() => setPickerOpen(false)} onSelect={(t) => { setTemplate(t); setReferenceVideo({file:null,previewUrl:null}); setPrompt(t.defaultPrompt); setPickerOpen(false) }} />}
  </div>
}

function ImageUpload({ label, state, onPick, onClear }: { label: string; state: ImageState; onPick: (file?: File) => void; onClear: () => void }) {
  return <label className="image-slot">
    <div className="asset-tile">{state.previewUrl ? <img src={state.previewUrl} alt=""/> : <Plus size={22}/>}</div>
    {state.previewUrl && <button type="button" className="remove-asset" onClick={(e) => { e.preventDefault(); onClear() }}><X size={11}/></button>}
    <span>{label}</span><input hidden type="file" accept="image/*" onChange={(e) => onPick(e.target.files?.[0])}/>
  </label>
}

function TemplatePicker({ onClose, onSelect }: { onClose: () => void; onSelect: (t: MotionTemplate) => void }) {
  return <div className="modal-backdrop" onMouseDown={(e) => { if(e.currentTarget===e.target) onClose() }}>
    <div className="modal"><div className="modal-head"><div><h3>Choose a reference video</h3><p>Preview is lightweight; the source video is sent to the model.</p></div><button onClick={onClose}><X/></button></div>
      <div className="template-grid">{HOTEL_LOBBY_TEMPLATES.map((t) => <button key={t.id} onClick={() => onSelect(t)}><video src={t.previewVideoUrl} muted playsInline preload="metadata"/><span>{t.name}</span></button>)}</div>
    </div>
  </div>
}
