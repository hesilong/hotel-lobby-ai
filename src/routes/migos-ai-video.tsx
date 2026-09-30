import { createFileRoute } from '@tanstack/react-router'
import { HotelLobbyWorkbench } from '@/components/hotel-lobby/HotelLobbyWorkbench'
import { MotionGallery } from '@/components/hotel-lobby/MotionGallery'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { HOTEL_LOBBY_TEMPLATES } from '@/config/hotel-lobby'

const faqItems = [
  {
    q: 'What is a Migos AI video generator?',
    a: 'It is a search term people use for tools that create a two-person hotel-lobby-style AI performance from two images and a motion reference.',
  },
  {
    q: 'Do I need two photos?',
    a: 'Yes. Use one clear image for Person A and one for Person B so the generator can keep the two identities separate.',
  },
  {
    q: 'Can I use a custom motion video?',
    a: 'Yes. You can upload your own compatible reference video or use one of the built-in Hotel Lobby AI motion templates.',
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
      { property: 'og:description', content: 'Create a two-person Migos AI-style Hotel Lobby video from your photos and a motion reference.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://hotel-lobby-ai.pro/migos-ai-video' },
      { property: 'og:site_name', content: 'Hotel Lobby AI' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: 'Migos AI Video Generator' },
      { name: 'twitter:description', content: 'Upload two photos and create a hotel-lobby-style Migos AI video with a reference motion.' },
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

      <section className="hero hero-migos">
        <div className="hero-glow hero-glow-a" /><div className="hero-glow hero-glow-b" />
        <div className="hero-copy">
          <span className="eyebrow">Migos AI Video</span>
          <h1>Migos AI <span>Video Generator</span></h1>
          <p>Create a two-person hotel-lobby-style AI video from your own photos. Keep both identities separate and let a motion reference drive the performance.</p>
          <div className="hero-chips"><span>2-person workflow</span><span>Reference motion</span><span>Online generator</span></div>
        </div>
        <div id="generator"><HotelLobbyWorkbench /></div>
      </section>

      <section className="section section-centered">
        <div className="section-heading centered">
          <span>Migos AI workflow</span>
          <h2>Build the duo video in three parts</h2>
          <p>The photos define the performers, the motion defines the performance, and the prompt is only there to refine the result.</p>
        </div>
        <div className="steps steps-large">
          <article><b>01</b><h3>Add Person A and Person B</h3><p>Use separate images with visible faces so the model has a clear identity source for each performer.</p></article>
          <article><b>02</b><h3>Choose the movement</h3><p>Select a built-in Hotel Lobby AI reference or upload your own video for a different performance.</p></article>
          <article><b>03</b><h3>Generate the Migos AI video</h3><p>Start the task and let the results area update while you prepare another variation.</p></article>
        </div>
      </section>

      <section className="section" id="templates">
        <div className="section-heading">
          <span>Motion Library</span>
          <h2>Try the same identities with different motion</h2>
          <p>Switch the reference to change pacing, framing, and performance style without changing your source photos.</p>
        </div>
        <MotionGallery templates={HOTEL_LOBBY_TEMPLATES} />
      </section>

      <section className="band">
        <div className="section split-info">
          <div>
            <span className="section-kicker">Why reference motion?</span>
            <h2>Show the movement instead of describing everything</h2>
            <p>A Migos AI video depends heavily on timing and coordinated motion. A reference clip gives the model a clearer movement pattern than a long text prompt alone.</p>
          </div>
          <div className="tips-panel">
            <h3>Source image checklist</h3>
            <ul>
              <li>One main person per image.</li>
              <li>Visible face and hairstyle.</li>
              <li>Enough body detail for the selected motion.</li>
              <li>Avoid blurry group photos and heavy occlusion.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section editorial-section">
        <div className="editorial-lead">
          <span className="section-kicker">Migos AI Guide</span>
          <h2>What people mean when they search for Migos AI video</h2>
          <p>This page focuses on the search intent around Migos AI, Migos AI Video Generator, and the related Hotel Lobby AI format.</p>
        </div>

        <div className="editorial-grid">
          <article>
            <h3>What is a Migos AI Video Generator?</h3>
            <p>Migos AI is a search term many people use when looking for the viral two-person hotel-lobby-style AI video format. A Migos AI Video Generator takes two separate images and combines them with a motion reference so the people in the uploaded photos can follow the timing, poses, gestures, and framing of the reference clip. The workflow is intended for users who want the recognizable duo-video look without manually animating every movement. On this page, the phrase Migos AI refers to that broader AI video trend and search intent; Hotel Lobby AI is an independent tool and is not affiliated with or endorsed by Migos or related rights holders.</p>
          </article>

          <article>
            <h3>How to make a Migos AI video</h3>
            <p>To make a Migos AI video, upload one image for Person A and one for Person B. Keeping the identities separate matters because the generator needs a clear source for the left and right performers. After the photos are selected, choose a Hotel Lobby motion template or upload your own reference video. The motion source provides the structure of the performance, while your images provide faces, hairstyles, outfits, and identity details. The Migos AI Video Generator then uses those inputs together to create a new two-person clip that follows the movement and timing of the reference.</p>
          </article>

          <article>
            <h3>Choose better photos for Migos AI video generation</h3>
            <p>Image quality has a major effect on Migos AI video results. Clear portraits with visible facial features usually provide more identity information than dark, blurred, or heavily filtered photos. If the reference video contains full-body movement, try to use images that show more than just the face. Clothing details are also easier to preserve when the outfit is visible and not hidden by objects or extreme cropping. For a two-person Migos Hotel Lobby AI video, avoid group photos because the model may have difficulty deciding who should represent Person A or Person B.</p>
          </article>

          <article>
            <h3>Why reference motion matters</h3>
            <p>The motion reference is just as important as the photos. A built-in Hotel Lobby AI template is useful when you want a familiar style quickly. Uploading a custom reference video gives you more control over pacing, body movement, camera behavior, and gestures. This is why a Migos AI generator based on reference-to-video can be more predictable than a pure text-to-video workflow for this kind of trend. Instead of describing a movement sequence only with words, you can show the model the motion pattern you want it to follow.</p>
          </article>

          <article>
            <h3>Ways creators use Migos AI videos</h3>
            <p>A Migos AI Video Generator can be used for creator edits, social experiments, duo performances, meme-style clips, character transformations, fashion content, and trend remixes. The same workflow can be repeated with different image pairs and motion references, which makes it useful for testing multiple creative directions. You can keep the same motion while changing the people, or keep the same identities while trying different reference clips. This makes the Migos AI format flexible beyond a single viral example while preserving the recognizable two-person performance structure.</p>
          </article>

          <article>
            <h3>Migos AI vs. Hotel Lobby AI</h3>
            <p>Migos AI and Hotel Lobby AI are closely related search terms in this context. Some users search for Migos AI video, others search for Hotel Lobby AI, Hotel Lobby AI Generator, or Migos Hotel Lobby AI. The underlying intent is usually similar: they want an online tool that can turn two images into a coordinated AI performance using a reference video. This page focuses on Migos AI Video Generator searches, while the main Hotel Lobby AI page provides the broader generator experience and Hotel Lobby AI information. Both routes use the same core two-person workflow.</p>
          </article>

          <article>
            <h3>Tips for more consistent Migos AI results</h3>
            <p>Keep the prompt focused on identity preservation and motion following instead of adding many unrelated scene changes. The generator works best when it can clearly understand which details come from the photos and which details come from the reference motion. If a result changes a face too much or mixes the identities, try clearer source photos with more visible facial and clothing detail. If the motion does not match closely enough, choose a cleaner reference clip with fewer cuts or camera changes. Small improvements in source material can make a noticeable difference in a Migos AI video.</p>
          </article>
        </div>
      </section>

      <section className="band">
        <div className="section">
          <div className="section-heading"><span>FAQ</span><h2>Migos AI video questions</h2></div>
          <div className="faq-list">
            {faqItems.map(item => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
          </div>
        </div>
      </section>

      <section className="section launch-cta">
        <div>
          <span className="eyebrow">Related generator</span>
          <h2>Explore the full Hotel Lobby AI workflow</h2>
          <p>Use the main page for the broader Hotel Lobby AI generator, templates, and detailed guide.</p>
        </div>
        <a className="seo-cta" href="/">Open Hotel Lobby AI →</a>
      </section>

      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  )
}
