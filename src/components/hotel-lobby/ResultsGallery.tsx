import { useMemo, useState } from 'react'
import { AlertCircle, ArrowDown, Clock3, Download, Loader2, Play, RotateCcw, X } from 'lucide-react'
import type { GenerationTask } from '@/server/generation'
import { REVIEW_MODE } from '@/config/feature-flags'

const DEMO_BASE = 'https://cdn.hotel-lobby-ai.pro/demo/5'
const DEMO = {
  leftImage: `${DEMO_BASE}/hotel-lobby-left.png`,
  rightImage: `${DEMO_BASE}/hotel-lobby-right.png`,
  video: `${DEMO_BASE}/hotel-lobby-ai-480p-5.mp4`,
}

export function ResultsGallery({
  tasks,
  onRetry,
  retryingTaskId,
  latestOnly = false,
}: {
  tasks: GenerationTask[]
  onRetry?: (taskId: string) => void
  retryingTaskId?: string | null
  latestOnly?: boolean
}) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const visibleTasks = latestOnly ? tasks.slice(0, 1) : tasks
  const selectedTask = useMemo(
    () => tasks.find(task => task.id === selectedTaskId && task.status === 'completed' && task.result_url) || null,
    [tasks, selectedTaskId],
  )

  const openHistory = () => {
    setSelectedTaskId(null)
    setHistoryOpen(true)
  }

  return <>
    <section className="results">
      <div className="results-head">
        <div>
          <h2>Generated video</h2>
          <p>{tasks.length ? 'Your newest result appears here.' : 'Your result will appear here after generation.'}</p>
        </div>
        {tasks.length > 0 && (
          <button type="button" className="results-history-button" onClick={openHistory}>
            <Clock3 size={14}/>
            History <span>{tasks.length}</span>
          </button>
        )}
      </div>

      {!visibleTasks.length ? (
        REVIEW_MODE ? (
          <div className="results-empty results-empty-review">
            <strong>Ready for your first generation</strong>
            <span>Upload two performers, choose format and quality, and click Generate.</span>
          </div>
        ) : (
        <div className="results-demo">
          <div className="results-demo-topline">
            <span className="results-demo-badge">Example</span>
            <div className="results-demo-meta">
              <span>Preview</span>
              <span>480P</span>
            </div>
          </div>

          <div className="results-demo-performers">
            <figure>
              <div className="results-demo-image">
                <img src={DEMO.leftImage} alt="Example left performer"/>
              </div>
              <figcaption>Left</figcaption>
            </figure>
            <span className="results-demo-plus" aria-hidden="true">+</span>
            <figure>
              <div className="results-demo-image">
                <img src={DEMO.rightImage} alt="Example right performer"/>
              </div>
              <figcaption>Right</figcaption>
            </figure>
          </div>

          <div className="results-demo-arrow" aria-hidden="true">
            <ArrowDown size={16}/>
          </div>

          <div className="results-demo-video">
            <video
              src={DEMO.video}
              controls
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
            />
          </div>
        </div>
        )
      ) : (
        <div className="results-grid">
          {visibleTasks.map(task => {
            const retrying = retryingTaskId === task.id

            return <article key={task.id} className="result-card">
              {task.status === 'completed' && task.result_url ? <>
                <video src={task.result_url} controls playsInline preload="metadata"/>
                <a
                  className="result-download"
                  href={`/api/download/${task.id}`}
                  download
                  aria-label="Download video"
                  title="Download video"
                >
                  <Download size={17}/>
                </a>
              </> : task.status === 'failed' ? <>
                <div className="result-state">
                  <AlertCircle size={24}/>
                  <strong>Generation failed</strong>
                  <span>{task.failure_message || 'Please try again.'}</span>
                  {onRetry && <button
                    type="button"
                    className="result-retry"
                    disabled={retrying}
                    onClick={() => onRetry(task.id)}
                  >
                    {retrying ? <Loader2 className="spin" size={14}/> : <RotateCcw size={14}/>}
                    {retrying ? 'Retrying…' : 'Retry'}
                  </button>}
                </div>
              </> : <>
                <div className="result-state">
                  <Loader2 className="spin" size={25}/>
                  <strong>Generating…</strong>
                  <span>This result updates automatically.</span>
                </div>
              </>}
            </article>
          })}
        </div>
      )}
    </section>

    {historyOpen && (
      <div className="history-modal-backdrop" onMouseDown={event => {
        if (event.currentTarget === event.target) setHistoryOpen(false)
      }}>
        <section className="history-modal" role="dialog" aria-modal="true" aria-label="Generation history">
          <div className="history-modal-head">
            <div>
              <h2>Generation history</h2>
              <p>{tasks.length} recent generation{tasks.length === 1 ? '' : 's'} · newest first</p>
            </div>
            <button type="button" className="history-modal-close" onClick={() => setHistoryOpen(false)} aria-label="Close history">
              <X size={18}/>
            </button>
          </div>

          <div className="history-grid">
            {tasks.map(task => {
              const retrying = retryingTaskId === task.id
              const completed = task.status === 'completed' && Boolean(task.result_url)
              const status = taskStatus(task)

              return <article key={task.id} className="history-card">
                <div className="history-card-media">
                  {completed ? (
                    <button
                      type="button"
                      className="history-thumb"
                      onClick={() => setSelectedTaskId(task.id)}
                      aria-label="Play generated video"
                    >
                      <video
                        src={task.result_url!}
                        muted
                        playsInline
                        preload="metadata"
                        onLoadedMetadata={event => {
                          const video = event.currentTarget
                          if (video.duration > 0 && video.currentTime === 0) {
                            video.currentTime = Math.min(0.1, video.duration / 2)
                          }
                        }}
                      />
                      <span className="history-play"><Play size={17} fill="currentColor"/></span>
                    </button>
                  ) : task.status === 'failed' ? (
                    <div className="history-thumb history-thumb-state">
                      <AlertCircle size={24}/>
                      <strong>Generation failed</strong>
                      {task.failure_message && <span>{task.failure_message}</span>}
                    </div>
                  ) : (
                    <div className="history-thumb history-thumb-state">
                      <Loader2 className="spin" size={24}/>
                      <strong>Generating…</strong>
                    </div>
                  )}
                  <span className={`history-status history-status-${status.key}`}>{status.label}</span>
                </div>

                <div className="history-card-footer">
                  <div className="history-card-summary">
                    <strong>{sceneLabel(task)}</strong>
                    <span>{formatTaskDate(task.created_at)}</span>
                  </div>

                  <div className="history-card-tools">
                    <span className="history-chip">{task.resolution?.toUpperCase() || '—'}</span>
                    <span className="history-chip">{task.duration_seconds ? `${task.duration_seconds}s` : '—'}</span>

                    {completed && <a
                      className="history-download"
                      href={`/api/download/${task.id}`}
                      download
                    >
                      <Download size={14}/> Download
                    </a>}

                    {task.status === 'failed' && onRetry && (
                      <button
                        type="button"
                        className="history-retry"
                        disabled={retrying}
                        onClick={() => onRetry(task.id)}
                      >
                        {retrying ? <Loader2 className="spin" size={14}/> : <RotateCcw size={14}/>}
                        {retrying ? 'Retrying…' : 'Retry'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            })}
          </div>
        </section>

        {selectedTask && (
          <div className="history-viewer-backdrop" onMouseDown={event => {
            if (event.currentTarget === event.target) setSelectedTaskId(null)
          }}>
            <section className="history-viewer" role="dialog" aria-modal="true" aria-label="Generated video preview">
              <div className="history-viewer-head">
                <div>
                  <strong>{sceneLabel(selectedTask)}</strong>
                  <span>{taskDetails(selectedTask)} · {formatTaskDate(selectedTask.created_at)}</span>
                </div>
                <button type="button" onClick={() => setSelectedTaskId(null)} aria-label="Close video preview"><X size={18}/></button>
              </div>
              <video key={selectedTask.id} src={selectedTask.result_url!} controls autoPlay playsInline preload="metadata"/>
              <div className="history-viewer-footer">
                <span>{selectedTask.generate_audio ? 'Soundtrack on' : 'Soundtrack off'} · {selectedTask.credits_used ?? '—'} credits</span>
                <a href={`/api/download/${selectedTask.id}`} download>
                  <Download size={15}/> Download
                </a>
              </div>
            </section>
          </div>
        )}
      </div>
    )}
  </>
}

function HistoryParam({ label, value }: { label: string; value: string }) {
  return <div className="history-param">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
}

function taskStatus(task: GenerationTask) {
  if (task.status === 'completed') return { key: 'completed', label: 'Completed' }
  if (task.status === 'failed') return { key: 'failed', label: 'Failed' }
  return { key: 'generating', label: 'Generating' }
}

function sceneLabel(task: GenerationTask) {
  const prompt = task.prompt || ''
  if (prompt.includes('warm orange studio stage')) return 'Orange Stage'
  if (prompt.includes('modern recording studio')) return 'Recording Studio'
  if (prompt.includes('elegant grand hall')) return 'Grand Hall'
  return 'Preset Scene'
}

function taskDetails(task: GenerationTask) {
  const parts: string[] = []
  if (task.duration_seconds) parts.push(`${task.duration_seconds}s`)
  if (task.resolution) parts.push(task.resolution.toUpperCase())
  if (task.aspect_ratio) parts.push(task.aspect_ratio)
  return parts.join(' · ') || 'Hotel Lobby AI'
}

function formatTaskDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
