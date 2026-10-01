import { createFileRoute } from '@tanstack/react-router'
import { PricingPanel } from '@/components/billing/PricingPanel'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'

export const Route = createFileRoute('/pricing')({
  head: () => ({
    meta: [
      { title: 'Pricing – Hotel Lobby AI' },
      { name: 'description', content: 'Choose a Hotel Lobby AI plan or buy credits for AI video generation.' },
      { name: 'robots', content: 'index,follow' },
    ],
    links: [{ rel: 'canonical', href: 'https://hotel-lobby-ai.pro/pricing' }],
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
