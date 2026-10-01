import { AlertCircle, CheckCircle2, Download, Loader2, RotateCcw } from 'lucide-react'
import type { GenerationTask } from '@/server/generation'

export function ResultsGallery({
  tasks,
  onRetry,
  retryingTaskId,
}: {
  tasks: GenerationTask[]
  onRetry?: (taskId: string) => void
  retryingTaskId?: string | null
}) {
  if (!tasks.length) return null

  return <section className="results">
    <div className="results-head">
      <div>
        <h2>Generated videos</h2>
        <p>Newest results appear first.</p>
      </div>
      <span>{tasks.length}</span>
    </div>

    <div className="results-grid">
      {tasks.map(task => {
        const retrying = retryingTaskId === task.id

        return <article key={task.id} className="result-card">
          {task.status === 'completed' && task.result_url ? <>
            <div className="result-status result-status-complete"><CheckCircle2 size={13}/> Completed</div>
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
            <div className="result-status result-status-failed"><AlertCircle size={13}/> Failed</div>
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
            <div className="result-status result-status-generating"><Loader2 className="spin" size={13}/> Generating</div>
            <div className="result-state">
              <Loader2 className="spin" size={25}/>
              <strong>Generating…</strong>
              <span>This result updates automatically.</span>
            </div>
          </>}
        </article>
      })}
    </div>
  </section>
}
