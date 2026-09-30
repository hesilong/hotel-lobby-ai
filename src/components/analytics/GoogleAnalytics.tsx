import { useEffect } from 'react'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

const initializedIds = new Set<string>()

type GoogleAnalyticsProps = {
  measurementId: string
}

/** GA4 owns page views via enhanced measurement; do not also send them on route changes. */
export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  useEffect(() => {
    if (!import.meta.env.PROD || !/^G-[A-Z0-9]+$/.test(measurementId)) return
    if (initializedIds.has(measurementId)) return

    window.dataLayer = window.dataLayer || []
    window.gtag = window.gtag || function () {
      window.dataLayer!.push(arguments)
    }

    if (!document.getElementById('google-analytics-script')) {
      window.gtag('js', new Date())
      const script = document.createElement('script')
      script.id = 'google-analytics-script'
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
      document.head.appendChild(script)
    }

    window.gtag('config', measurementId)
    initializedIds.add(measurementId)
    // Keep the shared tag alive across component remounts and client navigation.
  }, [measurementId])

  return null
}
