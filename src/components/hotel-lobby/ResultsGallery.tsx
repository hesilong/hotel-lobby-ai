import { useMemo, useState } from 'react'
import { AlertCircle, Clock3, Download, Loader2, Play, RotateCcw, Sparkles, X } from 'lucide-react'
import type { GenerationTask } from '@/server/generation'

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
    const newestCompleted = tasks.find(task => task.status === 'completed' && task.result_url)
    setSelectedTaskId(newestCompleted?.id || null)
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
        <div className="results-empty">
          <Sparkles size={28}/>
          <strong>Ready when you are</strong>
          <span>Upload two performers, choose a scene, then generate.</span>
        </div>
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
              <p>Your recent Hotel Lobby AI videos.</p>
            </div>
            <button type="button" className="history-modal-close" onClick={() => setHistoryOpen(false)} aria-label="Close history">
              <X size={18}/>
            </button>
          </div>

          {selectedTask && (
            <div className="history-player">
              <video key={selectedTask.id} src={selectedTask.result_url!} controls autoPlay playsInline preload="metadata"/>
              <div className="history-player-meta">
                <span>{taskDetails(selectedTask)}</span>
                <a href={`/api/download/${selectedTask.id}`} download>
                  <Download size={15}/> Download
                </a>
              </div>
            </div>
          )}

          <div className="history-grid">
            {tasks.map(task => {
              const retrying = retryingTaskId === task.id
              const completed = task.status === 'completed' && Boolean(task.result_url)
              return <article key={task.id} className={`history-card ${selectedTaskId === task.id ? 'active' : ''}`}>
                {completed ? (
                  <button
                    type="button"
                    className="history-thumb"
                    onClick={() => setSelectedTaskId(task.id)}
                    aria-label="Play generated video"
                  >
                    <video src={task.result_url!} muted playsInline preload="metadata"/>
                    <span className="history-play"><Play size={18} fill="currentColor"/></span>
                  </button>
                ) : task.status === 'failed' ? (
                  <div className="history-thumb history-thumb-state">
                    <AlertCircle size={22}/>
                    <span>Failed</span>
                  </div>
                ) : (
                  <div className="history-thumb history-thumb-state">
                    <Loader2 className="spin" size={22}/>
                    <span>Generating…</span>
                  </div>
                )}

                <div className="history-card-body">
                  <div>
                    <strong>{taskDetails(task)}</strong>
                    <span>{formatTaskDate(task.created_at)}</span>
                  </div>
                  <div className="history-card-actions">
                    {completed && <a href={`/api/download/${task.id}`} download aria-label="Download generated video"><Download size={15}/></a>}
                    {task.status === 'failed' && onRetry && (
                      <button type="button" disabled={retrying} onClick={() => onRetry(task.id)}>
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
      </div>
    )}
  </>
}

function taskDetails(task: GenerationTask) {
  const parts: string[] = []
  if (task.duration_seconds) parts.push(`${task.duration_seconds}s`)
  if (task.resolution) parts.push(task.resolution.toUpperCase())
  if (task.aspect_ratio) parts.push(task.aspect_ratio)
  if (!parts.length && task.credits_used) parts.push(`${task.credits_used} credits`)
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
