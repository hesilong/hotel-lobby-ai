import type { MotionTemplate } from '@/config/hotel-lobby'

export function MotionGallery({ templates }: { templates: MotionTemplate[] }) {
  return <div className="motion-grid">{templates.map((template) => (
    <article className="motion-card" key={template.id}>
      <div className="motion-video-wrap">
        <video
          src={template.previewVideoUrl}
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          onMouseEnter={(e) => void e.currentTarget.play().catch(() => undefined)}
          onMouseLeave={(e) => e.currentTarget.pause()}
        />
      </div>
    </article>
  ))}</div>
}
