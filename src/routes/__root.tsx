import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import appCss from '@/styles/app.css?url'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { Clarity } from '@/components/analytics/Clarity'
import { SITE_CONFIG } from '@/config/site'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#f7f8fb' },
      { title: SITE_CONFIG.defaultTitle },
      {
        name: 'description',
        content: SITE_CONFIG.defaultDescription,
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: SITE_CONFIG.faviconPath },
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
