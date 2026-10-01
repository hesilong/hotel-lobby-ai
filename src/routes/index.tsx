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
    q: 'What image and video formats can I upload?',
    a: 'Reference images should use common formats such as JPG or PNG. Custom reference videos should use a supported video format such as MP4 or MOV and stay within the upload limits shown by the tool.',
  },
  {
    q: 'Can I use my own reference motion video?',
    a: 'Yes. You can use a built-in motion template or upload your own compatible reference video when you want a different performance, pacing, or camera movement.',
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

const promptIdeas = [
  'Keep both outfits unchanged',
  'Preserve face identity closely',
  'Use a tighter camera crop',
  'Keep Person A on the left',
  'Match the reference timing',
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
      <SiteHeader overlay />

      <section className="hero hero-home">
        <div className="hero-background" aria-hidden="true">
          <img src={HOTEL_LOBBY_FRIENDS_WEBP} alt="" />
        </div>
        <div className="hero-copy">
          <span className="eyebrow">Viral AI Video</span>
          <h1>Hotel Lobby <span>AI Video Generator</span></h1>
          <p>Turn two photos into a coordinated Hotel Lobby AI performance. Choose a motion, add optional instructions, and let the reference drive the scene.</p>
          <div className="hero-chips">
            <span>2 identity images</span>
            <span>Motion templates</span>
            <span>Custom reference video</span>
          </div>
        </div>
        <div id="generator"><HotelLobbyWorkbench /></div>
      </section>

      <section className="section section-centered">
        <div className="section-heading centered">
          <span>What you can create</span>
          <h2>One format, many character combinations</h2>
          <p>Keep the Hotel Lobby AI motion structure while changing who appears, what they wear, and which performance drives the result.</p>
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
            <div className="showcase-body"><div className="showcase-mark">03</div><h3>Fashion variations</h3><p>Compare outfits, visual identities, and scene energy while reusing a motion reference you already like.</p></div>
          </article>
        </div>
      </section>

      <section className="section" id="templates">
        <div className="section-heading section-heading-row">
          <div>
            <span>Motion Library</span>
            <h2>Choose the performance that fits</h2>
            <p>Your two images define who appears. The selected reference controls pacing, framing, gestures, and camera behavior.</p>
          </div>
          <a className="text-link" href="#generator">Use a motion →</a>
        </div>
        <MotionGallery templates={HOME_MOTION_TEMPLATES} />
      </section>

      <section className="band" id="how-it-works">
        <div className="section section-centered">
          <div className="section-heading centered">
            <span>How it works</span>
            <h2>From two photos to one performance</h2>
            <p>The images provide identity. The reference video provides movement. The generator combines both into one task.</p>
          </div>
          <div className="steps steps-large">
            <article><b>01</b><h3>Upload Person A and Person B</h3><p>Use one main person per image and keep faces visible. Separate source images make the role assignment clearer.</p></article>
            <article><b>02</b><h3>Pick the motion source</h3><p>Choose a built-in Hotel Lobby AI motion or upload your own compatible reference video when you want a different performance.</p></article>
            <article><b>03</b><h3>Start the task</h3><p>Adjust the prompt only when needed, submit the task, and keep working while generation continues in the results area.</p></article>
          </div>
        </div>
      </section>

      <section className="section feature-split">
        <div className="feature-intro">
          <span className="section-kicker">Built for two identities</span>
          <h2>More control than a one-click filter</h2>
          <p>The Hotel Lobby AI Generator separates identity, motion, and prompt instructions so you can change one part of the setup without rebuilding everything from scratch.</p>
        </div>
        <div className="feature-grid">
          <article><h3>Separate identity slots</h3><p>Person A and Person B stay in distinct inputs, which gives the model a clearer signal about who should appear on each side.</p></article>
          <article><h3>Real motion reference</h3><p>Movement comes from a video reference instead of text alone, which makes timing and gestures easier to direct.</p></article>
          <article><h3>Switchable templates</h3><p>Change the performance without changing the people. This makes it easy to test multiple Hotel Lobby AI variations.</p></article>
          <article><h3>Simple task workflow</h3><p>Once the server accepts a task, the Generate button becomes available again and progress moves into the result card.</p></article>
        </div>
      </section>

      <section className="band">
        <div className="section split-info">
          <div>
            <span className="section-kicker">Prompt ideas</span>
            <h2>Use prompts to refine, not replace, the motion</h2>
            <p>The reference video already carries the main action. Short prompts work best when they clarify identity, clothing, framing, or small presentation details.</p>
            <div className="prompt-chips">
              {promptIdeas.map(item => <span key={item}>{item}</span>)}
            </div>
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
              <p>Hotel Lobby AI is a two-person AI video format that turns separate portrait images into a coordinated performance guided by a reference motion. Instead of describing every movement in a long prompt, a Hotel Lobby AI Video Generator uses the selected reference to shape rhythm, camera framing, gestures, body movement, and pacing.</p>
              <p>That makes the workflow useful for creators who want the recognizable Hotel Lobby AI trend without manually directing every second of animation. The basic structure is simple: one image for Person A, one image for Person B, and one motion reference that defines how the pair should move on screen.</p>
            </div>
            <figure className="story-media">
              <img src={HOTEL_LOBBY_FRIENDS_WEBP} alt="Two friends demonstrating the Hotel Lobby AI two-person video format" loading="lazy" />
            </figure>
          </article>

          <article className="story-row story-row-reverse">
            <div className="story-copy">
              <span className="story-number">02</span>
              <h2>How to create a Hotel Lobby AI video</h2>
              <p>Start with two clear images that show each person separately. Person A is treated as the left-side identity and Person B as the right-side identity, which helps reduce accidental swaps during generation.</p>
              <p>Then choose one of the built-in Hotel Lobby motion templates or upload your own reference video. The Hotel Lobby AI Generator combines those identity references with the motion source so the resulting video can follow the timing of the reference while preserving recognizable facial and outfit details. Clear faces, balanced lighting, and enough body detail generally make the task easier for the model.</p>
              <a className="text-link inline" href="#generator">Try the generator ↑</a>
            </div>
            <figure className="story-media">
              <img src={HOTEL_LOBBY_STREETWEAR_WEBP} alt="Two people used as references for a Hotel Lobby AI video" loading="lazy" />
            </figure>
          </article>

          <article className="story-row">
            <div className="story-copy">
              <span className="story-number">03</span>
              <h2>Why the motion reference matters</h2>
              <p>The motion reference is what separates this workflow from a generic text-to-video prompt. A built-in Hotel Lobby AI template is useful when you want a fast route to a familiar performance, while a custom reference video is better when you want a different pose sequence, camera move, or pacing.</p>
              <p>In both cases, the motion clip provides the choreography while your uploaded photos provide the identities. This division makes a reference-driven Hotel Lobby video generator more predictable for this kind of trend than asking a model to invent all movement from text alone.</p>
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
              <p>You can use the Hotel Lobby video generator for short-form social content, meme-style edits, duo performances, character experiments, fashion variations, and creator collaborations. The point is not limited to reproducing one exact viral clip.</p>
              <p>The same Hotel Lobby AI Generator can combine different people, outfits, visual styles, and motion references while keeping the basic two-person format. If you are testing creative directions, you can start several tasks and compare which source images and motion references produce the most stable or interesting result.</p>
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
          <p>Upload two people, choose a motion, and start a new task from the generator above.</p>
        </div>
        <a className="seo-cta" href="#generator">Open generator ↑</a>
      </section>

      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  )
}
