import { createFileRoute } from '@tanstack/react-router'
import { HotelLobbyWorkbench } from '@/components/hotel-lobby/HotelLobbyWorkbench'
import { MotionGallery } from '@/components/hotel-lobby/MotionGallery'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { HOTEL_LOBBY_FRIENDS_WEBP, HOTEL_LOBBY_PETS_WEBP, HOTEL_LOBBY_STREETWEAR_WEBP } from '@/config/hotel-lobby-visuals'

const faqItems = [
  {
    q: 'How long does a Hotel Lobby AI video take to generate?',
    a: 'Generation time depends on video length, provider load, and model availability. After a task is accepted, it continues processing in the Results area while you can prepare another generation.',
  },
  {
    q: 'Can I start another video while one is still generating?',
    a: 'Yes. Once the server accepts the current task, the Generate button becomes available again and the existing task keeps processing in the background.',
  },
  {
    q: 'What image formats can I upload?',
    a: 'Reference images should use JPG, PNG, or WebP. The generator does not accept user-uploaded reference videos.',
  },
  {
    q: 'Can I upload my own motion video?',
    a: 'No. Hotel Lobby AI uses a fixed controlled performance. You can upload two authorized adult portraits and choose from preset scenes.',
  },
  {
    q: 'What should I do if the two identities get mixed up?',
    a: 'Try clearer source photos with one visible person per image, stronger facial detail, and less occlusion. Keeping Person A and Person B visually distinct also helps reduce identity swaps.',
  },
  {
    q: 'Are my generated videos saved?',
    a: 'Generation records and available results may be stored with your account so they can appear in your Results history. Availability can depend on storage, provider, and service retention limits.',
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
      name: 'Hotel Lobby AI Video Generator',
      url: 'https://hotel-lobby-ai.pro/',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web',
      description: 'Create Hotel Lobby AI videos from two performer photos and a preset scene.'
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
        content: 'Create Hotel Lobby AI videos from two performer photos. Upload people or pets, choose a preset scene, and generate your video online.',
      },
      { property: 'og:title', content: 'Hotel Lobby AI Generator – Create Viral Hotel Lobby Videos' },
      {
        property: 'og:description',
        content: 'Create Hotel Lobby AI videos from two photos of people or pets, choose a preset scene, and generate a coordinated performance online.',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://hotel-lobby-ai.pro/' },
      { property: 'og:site_name', content: 'Hotel Lobby AI' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: 'Hotel Lobby AI Generator' },
      {
        name: 'twitter:description',
        content: 'Turn two performer photos into a Hotel Lobby AI video with a preset scene and guided performance.',
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
      <SiteHeader overlay />

      <section className="hero hero-home">
        <div className="hero-background" aria-hidden="true">
          <img src={HOTEL_LOBBY_FRIENDS_WEBP} alt="" />
        </div>
        <div className="hero-copy">
          <span className="eyebrow">Viral AI Video</span>
          <h1>Hotel Lobby <span>AI Video Generator</span></h1>
          <p>Upload two photos of people or pets, choose a scene, and create your Hotel Lobby AI video in minutes.</p>
          <div className="hero-chips">
            <span>2 performer photos</span>
            <span>Preset scenes</span>
            <span>People & pets</span>
          </div>
        </div>
        <div id="generator"><HotelLobbyWorkbench /></div>
      </section>

      <section className="section section-centered">
        <div className="section-heading centered">
          <span>What you can create</span>
          <h2>Two performers, multiple preset scenes</h2>
          <p>Upload a left performer and a right performer, choose a scene, and create a coordinated Hotel Lobby AI video.</p>
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
            <p>These examples show the Hotel Lobby AI format in action. Your generator uses two performer photos, a preset scene, and a guided performance.</p>
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
            <p>Your two photos define the left and right performers. Choose a preset scene, then the generator applies the guided performance automatically.</p>
          </div>
          <div className="steps steps-large">
            <article><b>01</b><h3>Upload your performers</h3><p>Add one clear person or pet for the left position and one for the right. Keep the face or muzzle visible.</p></article>
            <article><b>02</b><h3>Choose a preset scene</h3><p>Select the setting you want. The performance setup is handled automatically behind the scenes.</p></article>
            <article><b>03</b><h3>Generate your video</h3><p>Choose duration, resolution, and orientation, then generate. Your result updates automatically on the right.</p></article>
          </div>
        </div>
      </section>

      <section className="section account-trust" id="google-sign-in">
        <div className="trust-card">
          <span className="section-kicker">Account & safety</span>
          <h2>Google Sign-In is for account access only</h2>
          <p>
            Hotel Lobby AI uses Google OAuth only for account sign-in and basic profile information such as your email
            address. The app does not use Google Generative AI APIs (including Gemini or Imagen), Google Photos, Google
            Drive, or other Google APIs to create, edit, analyze, or process uploaded images, videos, or AI-generated
            media.
          </p>
          <p>
            Non-consensual intimate imagery (NCII), sexual content involving minors, deceptive impersonation, and
            unauthorized use of another person&apos;s likeness are prohibited.
          </p>
          <div className="trust-links">
            <a href="/privacy-policy">Privacy Policy</a>
            <a href="/terms-of-service#acceptable-use">Acceptable Use</a>
          </div>
        </div>
      </section>

      <section className="section feature-split">
        <div className="feature-intro">
          <span className="section-kicker">Simple by design</span>
          <h2>Two performers, one focused workflow</h2>
          <p>Upload the left and right performers, choose a scene, and let the generator handle the performance setup automatically.</p>
        </div>
        <div className="feature-grid">
          <article><h3>Left and right performer slots</h3><p>Each performer has a dedicated photo input, making the intended screen position clear before generation starts.</p></article>
          <article><h3>Guided performance</h3><p>The performance setup is preset by the service, so there is no reference-video upload step for the user.</p></article>
          <article><h3>Preset scenes</h3><p>Change the visual setting without changing the controlled motion. This keeps the workflow simple and predictable.</p></article>
          <article><h3>Simple task workflow</h3><p>Once the server accepts a task, the Generate button becomes available again and progress moves into the result card.</p></article>
        </div>
      </section>

      <section className="band">
        <div className="section split-info">
          <div>
            <span className="section-kicker">Preset scenes</span>
            <h2>Choose the setting, keep the performance controlled</h2>
            <p>The generator does not require custom video uploads or motion prompts. Select a preset scene and the service applies the performance automatically.</p>
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
              <p>The workflow is intentionally simple: one image for the Left Performer, one for the Right Performer, a preset scene, and your output settings. No custom reference-video upload is required.</p>
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
              <p>Then choose a preset scene and your output settings. The generator uses the two performer photos to create the guided performance while preserving recognizable appearance, clothing or fur, and other visible details. Clear, well-lit source images generally work best.</p>
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
              <p>This focused workflow keeps creation simple and predictable while still letting you change performers, scenes, duration, resolution, and orientation.</p>
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
              <p>The same Hotel Lobby AI Generator can combine different people, pets, outfits, and preset scenes while keeping the basic two-performer format. Try different source photos and settings to see which combination produces the strongest result.</p>
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
              <a href="mailto:support@hotel-lobby-ai.pro">support@hotel-lobby-ai.pro</a>
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
          <p>Upload two performers, choose a scene, and start a new video from the generator above.</p>
        </div>
        <a className="seo-cta" href="#generator">Open generator ↑</a>
      </section>

      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  )
}
