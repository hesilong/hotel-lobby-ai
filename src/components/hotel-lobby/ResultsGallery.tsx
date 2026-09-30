import { Download, Loader2, AlertCircle } from 'lucide-react'
import type { GenerationTask } from '@/server/generation'

export function ResultsGallery({ tasks }: { tasks: GenerationTask[] }) {
  if (!tasks.length) return null
  return <section className="results">
    <div className="results-head"><div><h2>Generated videos</h2><p>Newest results appear first.</p></div><span>{tasks.length}</span></div>
    <div className="results-grid">{tasks.map(task => <article key={task.id} className="result-card">
      {task.status === 'completed' && task.result_url ? <>
        <video src={task.result_url} controls playsInline preload="metadata"/>
        <a className="result-download" href={task.result_url} download target="_blank" rel="noreferrer"><Download size={15}/></a>
      </> : task.status === 'failed' ? <div className="result-state"><AlertCircle size={24}/><strong>Generation failed</strong><span>{task.failure_message || 'Please try again.'}</span></div>
      : <div className="result-state"><Loader2 className="spin" size={25}/><strong>Generating…</strong><span>This result updates automatically.</span></div>}
    </article>)}</div>
  </section>
}
