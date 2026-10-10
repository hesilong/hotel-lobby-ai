import { createFileRoute } from '@tanstack/react-router'
import { HotelLobbyWorkbench } from '@/components/hotel-lobby/HotelLobbyWorkbench'
import { MotionGallery } from '@/components/hotel-lobby/MotionGallery'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { HOTEL_LOBBY_FRIENDS_WEBP, HOTEL_LOBBY_PETS_WEBP, HOTEL_LOBBY_STREETWEAR_WEBP } from '@/config/hotel-lobby-visuals'
import { SITE_CONFIG, siteUrl } from '@/config/site'

const faqItems = [
  {
    q: 'What is Hotel Lobby AI?',
    a: 'Hotel Lobby AI is a two-performer AI video format that turns two source photos into one coordinated Hotel Lobby-style performance. Upload a left performer and a right performer, then choose the output format and quality.',
  },
  {
    q: 'How do I make a Hotel Lobby AI video?',
    a: 'Upload two clear photos, use the swap control if you want to change who appears on the left or right, choose 9:16 or 16:9, select 480p, 720p, or 1080p, and generate. The Hotel Lobby motion and soundtrack are preset automatically.',
  },
  {
    q: 'How long is a Hotel Lobby AI video?',
    a: 'Each Hotel Lobby generation is 15 seconds. The duration is fixed so the motion, pacing, and soundtrack stay consistent with the template.',
  },
  {
    q: 'Can I choose vertical or landscape video?',
    a: 'Yes. Choose 9:16 Vertical for TikTok, Reels, and Shorts, or 16:9 Landscape for wider playback and sharing.',
  },
  {
    q: 'Can I swap the left and right performers?',
    a: 'Yes. After uploading your photos, use the swap button between the two performer slots to switch their left and right positions before generation.',
  },
  {
    q: 'What photos work best for Hotel Lobby AI?',
    a: 'Use one clear person or pet per image, keep the face or muzzle visible, avoid heavy blur or occlusion, and use well-lit source photos. Three-quarter or full-body images can help when the motion includes more body movement.',
  },
  {
    q: 'Can I use pets in Hotel Lobby AI?',
    a: 'Yes. Pets are supported as long as each source image clearly shows one main subject and passes the site image-safety checks.',
  },
  {
    q: 'Do I need a subscription?',
    a: 'No. Hotel Lobby AI uses one-time credit packs with no automatic renewal. You only buy more credits when you want to create more videos.',
  },
  {
    q: 'What happens if a generation fails?',
    a: 'Failed generations return the reserved credits. Provider or processing failures do not consume the credits for a completed result.',
  },
  {
    q: 'Can I download the generated video?',
    a: 'Yes. Completed results can be played in the Results panel and downloaded directly as an MP4 file.',
  },
  {
    q: 'How long does generation take?',
    a: 'Generation time varies with provider load and model availability. After the task is accepted, it continues processing in the Results area even if you leave the page.',
  },
]

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


const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: `${SITE_CONFIG.name} Video Generator`,
      url: siteUrl('/'),
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web',
      description: 'Create 15-second Hotel Lobby AI videos from two performer photos with preset motion and soundtrack.'
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
      { title: `${SITE_CONFIG.name} Generator – Create Viral Hotel Lobby Videos` },
      {
        name: 'description',
        content: 'Create 15-second Hotel Lobby AI videos from two photos. Swap left and right performers, choose vertical or landscape, select quality, and generate online.',
      },
      { property: 'og:title', content: `${SITE_CONFIG.name} Generator – Create Viral Hotel Lobby Videos` },
      {
        property: 'og:description',
        content: 'Turn two photos into a 15-second Hotel Lobby AI performance with preset motion, soundtrack, vertical or landscape output, and direct MP4 download.',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: siteUrl('/') },
      { property: 'og:site_name', content: SITE_CONFIG.name },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: `${SITE_CONFIG.name} Generator` },
      {
        name: 'twitter:description',
        content: 'Turn two performer photos into a 15-second Hotel Lobby AI video with preset motion and soundtrack.',
      },
      { name: 'robots', content: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' },
    ],
    links: [{ rel: 'canonical', href: siteUrl('/') }],
  }),
  component: HomePage,
})

function HomePage() {
  return (
    <main>
      <SiteHeader overlay />

      <section className="hero hero-home">
        <div className="hero-background" aria-hidden="true">
          <img src={HOTEL_LOBBY_FRIENDS_WEBP} alt="" />
        </div>
        <div className="hero-copy">
          <span className="eyebrow">Viral AI Video</span>
          <h1>Hotel Lobby <span>AI Video Generator</span></h1>
          <p>Upload two photos, choose vertical or landscape and your export quality, then create a 15-second Hotel Lobby AI video.</p>
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
          <span>What you can create</span>
          <h2>Two performers, one focused Hotel Lobby workflow</h2>
          <p>Upload a left performer and a right performer, swap their positions if needed, then choose format and quality. The Hotel Lobby motion and soundtrack are handled automatically.</p>
        </div>
        <div className="showcase-grid">
          <article>
            <img src={HOTEL_LOBBY_FRIENDS_WEBP} alt="Two friends in a Hotel Lobby AI style scene" loading="lazy" />
            <div className="showcase-body"><div className="showcase-mark">01</div><h3>Friends & creators</h3><p>Use two clear portraits to build a shared Hotel Lobby AI video for social posts, collabs, or trend remixes.</p></div>
          </article>
          <article>
            <img src={HOTEL_LOBBY_PETS_WEBP} alt="Two pets in a Hotel Lobby AI style scene" loading="lazy" />
            <div className="showcase-body"><div className="showcase-mark">02</div><h3>Pets & playful concepts</h3><p>Try pets or original subjects while keeping the same two-character motion structure and clear left/right roles.</p></div>
          </article>
          <article>
            <img src={HOTEL_LOBBY_STREETWEAR_WEBP} alt="Streetwear duo in a Hotel Lobby AI style scene" loading="lazy" />
            <div className="showcase-body"><div className="showcase-mark">03</div><h3>Fashion variations</h3><p>Compare outfits, performer looks, and scene energy while keeping the guided performance consistent.</p></div>
          </article>
        </div>
      </section>

      <section className="section" id="templates">
        <div className="section-heading section-heading-row">
          <div>
            <span>Example videos</span>
            <h2>See the format in action</h2>
            <p>These examples show the two-performer Hotel Lobby format in action. Your generator uses two source photos with preset motion and soundtrack.</p>
          </div>
          <a className="text-link" href="#generator">Create yours →</a>
        </div>
        <MotionGallery templates={HOME_MOTION_TEMPLATES} />
      </section>

      <section className="band" id="how-it-works">
        <div className="section section-centered">
          <div className="section-heading centered">
            <span>How it works</span>
            <h2>From two photos to one performance</h2>
            <p>Your two photos define the left and right performers. Swap them if needed, choose the output format and quality, then the generator applies the 15-second Hotel Lobby performance automatically.</p>
          </div>
          <div className="steps steps-large">
            <article><b>01</b><h3>Upload your performers</h3><p>Add one clear person or pet for the left position and one for the right. Keep the face or muzzle visible.</p></article>
            <article><b>02</b><h3>Set left, right, and format</h3><p>Swap performers if needed, then choose 9:16 Vertical or 16:9 Landscape for where you plan to share the result.</p></article>
            <article><b>03</b><h3>Choose quality and generate</h3><p>Select 480p, 720p, or 1080p. Every generation is 15 seconds with template motion and soundtrack included.</p></article>
          </div>
        </div>
      </section>

      <section className="section feature-split">
        <div className="feature-intro">
          <span className="section-kicker">Simple by design</span>
          <h2>Two performers, one focused workflow</h2>
          <p>Upload the left and right performers, choose the format and quality, and let the generator handle the 15-second motion and soundtrack automatically.</p>
        </div>
        <div className="feature-grid">
          <article><h3>Left and right performer slots</h3><p>Each performer has a dedicated photo input, making the intended screen position clear before generation starts.</p></article>
          <article><h3>Swap performers</h3><p>Switch the left and right source photos in one click before generation so the intended positions stay clear.</p></article>
          <article><h3>Fixed 15-second motion</h3><p>The Hotel Lobby motion and soundtrack are preset so users do not have to configure duration, prompts, or reference motion.</p></article>
          <article><h3>Flexible export</h3><p>Choose 9:16 or 16:9 and 480p, 720p, or 1080p, then download the completed result directly as MP4.</p></article>
        </div>
      </section>

      <section className="band">
        <div className="section split-info">
          <div>
            <span className="section-kicker">Better inputs, better results</span>
            <h2>Give the model cleaner performer references</h2>
            <p>You do not need to upload a motion reference or write a prompt. The service applies the Hotel Lobby performance automatically; your main job is choosing clear source photos.</p>
          </div>
          <div className="tips-panel">
            <h3>Better source images = steadier identities</h3>
            <ul>
              <li>Use one main person per image.</li>
              <li>Keep facial features visible and well lit.</li>
              <li>Avoid heavy blur, extreme crops, and overlapping people.</li>
              <li>Use wider source images when the motion includes full-body movement.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section story-guide">
        <div className="story-guide-intro">
          <span className="section-kicker">Hotel Lobby AI Guide</span>
          <p>A practical guide to the format, the inputs that matter most, and the choices that make a Hotel Lobby AI video more consistent.</p>
        </div>

        <div className="story-guide-list">
          <article className="story-row">
            <div className="story-copy">
              <span className="story-number">01</span>
              <h2>What is Hotel Lobby AI?</h2>
              <p>Hotel Lobby AI is a two-performer AI video format that turns separate photos into a coordinated performance. The left and right performer can be people or pets, while the selected scene controls the setting and the generator handles the performance setup automatically.</p>
              <p>The workflow is intentionally simple: one image for the Left Performer, one for the Right Performer, a format choice, and an export-quality choice. No custom reference-video upload or motion prompt is required.</p>
            </div>
            <figure className="story-media">
              <img src={HOTEL_LOBBY_FRIENDS_WEBP} alt="Two friends demonstrating the Hotel Lobby AI two-person video format" loading="lazy" />
            </figure>
          </article>

          <article className="story-row story-row-reverse">
            <div className="story-copy">
              <span className="story-number">02</span>
              <h2>How to create a Hotel Lobby AI video</h2>
              <p>Start with two clear images. The first becomes the Left Performer and the second becomes the Right Performer. Each image can feature one person or pet.</p>
              <p>Then choose 9:16 or 16:9 and your export quality. The generator uses the two performer photos to create the 15-second Hotel Lobby performance while preserving recognizable appearance, clothing or fur, and other visible details. Clear, well-lit source images generally work best.</p>
              <a className="text-link inline" href="#generator">Try the generator ↑</a>
            </div>
            <figure className="story-media">
              <img src={HOTEL_LOBBY_STREETWEAR_WEBP} alt="Two people used as references for a Hotel Lobby AI video" loading="lazy" />
            </figure>
          </article>

          <article className="story-row">
            <div className="story-copy">
              <span className="story-number">03</span>
              <h2>Why the workflow stays simple</h2>
              <p>The generator keeps the performance setup behind the scenes instead of asking users to upload a motion video. Your photos define the two performers while the service handles choreography, pacing, and framing.</p>
              <p>This focused workflow keeps creation simple and predictable while still letting you change performers, swap left and right positions, choose vertical or landscape output, and select export quality.</p>
            </div>
            <figure className="story-media story-video">
              <video src={HOME_MOTION_TEMPLATES[0].previewVideoUrl} muted loop autoPlay playsInline />
            </figure>
          </article>

          <article className="story-row story-row-reverse">
            <div className="story-copy">
              <span className="story-number">04</span>
              <h2>Best photos for a Hotel Lobby AI Generator</h2>
              <p>The Hotel Lobby AI trend works best when the two source images are visually clean. Avoid heavily cropped faces, strong blur, large accessories that hide facial structure, or group photos with several people overlapping.</p>
              <p>Consistent source quality gives the Hotel Lobby AI Video Generator more information to work with from frame to frame. If the reference includes full-body movement, a three-quarter or full-body source image can also help. Clothing is easier to preserve when the outfit is visible, while simpler backgrounds reduce unrelated visual noise.</p>
            </div>
            <figure className="story-media">
              <img src={HOTEL_LOBBY_FRIENDS_WEBP} alt="Clear source portraits for a Hotel Lobby AI Generator" loading="lazy" />
            </figure>
          </article>

          <article className="story-row">
            <div className="story-copy">
              <span className="story-number">05</span>
              <h2>Ways to use the Hotel Lobby video generator</h2>
              <p>You can use the Hotel Lobby video generator for short-form social content, meme-style edits, duo performances, pet videos, fashion variations, and creator collaborations. The format is not limited to one exact viral clip.</p>
              <p>The same Hotel Lobby AI Generator can combine different people, pets, and outfits while keeping the basic two-performer format. Try different source photos, left/right placement, formats, and quality levels to see which combination works best.</p>
            </div>
            <figure className="story-media">
              <img src={HOTEL_LOBBY_PETS_WEBP} alt="Creative pet example made with the Hotel Lobby video generator format" loading="lazy" />
            </figure>
          </article>

          <article className="story-row story-row-reverse">
            <div className="story-copy">
              <span className="story-number">06</span>
              <h2>Hotel Lobby AI and Migos AI</h2>
              <p>People also search for this style using terms such as Migos AI, Migos AI video, and Migos Hotel Lobby AI. Those searches often point to the same broader two-person hotel-lobby-style AI trend.</p>
              <p>Hotel Lobby AI provides the main generator for this workflow, while the dedicated Migos AI Video Generator page focuses on that search intent more directly. Hotel Lobby AI is an independent tool and is not affiliated with or endorsed by Migos or related rights holders.</p>
              <a className="text-link inline" href="/migos-ai-video">Explore the Migos AI page →</a>
            </div>
            <figure className="story-media">
              <img src={HOTEL_LOBBY_STREETWEAR_WEBP} alt="Streetwear duo representing the Hotel Lobby AI and Migos AI search trend" loading="lazy" />
            </figure>
          </article>
        </div>
      </section>

      <section className="band" id="faq">
        <div className="section">
          <div className="section-heading faq-heading">
            <span>FAQ</span>
            <h2>Hotel Lobby AI questions</h2>
            <p>
              Have more questions? Contact us at{' '}
              <a href={`mailto:${SITE_CONFIG.supportEmail}`}>{SITE_CONFIG.supportEmail}</a>
            </p>
          </div>
          <div className="faq-list">
            {faqItems.map((item, index) => <details key={item.q}>
              <summary>
                <span className="faq-number">{index + 1}</span>
                <span>{item.q}</span>
              </summary>
              <p>{item.a}</p>
            </details>)}
          </div>
        </div>
      </section>

      <section className="section launch-cta">
        <div>
          <span className="eyebrow">Ready to create?</span>
          <h2>Make your own Hotel Lobby AI video</h2>
          <p>Upload two performers, choose your format and quality, and start a 15-second Hotel Lobby video from the generator above.</p>
        </div>
        <a className="seo-cta" href="#generator">Open generator ↑</a>
      </section>

      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  )
}
