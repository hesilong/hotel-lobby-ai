import { createFileRoute } from '@tanstack/react-router'
import { HotelLobbyWorkbench } from '@/components/hotel-lobby/HotelLobbyWorkbench'
import { MotionGallery } from '@/components/hotel-lobby/MotionGallery'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { HOTEL_LOBBY_TEMPLATES } from '@/config/hotel-lobby'

const faqItems = [
  {
    q: 'What is Hotel Lobby AI?',
    a: 'Hotel Lobby AI is a browser-based AI video tool for creating the popular two-person hotel-lobby-style performance from two images and a motion reference.',
  },
  {
    q: 'How do I make a Hotel Lobby AI video?',
    a: 'Upload one image for Person A and one for Person B, choose a motion template or upload a reference video, then generate the result.',
  },
  {
    q: 'What photos work best?',
    a: 'Use clear, well-lit images with one visible person in each image. Frontal or three-quarter portraits with unobstructed faces usually give the model more identity detail to work with.',
  },
  {
    q: 'Can I upload my own reference video?',
    a: 'Yes. You can choose one of the built-in Hotel Lobby motion templates or upload your own compatible reference video.',
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'Hotel Lobby AI Video Generator',
      url: 'https://hotel-lobby-ai.pro/',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web',
      description: 'Create Hotel Lobby AI videos from two photos and a reference motion video.',
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

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Hotel Lobby AI Generator – Create Viral Hotel Lobby Videos' },
      {
        name: 'description',
        content: 'Create Hotel Lobby AI videos from two photos and a reference motion. Upload your images, choose a template, and generate your video online.',
      },
      { property: 'og:title', content: 'Hotel Lobby AI Generator – Create Viral Hotel Lobby Videos' },
      {
        property: 'og:description',
        content: 'Create Hotel Lobby AI videos from two photos and a reference motion. Choose a template or upload your own video.',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://hotel-lobby-ai.pro/' },
      { property: 'og:site_name', content: 'Hotel Lobby AI' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: 'Hotel Lobby AI Generator' },
      {
        name: 'twitter:description',
        content: 'Turn two photos into a Hotel Lobby AI video with a motion template or your own reference video.',
      },
      { name: 'robots', content: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' },
    ],
    links: [{ rel: 'canonical', href: 'https://hotel-lobby-ai.pro/' }],
  }),
  component: HomePage,
})

function HomePage() {
  return (
    <main>
      <SiteHeader />

      <section className="hero">
        <div className="hero-glow hero-glow-a" /><div className="hero-glow hero-glow-b" />
        <div className="hero-copy">
          <span className="eyebrow">Viral AI Video</span>
          <h1>Hotel Lobby <span>AI Video Generator</span></h1>
          <p>Turn two photos into a Hotel Lobby style AI performance. Pick a motion, add optional instructions, and generate.</p>
        </div>
        <HotelLobbyWorkbench />
      </section>

      <section className="section" id="templates">
        <div className="section-heading">
          <span>Motion Library</span>
          <h2>Choose the performance that fits</h2>
          <p>Your characters stay the same. The selected reference controls motion, pacing, framing, and camera behavior.</p>
        </div>
        <MotionGallery templates={HOTEL_LOBBY_TEMPLATES} />
      </section>

      <section className="section alt" id="how-it-works">
        <div className="section-heading"><span>How it works</span><h2>Two photos. One motion. One video.</h2></div>
        <div className="steps">
          <article><b>01</b><h3>Upload two photos</h3><p>Use one clear image for each person or character.</p></article>
          <article><b>02</b><h3>Choose a motion</h3><p>Pick a Hotel Lobby template or upload your own reference video.</p></article>
          <article><b>03</b><h3>Generate</h3><p>Keep the identities and let the motion reference drive the performance.</p></article>
        </div>
      </section>

      <section className="section seo-copy">
        <div className="section-heading">
          <span>Hotel Lobby AI</span>
          <h2>Create the Hotel Lobby AI trend from your own photos</h2>
        </div>
        <div className="seo-grid">
          <article>
            <h3>What is Hotel Lobby AI?</h3>
            <p>Hotel Lobby AI is a two-person AI video format built around a reference performance. Upload two images, keep each person in a consistent left/right role, and use a motion clip to guide timing, gestures, framing, and movement.</p>
          </article>
          <article>
            <h3>Use a template or your own motion</h3>
            <p>Start quickly with a built-in motion template, or upload your own reference video when you want a different performance. The generator keeps the workflow focused on two identities and one motion source.</p>
          </article>
          <article>
            <h3>Looking for Migos AI?</h3>
            <p>We also have a dedicated page for people searching for Migos AI video tools and the related hotel-lobby-style duo-video format.</p>
            <a className="seo-link" href="/migos-ai-video">Open the Migos AI Video Generator page →</a>
          </article>
        </div>
      </section>

      <section className="section alt" id="faq">
        <div className="section-heading"><span>FAQ</span><h2>Hotel Lobby AI questions</h2></div>
        <div className="faq-list">
          {faqItems.map(item => <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>)}
        </div>
      </section>

      <footer className="site-footer">
        <div>
          <a className="brand" href="/">Hotel Lobby AI</a>
          <p>Independent AI video tool for creating hotel-lobby-style motion videos.</p>
        </div>
        <div className="footer-links">
          <a href="/">Hotel Lobby AI</a>
          <a href="/migos-ai-video">Migos AI Video</a>
          <a href="#faq">FAQ</a>
        </div>
        <p className="disclaimer">Hotel Lobby AI is an independent tool and is not affiliated with or endorsed by Migos or related rights holders.</p>
      </footer>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  )
}
