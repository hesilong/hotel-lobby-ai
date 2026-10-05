import type { MotionTemplate } from '@/config/hotel-lobby'
import { MotionPreview } from './MotionPreview'

export function MotionGallery({ templates }: { templates: Pick<MotionTemplate, 'id' | 'previewVideoUrl'>[] }) {
  return <div className="motion-grid">{templates.map((template) => (
    <article className="motion-card" key={template.id}>
      <div className="motion-video-wrap">
        <MotionPreview src={template.previewVideoUrl} label={`motion ${template.id}`} />
      </div>
    </article>
  ))}</div>
}
