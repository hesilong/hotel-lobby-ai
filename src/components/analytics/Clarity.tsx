import { useEffect } from 'react'

type ClarityTracker = {
  (...args: unknown[]): void
  q?: IArguments[]
}

declare global {
  interface Window {
    clarity?: ClarityTracker
  }
}

export function Clarity({ projectId }: { projectId: string }) {
  useEffect(() => {
    if (!import.meta.env.PROD || !/^[a-z0-9]+$/i.test(projectId)) return
    if (document.getElementById('clarity-script')) return

    // Preserve the queue format used by the official Clarity snippet.
    window.clarity = window.clarity || function () {
      const tracker = window.clarity!
      ;(tracker.q = tracker.q || []).push(arguments)
    }

    const script = document.createElement('script')
    script.id = 'clarity-script'
    script.async = true
    script.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`
    document.head.appendChild(script)
    // Keep the shared tracker alive across remounts and client navigation.
  }, [projectId])

  return null
}
