import { useMemo, useState } from 'react'
import { AlertCircle, ArrowDown, Clock3, Download, Loader2, Play, RotateCcw, X } from 'lucide-react'
import type { GenerationTask } from '@/server/generation'
import { REVIEW_MODE } from '@/config/feature-flags'
import { SITE_CONFIG } from '@/config/site'

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
  onRefund,
  refundingTaskId,
  latestOnly = false,
}: {
  tasks: GenerationTask[]
  onRetry?: (taskId: string) => void
  retryingTaskId?: string | null
  onRefund?: (taskId: string) => void
  refundingTaskId?: string | null
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
            const refunding = refundingTaskId === task.id
            const paidFailure = Boolean(task.generation_order_id)
            const canRetryPaid = !paidFailure || task.generation_order_status === 'failed'
            const refundNeedsSupport = Boolean(task.refund_ticket_id && task.refund_error)
            const canRefund = paidFailure && task.generation_order_status === 'failed' && !refundNeedsSupport
            const refundRequested = task.generation_order_status === 'refund_requested'
            const refunded = task.generation_order_status === 'refunded'

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
                  <strong>{refunded ? 'Refunded' : refundRequested ? 'Refund requested' : 'Generation failed'}</strong>
                  <span>
                    {refunded
                      ? 'This payment has been refunded.'
                      : refundRequested
                        ? 'Your refund request was submitted to Waffo.'
                        : paidFailure
                          ? refundNeedsSupport
                            ? 'Your payment is still protected. Retry for free, or contact support so we can resolve the failed refund request.'
                            : 'Your payment is protected. Retry this generation for free, or request a refund.'
                          : task.failure_message || 'Please try again.'}
                  </span>
                  {task.refund_error && <span className="result-refund-error">The payment provider could not complete the refund automatically.</span>}
                  {!refundRequested && !refunded && (
                    <div className="result-failure-actions">
                      {onRetry && canRetryPaid && <button
                        type="button"
                        className="result-retry"
                        disabled={retrying || refunding}
                        onClick={() => onRetry(task.id)}
                      >
                        {retrying ? <Loader2 className="spin" size={14}/> : <RotateCcw size={14}/>}
                        {retrying ? 'Retrying…' : paidFailure ? 'Retry for free' : 'Retry'}
                      </button>}
                      {onRefund && canRefund && <button
                        type="button"
                        className="result-refund"
                        disabled={retrying || refunding}
                        onClick={() => onRefund(task.id)}
                      >
                        {refunding ? <Loader2 className="spin" size={14}/> : null}
                        {refunding ? 'Requesting…' : 'Request refund' + (task.generation_price_usd ? ' · 
                      </button>}
                      {refundNeedsSupport && <a className="result-refund" href={`mailto:${SITE_CONFIG.supportEmail}?subject=Refund%20support`}>Contact support</a>}
                    </div>
                  )}
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
              const refunding = refundingTaskId === task.id
              const completed = task.status === 'completed' && Boolean(task.result_url)
              const paidFailure = Boolean(task.generation_order_id)
              const canRetryPaid = !paidFailure || task.generation_order_status === 'failed'
              const refundNeedsSupport = Boolean(task.refund_ticket_id && task.refund_error)
              const canRefund = paidFailure && task.generation_order_status === 'failed' && !refundNeedsSupport
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

                    {task.status === 'failed' && task.generation_order_status !== 'refund_requested' && task.generation_order_status !== 'refunded' && onRetry && canRetryPaid && (
                      <button
                        type="button"
                        className="history-retry"
                        disabled={retrying || refunding}
                        onClick={() => onRetry(task.id)}
                      >
                        {retrying ? <Loader2 className="spin" size={14}/> : <RotateCcw size={14}/>}
                        {retrying ? 'Retrying…' : paidFailure ? 'Retry free' : 'Retry'}
                      </button>
                    )}
                    {task.status === 'failed' && onRefund && canRefund && (
                      <button
                        type="button"
                        className="history-refund"
                        disabled={retrying || refunding}
                        onClick={() => onRefund(task.id)}
                      >
                        {refunding ? <Loader2 className="spin" size={14}/> : null}
                        {refunding ? 'Requesting…' : 'Refund'}
                      </button>
                    )}
                    {refundNeedsSupport && <a className="history-refund" href={`mailto:${SITE_CONFIG.supportEmail}?subject=Refund%20support`}>Support</a>}
                    {task.generation_order_status === 'refund_requested' && <span className="history-chip">Refund requested</span>}
                    {task.generation_order_status === 'refunded' && <span className="history-chip">Refunded</span>}
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
                <span>
                  {selectedTask.generate_audio ? 'Soundtrack included' : 'Soundtrack off'}
                  {selectedTask.generation_price_usd ? ` · ${selectedTask.generation_price_usd.toFixed(2)} paid` : ''}
                </span>
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

function sceneLabel(_task: GenerationTask) {
  return 'Hotel Lobby'
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
 + task.generation_price_usd.toFixed(2) : '')}
                      </button>}
                      {refundNeedsSupport && <a className="result-refund" href={`mailto:${SITE_CONFIG.supportEmail}?subject=Refund%20support`}>Contact support</a>}
                    </div>
                  )}
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
              const refunding = refundingTaskId === task.id
              const completed = task.status === 'completed' && Boolean(task.result_url)
              const paidFailure = Boolean(task.generation_order_id)
              const canRetryPaid = !paidFailure || task.generation_order_status === 'failed'
              const refundNeedsSupport = Boolean(task.refund_ticket_id && task.refund_error)
              const canRefund = paidFailure && task.generation_order_status === 'failed' && !refundNeedsSupport
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

                    {task.status === 'failed' && task.generation_order_status !== 'refund_requested' && task.generation_order_status !== 'refunded' && onRetry && canRetryPaid && (
                      <button
                        type="button"
                        className="history-retry"
                        disabled={retrying || refunding}
                        onClick={() => onRetry(task.id)}
                      >
                        {retrying ? <Loader2 className="spin" size={14}/> : <RotateCcw size={14}/>}
                        {retrying ? 'Retrying…' : paidFailure ? 'Retry free' : 'Retry'}
                      </button>
                    )}
                    {task.status === 'failed' && onRefund && canRefund && (
                      <button
                        type="button"
                        className="history-refund"
                        disabled={retrying || refunding}
                        onClick={() => onRefund(task.id)}
                      >
                        {refunding ? <Loader2 className="spin" size={14}/> : null}
                        {refunding ? 'Requesting…' : 'Refund'}
                      </button>
                    )}
                    {refundNeedsSupport && <a className="history-refund" href={`mailto:${SITE_CONFIG.supportEmail}?subject=Refund%20support`}>Support</a>}
                    {task.generation_order_status === 'refund_requested' && <span className="history-chip">Refund requested</span>}
                    {task.generation_order_status === 'refunded' && <span className="history-chip">Refunded</span>}
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
                <span>
                  {selectedTask.generate_audio ? 'Soundtrack included' : 'Soundtrack off'}
                  {selectedTask.generation_price_usd ? ` · ${selectedTask.generation_price_usd.toFixed(2)} paid` : ''}
                </span>
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

function sceneLabel(_task: GenerationTask) {
  return 'Hotel Lobby'
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
