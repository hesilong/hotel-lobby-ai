import { createFileRoute } from '@tanstack/react-router'
import { HotelLobbyWorkbench } from '@/components/hotel-lobby/HotelLobbyWorkbench'
import { MotionGallery } from '@/components/hotel-lobby/MotionGallery'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { HOTEL_LOBBY_TEMPLATES } from '@/config/hotel-lobby'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Hotel Lobby AI Video Generator' },
      {
        name: 'description',
        content: 'Upload two photos, choose a Hotel Lobby motion template, and generate an AI video online.',
      },
      { property: 'og:title', content: 'Hotel Lobby AI Video Generator' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://hotel-lobby-ai.pro/' },
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
        <div className="section-heading"><span>Motion Library</span><h2>Choose the performance that fits</h2><p>Your characters stay the same. The selected reference controls motion, pacing, framing, and camera behavior.</p></div>
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
    </main>
  )
}
