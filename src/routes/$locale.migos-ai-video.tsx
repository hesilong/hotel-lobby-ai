import { createFileRoute } from '@tanstack/react-router'
import { LocalizedMigosPage } from '@/components/marketing/LocalizedLandingPage'
import { SITE_CONFIG } from '@/config/site'
import { localeFromPrefix } from '@/i18n/config'
import { getLocalizedLandingCopy } from '@/i18n/landing-content'
import { localizedAlternates, localizedCanonical } from '@/i18n/seo'

export const Route = createFileRoute('/$locale/migos-ai-video')({
  head: ({ params }) => {
    const locale = localeFromPrefix(params.locale) || 'zh-CN'
    const copy = getLocalizedLandingCopy(locale).migos
    return {
      meta: [
        { title: copy.seoTitle },
        { name: 'description', content: copy.seoDescription },
        { property: 'og:title', content: copy.seoTitle },
        { property: 'og:description', content: copy.seoDescription },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: localizedCanonical('/migos-ai-video', locale) },
        { property: 'og:site_name', content: SITE_CONFIG.name },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: copy.seoTitle },
        { name: 'twitter:description', content: copy.seoDescription },
        { name: 'robots', content: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' },
      ],
      links: [
        { rel: 'canonical', href: localizedCanonical('/migos-ai-video', locale) },
        ...localizedAlternates('/migos-ai-video'),
      ],
    }
  },
  component: LocalizedMigosPage,
})
