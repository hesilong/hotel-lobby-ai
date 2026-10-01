import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import appCss from '@/styles/app.css?url'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { Clarity } from '@/components/analytics/Clarity'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#f7f8fb' },
      { title: 'Hotel Lobby AI Video Generator' },
      {
        name: 'description',
        content: 'Create Hotel Lobby AI videos from two photos and a reference motion video.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/webp', href: '/hotel-lobby-icon-v2.webp' },
    ],
  }),
  component: RootDocument,
})

function RootDocument() {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        <Outlet />
        <GoogleAnalytics measurementId={import.meta.env.VITE_GA4_MEASUREMENT_ID || 'G-QRGEK14KFY'} />
        <Clarity projectId={import.meta.env.VITE_CLARITY_PROJECT_ID || 'yqmsv0u4fd'} />
        <Scripts />
      </body>
    </html>
  )
}
