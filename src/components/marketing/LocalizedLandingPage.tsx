import { HotelLobbyWorkbench } from '@/components/hotel-lobby/HotelLobbyWorkbench'
import { MotionGallery } from '@/components/hotel-lobby/MotionGallery'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import {
  HOTEL_LOBBY_FRIENDS_WEBP,
  HOTEL_LOBBY_PETS_WEBP,
  HOTEL_LOBBY_STREETWEAR_WEBP,
} from '@/config/hotel-lobby-visuals'
import { SITE_CONFIG } from '@/config/site'
import { getLocalizedLandingCopy, type LandingPageCopy } from '@/i18n/landing-content'
import { useI18n } from '@/i18n/useI18n'

const HOME_MOTION_TEMPLATES = [
  {
    id: 'home-motion-3',
    previewVideoUrl: 'https://cdn.clothmotion.app/templates/hotel-lobby-ai/preview/hotel-lobby-ai-3.mp4',
  },
  {
    id: 'home-motion-4',
    previewVideoUrl: 'https://cdn.clothmotion.app/templates/hotel-lobby-ai/preview/hotel-lobby-ai-4.mp4',
  },
  {
    id: 'home-motion-2',
    previewVideoUrl: 'https://cdn.clothmotion.app/templates/hotel-lobby-ai/preview/hotel-lobby-ai-2.mp4',
  },
]

const SHOWCASE_IMAGES = [
  HOTEL_LOBBY_FRIENDS_WEBP,
  HOTEL_LOBBY_PETS_WEBP,
  HOTEL_LOBBY_STREETWEAR_WEBP,
]

function LocalizedHero({ copy }: { copy: LandingPageCopy }) {
  return (
    <section className="hero hero-home">
      <div className="hero-background" aria-hidden="true">
        <img src={HOTEL_LOBBY_FRIENDS_WEBP} alt="" />
      </div>
      <div className="hero-copy">
        <span className="eyebrow">{copy.eyebrow}</span>
        <h1>{copy.title} <span>{copy.titleAccent}</span></h1>
        <p>{copy.intro}</p>
        <div className="hero-chips">
          {copy.chips.map(item => <span key={item}>{item}</span>)}
        </div>
      </div>
      <div id="generator"><HotelLobbyWorkbench /></div>
    </section>
  )
}

function Showcase({ copy }: { copy: LandingPageCopy }) {
  return (
    <section className="section section-centered">
      <div className="section-heading centered">
        <span>{copy.sectionKicker}</span>
        <h2>{copy.sectionTitle}</h2>
        <p>{copy.sectionIntro}</p>
      </div>
      <div className="showcase-grid">
        {copy.cards.map((card, index) => (
          <article key={card.title}>
            <img src={SHOWCASE_IMAGES[index] || HOTEL_LOBBY_FRIENDS_WEBP} alt={card.title} loading="lazy" />
            <div className="showcase-body">
              <div className="showcase-mark">{String(index + 1).padStart(2, '0')}</div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function HowItWorks({ copy }: { copy: LandingPageCopy }) {
  return (
    <section className="band" id="how-it-works">
      <div className="section section-centered">
        <div className="section-heading centered">
          <span>{copy.howKicker}</span>
          <h2>{copy.howTitle}</h2>
          <p>{copy.howIntro}</p>
        </div>
        <div className="steps steps-large">
          {copy.steps.map((step, index) => (
            <article key={step.title}>
              <b>{String(index + 1).padStart(2, '0')}</b>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Tips({ copy }: { copy: LandingPageCopy }) {
  return (
    <section className="band">
      <div className="section split-info">
        <div>
          <span className="section-kicker">{copy.tipsKicker}</span>
          <h2>{copy.tipsTitle}</h2>
          <p>{copy.tipsIntro}</p>
        </div>
        <div className="tips-panel">
          <h3>{copy.tipsPanelTitle}</h3>
          <ul>{copy.tips.map(item => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
    </section>
  )
}

function Guide({ copy }: { copy: LandingPageCopy }) {
  return (
    <section className="section editorial-section">
      <div className="editorial-lead">
        <span className="section-kicker">{copy.guideKicker}</span>
        <h2>{copy.guideTitle}</h2>
        <p>{copy.guideIntro}</p>
      </div>
      <div className="editorial-grid">
        {copy.guide.map(section => (
          <article key={section.title}>
            <h3>{section.title}</h3>
            <p>{section.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function Faq({ copy }: { copy: LandingPageCopy }) {
  return (
    <section className="band" id="faq">
      <div className="section">
        <div className="section-heading faq-heading">
          <span>FAQ</span>
          <h2>{copy.faqTitle}</h2>
          <p><a href={`mailto:${SITE_CONFIG.supportEmail}`}>{SITE_CONFIG.supportEmail}</a></p>
        </div>
        <div className="faq-list">
          {copy.faq.map((item, index) => (
            <details key={item.q}>
              <summary>
                <span className="faq-number">{index + 1}</span>
                <span>{item.q}</span>
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function Cta({ copy }: { copy: LandingPageCopy }) {
  return (
    <section className="section launch-cta">
      <div>
        <span className="eyebrow">{copy.ctaKicker}</span>
        <h2>{copy.ctaTitle}</h2>
        <p>{copy.ctaBody}</p>
      </div>
      <a className="seo-cta" href="#generator">{copy.ctaButton}</a>
    </section>
  )
}

function StructuredData({ copy }: { copy: LandingPageCopy }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: `${SITE_CONFIG.name} Video Generator`,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web',
        description: copy.seoDescription,
      },
      {
        '@type': 'FAQPage',
        mainEntity: copy.faq.map(item => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a,
          },
        })),
      },
    ],
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
}

export function LocalizedHomePage() {
  const { locale } = useI18n()
  const copy = getLocalizedLandingCopy(locale).home

  return (
    <main>
      <SiteHeader overlay />
      <LocalizedHero copy={copy} />
      <Showcase copy={copy} />

      <section className="section" id="templates">
        <div className="section-heading">
          <span>{copy.sectionKicker}</span>
          <h2>{copy.howTitle}</h2>
          <p>{copy.sectionIntro}</p>
        </div>
        <MotionGallery templates={HOME_MOTION_TEMPLATES} />
      </section>

      <HowItWorks copy={copy} />
      <Tips copy={copy} />
      <Guide copy={copy} />
      <Faq copy={copy} />
      <Cta copy={copy} />
      <SiteFooter />
      <StructuredData copy={copy} />
    </main>
  )
}

export function LocalizedMigosPage() {
  const { locale } = useI18n()
  const copy = getLocalizedLandingCopy(locale).migos

  return (
    <main>
      <SiteHeader />
      <LocalizedHero copy={copy} />
      <Showcase copy={copy} />
      <HowItWorks copy={copy} />
      <Tips copy={copy} />
      <Guide copy={copy} />
      <Faq copy={copy} />
      <Cta copy={copy} />
      <SiteFooter />
      <StructuredData copy={copy} />
    </main>
  )
}
