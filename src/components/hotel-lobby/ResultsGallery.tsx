import { AlertCircle, Download, Loader2, RotateCcw, Sparkles } from 'lucide-react'
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
  const visibleTasks = latestOnly ? tasks.slice(0, 1) : tasks

  return <section className="results">
    <div className="results-head">
      <div>
        <h2>Generated video</h2>
        <p>{tasks.length ? 'Your newest result appears here.' : 'Your result will appear here after generation.'}</p>
      </div>
      {tasks.length > 0 && <span>{tasks.length}</span>}
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
}
