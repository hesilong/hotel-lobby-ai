import { createFileRoute } from '@tanstack/react-router'
import { HotelLobbyWorkbench } from '@/components/hotel-lobby/HotelLobbyWorkbench'
import { SiteHeader } from '@/components/layout/SiteHeader'

const faqItems = [
  {
    q: 'What is a Migos AI video generator?',
    a: 'This page is for people searching for Migos AI video tools that create a two-person hotel-lobby-style AI performance from photos and a motion reference.',
  },
  {
    q: 'Do I need two photos?',
    a: 'Yes. Use one clear image for Person A and one for Person B so the generator can preserve two separate identities.',
  },
  {
    q: 'Can I use a custom motion video?',
    a: 'Yes. You can upload your own compatible reference video instead of using a built-in motion template.',
  },
  {
    q: 'Is this an official Migos product?',
    a: 'No. Hotel Lobby AI is an independent AI tool and is not affiliated with or endorsed by Migos or related rights holders.',
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'Migos AI Video Generator',
      url: 'https://hotel-lobby-ai.pro/migos-ai-video',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web',
      description: 'Create a Migos AI-style hotel lobby video from two photos and a motion reference.',
    },
    {
      '@type': 'FAQPage',
      mainEntity: faqItems.map(item => ({
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

export const Route = createFileRoute('/migos-ai-video')({
  head: () => ({
    meta: [
      { title: 'Migos AI Video Generator – Create Hotel Lobby AI Videos' },
      {
        name: 'description',
        content: 'Create a Migos AI-style Hotel Lobby video from two photos. Upload your duo, choose a reference motion, and generate an AI video online.',
      },
      { property: 'og:title', content: 'Migos AI Video Generator – Create Hotel Lobby AI Videos' },
      {
        property: 'og:description',
        content: 'Create a two-person Migos AI-style Hotel Lobby video from your photos and a motion reference.',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://hotel-lobby-ai.pro/migos-ai-video' },
      { property: 'og:site_name', content: 'Hotel Lobby AI' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: 'Migos AI Video Generator' },
      {
        name: 'twitter:description',
        content: 'Upload two photos and create a hotel-lobby-style Migos AI video with a reference motion.',
      },
      { name: 'robots', content: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' },
    ],
    links: [{ rel: 'canonical', href: 'https://hotel-lobby-ai.pro/migos-ai-video' }],
  }),
  component: MigosAiPage,
})

function MigosAiPage() {
  return (
    <main>
      <SiteHeader />

      <section className="hero">
        <div className="hero-glow hero-glow-a" /><div className="hero-glow hero-glow-b" />
        <div className="hero-copy">
          <span className="eyebrow">Migos AI Video</span>
          <h1>Migos AI <span>Video Generator</span></h1>
          <p>Create a two-person hotel-lobby-style AI video from your own photos. Choose a motion reference, keep each identity separate, and generate online.</p>
        </div>
        <HotelLobbyWorkbench />
      </section>

      <section className="section seo-copy">
        <div className="section-heading">
          <span>Migos AI</span>
          <h2>Make a Migos AI-style Hotel Lobby video</h2>
          <p>This page is designed for searches around Migos AI video generation and the related two-person Hotel Lobby AI format.</p>
        </div>
        <div className="steps">
          <article><b>01</b><h3>Add Person A and Person B</h3><p>Upload two separate, clear images so the generator can keep the identities distinct.</p></article>
          <article><b>02</b><h3>Choose the motion</h3><p>Use a built-in Hotel Lobby motion or upload your own reference video.</p></article>
          <article><b>03</b><h3>Generate the video</h3><p>The motion reference guides timing, framing, gestures, and body movement.</p></article>
        </div>
      </section>

      <section className="section alt">
        <div className="section-heading"><span>FAQ</span><h2>Migos AI video questions</h2></div>
        <div className="faq-list">
          {faqItems.map(item => <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>)}
        </div>
      </section>

      <section className="section related-link-block">
        <div>
          <span className="eyebrow">Related generator</span>
          <h2>Hotel Lobby AI Video Generator</h2>
          <p>Prefer the broader Hotel Lobby AI workflow and template library? Use the main generator page.</p>
        </div>
        <a className="seo-cta" href="/">Open Hotel Lobby AI →</a>
      </section>

      <footer className="site-footer">
        <div>
          <a className="brand" href="/">Hotel Lobby AI</a>
          <p>Independent AI video tool for creating hotel-lobby-style motion videos.</p>
        </div>
        <div className="footer-links">
          <a href="/">Hotel Lobby AI</a>
          <a href="/migos-ai-video">Migos AI Video</a>
        </div>
        <p className="disclaimer">Hotel Lobby AI is an independent tool and is not affiliated with or endorsed by Migos or related rights holders.</p>
      </footer>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  )
}
