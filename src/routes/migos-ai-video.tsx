import { createFileRoute } from '@tanstack/react-router'
import { HotelLobbyWorkbench } from '@/components/hotel-lobby/HotelLobbyWorkbench'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { HOTEL_LOBBY_FRIENDS_WEBP, HOTEL_LOBBY_STREETWEAR_WEBP } from '@/config/hotel-lobby-visuals'
import { SITE_CONFIG, siteUrl } from '@/config/site'

const faqItems = [
  {
    q: 'What is a Migos AI video generator?',
    a: 'Migos AI is a search term people use for the viral two-performer Hotel Lobby-style AI video format. This independent generator turns two authorized source photos into a 15-second coordinated performance.',
  },
  {
    q: 'Do I need two photos?',
    a: 'Yes. Upload one clear image for the left performer and one for the right performer. You can swap their positions before generation.',
  },
  {
    q: 'Do I need to upload a motion video or write a prompt?',
    a: 'No. The Hotel Lobby motion and soundtrack are preset automatically. You only choose the two performers, 9:16 or 16:9, and export quality.',
  },
  {
    q: 'How long is the generated video?',
    a: 'Each generation is 15 seconds so the movement, pacing, and soundtrack stay consistent with the template.',
  },
  {
    q: 'Is a subscription required?',
    a: 'No. The site charges per generated video: $4.99 for 480p, $9.90 for 720p, or $19.90 for 1080p. There is no automatic renewal.',
  },
  {
    q: 'What happens if generation fails?',
    a: 'A technical generation failure can be retried for free on the same paid order. You can also request a refund after a failed attempt.',
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
      url: siteUrl('/migos-ai-video'),
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web',
      description: 'Create a 15-second two-performer Hotel Lobby-style AI video from two source photos.',
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
        content: 'Create a 15-second Migos AI-style Hotel Lobby video from two photos. Swap performers, choose 9:16 or 16:9, select quality, and generate online.',
      },
      { property: 'og:title', content: 'Migos AI Video Generator – Create Hotel Lobby AI Videos' },
      { property: 'og:description', content: 'Turn two photos into a 15-second two-performer Hotel Lobby-style AI video with preset motion and soundtrack.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: siteUrl('/migos-ai-video') },
      { property: 'og:site_name', content: SITE_CONFIG.name },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: 'Migos AI Video Generator' },
      { name: 'twitter:description', content: 'Upload two photos and create a 15-second Hotel Lobby-style duo video with preset motion and soundtrack.' },
      { name: 'robots', content: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' },
    ],
    links: [{ rel: 'canonical', href: siteUrl('/migos-ai-video') }],
  }),
  component: MigosAiPage,
})

function MigosAiPage() {
  return (
    <main>
      <SiteHeader />

      <section className="hero hero-migos">
        <div className="hero-glow hero-glow-a" /><div className="hero-glow hero-glow-b" />
        <div className="hero-copy">
          <span className="eyebrow">Migos AI Video</span>
          <h1>Migos AI <span>Video Generator</span></h1>
          <p>Upload two photos and turn them into a 15-second Hotel Lobby-style duo performance. Motion and soundtrack are preset, so there is no prompt or reference-video setup.</p>
          <div className="hero-chips">
            <span>2 performer photos</span>
            <span>15-second video</span>
            <span>9:16 & 16:9</span>
          </div>
        </div>
        <div id="generator"><HotelLobbyWorkbench /></div>
      </section>

      <section className="section section-centered">
        <div className="section-heading centered">
          <span>Migos AI workflow</span>
          <h2>Two photos. One focused workflow.</h2>
          <p>The photos define the performers. You decide left and right placement, format, and quality. The Hotel Lobby motion and soundtrack are handled automatically.</p>
        </div>
        <div className="steps steps-large">
          <article><b>01</b><h3>Upload two performers</h3><p>Add one clear person or pet for the left position and one for the right. Visible facial detail and good lighting help identity consistency.</p></article>
          <article><b>02</b><h3>Set position and format</h3><p>Swap the performers if needed, then choose 9:16 Vertical for short-form social video or 16:9 Landscape for a wider result.</p></article>
          <article><b>03</b><h3>Choose quality and generate</h3><p>Select 480p, 720p, or 1080p. The generator creates the fixed 15-second performance and updates the result automatically.</p></article>
        </div>
      </section>

      <section className="section migos-visual-story">
        <div className="visual-story-copy">
          <span className="section-kicker">Source-photo ideas</span>
          <h2>Keep the duo format, change the cast</h2>
          <p>Use friends, creators, pets, or different outfits while keeping the same two-performer Hotel Lobby structure. Clear source photos matter more than complicated settings.</p>
        </div>
        <div className="visual-story-grid">
          <figure><img src={HOTEL_LOBBY_FRIENDS_WEBP} alt="Friends used as a two-performer Hotel Lobby AI example" loading="lazy" /><figcaption>Friends & creator duos</figcaption></figure>
          <figure><img src={HOTEL_LOBBY_STREETWEAR_WEBP} alt="Streetwear duo used as a Hotel Lobby AI example" loading="lazy" /><figcaption>Streetwear & fashion edits</figcaption></figure>
        </div>
      </section>

      <section className="band">
        <div className="section split-info">
          <div>
            <span className="section-kicker">No motion setup</span>
            <h2>The Hotel Lobby performance is already configured</h2>
            <p>You do not need to upload a reference video, write a motion prompt, or choose a duration. Each generation uses the preset 15-second Hotel Lobby motion and soundtrack.</p>
          </div>
          <div className="tips-panel">
            <h3>Source image checklist</h3>
            <ul>
              <li>Use one main subject per image.</li>
              <li>Keep the face or muzzle visible.</li>
              <li>Use a three-quarter or full-body image when possible.</li>
              <li>Avoid blurry group photos and heavy occlusion.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section editorial-section">
        <div className="editorial-lead">
          <span className="section-kicker">Migos AI Guide</span>
          <h2>What people mean when they search for Migos AI video</h2>
          <p>This page covers the search intent around Migos AI, Migos AI Video Generator, Migos Hotel Lobby AI, and the broader two-performer Hotel Lobby video trend.</p>
        </div>

        <div className="editorial-grid">
          <article>
            <h3>What is a Migos AI Video Generator?</h3>
            <p>Migos AI is a search term commonly used for the viral two-performer Hotel Lobby-style AI video format. The basic idea is simple: two separate source photos provide the left and right performers, and an AI video model creates a coordinated performance using a preset movement sequence. On this site, you do not need to configure the underlying model, upload motion footage, or write a prompt. Hotel Lobby AI is an independent tool and is not affiliated with or endorsed by Migos or related rights holders.</p>
          </article>

          <article>
            <h3>How to make a Migos AI video</h3>
            <p>Start with one clear image for each performer. Upload the first image into the Left Performer slot and the second into the Right Performer slot. If the positions look wrong, use the swap control before generation. Next, choose 9:16 Vertical or 16:9 Landscape and select 480p, 720p, or 1080p. Every generation is 15 seconds and uses the preset Hotel Lobby motion and soundtrack.</p>
          </article>

          <article>
            <h3>Choose better photos for Migos AI video generation</h3>
            <p>Source-image quality has a major effect on identity stability. Clear photos with visible facial features usually provide more useful information than dark, blurred, heavily filtered, or strongly cropped images. If the motion includes more of the body, three-quarter or full-body images can help. Avoid group photos because the model may have difficulty deciding which person should represent the left or right performer.</p>
          </article>

          <article>
            <h3>9:16 or 16:9?</h3>
            <p>Choose 9:16 Vertical when the video is mainly for TikTok, Instagram Reels, or YouTube Shorts. Choose 16:9 Landscape when you want a wider result for desktop viewing, YouTube, or other landscape placements. The performance remains the same; only the output framing changes.</p>
          </article>

          <article>
            <h3>Why the generator fixes the video at 15 seconds</h3>
            <p>The fixed duration keeps the template motion, pacing, and soundtrack aligned. Instead of exposing a large set of technical controls, the generator focuses on the choices that materially affect the final use: who appears on each side, whether the video is vertical or landscape, and the export quality.</p>
          </article>

          <article>
            <h3>What happens if generation fails?</h3>
            <p>Hotel Lobby AI charges per generated video rather than requiring a recurring subscription. If a technical generation fails, the same paid order can be retried for free, or you can request a refund after a failed attempt. Completed results can be played in the Results panel and downloaded directly as an MP4 file.</p>
          </article>
        </div>
      </section>

      <section className="band">
        <div className="section">
          <div className="section-heading"><span>FAQ</span><h2>Migos AI video questions</h2></div>
          <div className="faq-list">
            {faqItems.map((item, index) => <details key={item.q}>
              <summary><span className="faq-number">{index + 1}</span><span>{item.q}</span></summary>
              <p>{item.a}</p>
            </details>)}
          </div>
        </div>
      </section>

      <section className="section launch-cta">
        <div>
          <span className="eyebrow">Ready to create?</span>
          <h2>Make your own Hotel Lobby AI video</h2>
          <p>Upload two performers, choose format and quality, and create the fixed 15-second Hotel Lobby performance.</p>
        </div>
        <a className="seo-cta" href="#generator">Open generator ↑</a>
      </section>

      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  )
}
