import { createFileRoute } from '@tanstack/react-router'
import { PricingPanel } from '@/components/billing/PricingPanel'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SITE_CONFIG } from '@/config/site'
import { localeFromPrefix } from '@/i18n/config'
import { getMessages } from '@/i18n/messages'
import { localizedAlternates, localizedCanonical } from '@/i18n/seo'

export const Route = createFileRoute('/$locale/pricing')({
  head: ({ params }) => {
    const locale = localeFromPrefix(params.locale) || 'zh-CN'
    const messages = getMessages(locale)
    return {
      meta: [
        { title: `${messages.pricing.kicker} – ${SITE_CONFIG.name}` },
        { name: 'description', content: messages.pricing.description },
        { name: 'robots', content: 'index,follow' },
      ],
      links: [
        { rel: 'canonical', href: localizedCanonical('/pricing', locale) },
        ...localizedAlternates('/pricing'),
      ],
    }
  },
  component: LocalizedPricingPage,
})

function LocalizedPricingPage() {
  return (
    <main>
      <SiteHeader />
      <section className="pricing-page">
        <PricingPanel />
      </section>
      <SiteFooter />
    </main>
  )
}
