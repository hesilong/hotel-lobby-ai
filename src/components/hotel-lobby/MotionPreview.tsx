import { useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

export function MotionPreview({ src, label }: { src: string; label: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  const play = () => {
    const video = videoRef.current
    if (video) void video.play().catch(() => undefined)
  }
  const pause = () => videoRef.current?.pause()

  return (
    <button
      type="button"
      className="motion-preview"
      aria-label={`${playing ? 'Pause' : 'Play'} ${label} preview`}
      aria-pressed={playing}
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') play() }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') pause() }}
      onBlur={pause}
      onClick={(event) => {
        if (event.detail !== 0 && !window.matchMedia('(hover: none), (pointer: coarse)').matches) return
        if (videoRef.current?.paused) play()
        else pause()
      }}
    >
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <span className="motion-preview-control" aria-hidden="true">
        <span className="motion-preview-text">{playing ? 'Pause' : 'Play'}</span>
        {playing ? <Pause className="motion-preview-icon" size={26} fill="currentColor" /> : <Play className="motion-preview-icon" size={26} fill="currentColor" />}
      </span>
    </button>
  )
}
