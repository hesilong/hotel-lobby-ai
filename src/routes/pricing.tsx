import { createFileRoute } from '@tanstack/react-router'
import { PricingPanel } from '@/components/billing/PricingPanel'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SITE_CONFIG, siteUrl } from '@/config/site'

export const Route = createFileRoute('/pricing')({
  head: () => ({
    meta: [
      { title: `Pricing – ${SITE_CONFIG.name}` },
      { name: 'description', content: `Pay per Hotel Lobby AI video: $4.99 for 480p, $9.90 for 720p, or $19.90 for 1080p. No subscription required.` },
      { name: 'robots', content: 'index,follow' },
    ],
    links: [{ rel: 'canonical', href: siteUrl('/pricing') }],
  }),
  component: PricingPage,
})

function PricingPage() {
  return <main>
    <SiteHeader />
    <section className="pricing-page">
      <PricingPanel />
    </section>
    <SiteFooter />
  </main>
}
