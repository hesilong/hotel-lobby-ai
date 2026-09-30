import { Play } from 'lucide-react'
import type { MotionTemplate } from '@/config/hotel-lobby'

export function MotionGallery({ templates }: { templates: MotionTemplate[] }) {
  return <div className="motion-grid">{templates.map((template) => (
    <article className="motion-card" key={template.id}>
      <div className="motion-video-wrap">
        <video src={template.previewVideoUrl} muted loop playsInline preload="metadata"
          onMouseEnter={(e) => void e.currentTarget.play().catch(() => undefined)}
          onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 }} />
        <span className="play-badge"><Play size={18} fill="currentColor" /></span>
      </div>
    </article>
  ))}</div>
}
