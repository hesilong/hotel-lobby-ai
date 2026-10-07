import { createFileRoute } from '@tanstack/react-router'
import { PricingPanel } from '@/components/billing/PricingPanel'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SITE_CONFIG, siteUrl } from '@/config/site'

export const Route = createFileRoute('/pricing')({
  head: () => ({
    meta: [
      { title: `Pricing – ${SITE_CONFIG.name}` },
      { name: 'description', content: `Choose a ${SITE_CONFIG.name} plan or buy credits for AI video generation.` },
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
      <PricingPanel returnPath="/pricing" />
    </section>
    <SiteFooter />
  </main>
}
