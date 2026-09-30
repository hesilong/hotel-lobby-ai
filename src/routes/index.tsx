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
          <p>Learn how the Hotel Lobby AI Generator works, what inputs produce better results, and how to create a two-person Hotel Lobby AI video with a motion reference.</p>
        </div>

        <div className="seo-longform">
          <article>
            <h3>What is Hotel Lobby AI?</h3>
            <p>Hotel Lobby AI is a two-person AI video format that turns separate portrait images into a coordinated performance guided by a reference motion. Instead of asking users to describe every movement in a long prompt, a Hotel Lobby AI Video Generator uses the selected reference to control the rhythm, camera framing, gestures, body movement, and overall pacing of the final clip. That makes the workflow practical for creators who want a recognizable Hotel Lobby AI trend video without manually directing every second of motion. The tool is designed around a simple structure: one image for Person A, one image for Person B, and one motion reference that defines how the pair should move on screen.</p>
          </article>

          <article>
            <h3>How to create a Hotel Lobby AI video</h3>
            <p>To create a Hotel Lobby AI video, start with two clear images that show each person separately. Person A is treated as the left-side identity and Person B as the right-side identity, which helps reduce accidental face swaps or role changes during generation. Then choose one of the built-in Hotel Lobby motion templates or upload your own compatible reference video. The Hotel Lobby AI Generator sends those visual references together with the motion instructions so the model can preserve identity while following the timing of the reference. For best results, use images with visible faces, balanced lighting, and enough body detail for the model to understand clothing and proportions.</p>
          </article>

          <article>
            <h3>Choose a Hotel Lobby motion template or your own video</h3>
            <p>A good Hotel Lobby AI Generator should make motion selection easy. Built-in motion templates are useful when you want a fast result and do not want to search for a separate video first. A custom reference video is better when you already have a specific pose sequence, camera move, or duo performance that you want to recreate. In both cases, the reference video acts as the movement source while your uploaded images supply the identities. This separation between identity and motion is the core of the Hotel Lobby AI workflow and is what makes the tool different from a basic text-to-video generator.</p>
          </article>

          <article>
            <h3>Best photos for a Hotel Lobby AI Generator</h3>
            <p>The Hotel Lobby AI trend works best when the two input images are visually clean. Avoid heavily cropped faces, strong blur, large sunglasses that hide facial structure, or images where several people appear together. Consistent image quality helps the Hotel Lobby AI Video Generator keep both people recognizable from frame to frame. If the reference motion contains full-body movement, full-body or three-quarter input photos can also help. Clothing can be preserved more reliably when the outfit is clearly visible, while simple backgrounds make it easier for the model to focus on the people rather than unrelated visual details.</p>
          </article>

          <article>
            <h3>Ways to use the Hotel Lobby video generator</h3>
            <p>You can use the Hotel Lobby video generator for short-form social content, meme-style edits, duo performances, character experiments, creator collaborations, and trend remixes. The goal is not only to reproduce one exact viral clip, but to give you a reusable way to combine two identities with a motion reference. That means the same Hotel Lobby AI Generator can be used with different people, outfits, visual styles, and movement references while keeping the basic two-person format. If you are testing several variations, you can generate multiple tasks and compare which combination of images and motion produces the most stable result.</p>
          </article>

          <article>
            <h3>Hotel Lobby AI and Migos AI</h3>
            <p>People also search for this style using terms such as Migos AI, Migos AI video, and Migos Hotel Lobby AI. Those searches often refer to the same broader two-person hotel-lobby-style AI video trend. Hotel Lobby AI provides the main generator for this format, while the dedicated Migos AI Video Generator page focuses on that search intent and explains the relationship more directly. Hotel Lobby AI is an independent tool and is not affiliated with or endorsed by Migos or related rights holders. The aim is to provide a straightforward AI video workflow for users who want to create their own version of the trend from authorized images and motion references.</p>
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
