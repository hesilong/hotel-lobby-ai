import { createFileRoute } from '@tanstack/react-router'
import { HOTEL_LOBBY_BLOG } from '@/content/hotel-lobby-blog'
import { HOTEL_LOBBY_FRIENDS_WEBP, HOTEL_LOBBY_PETS_WEBP, HOTEL_LOBBY_STREETWEAR_WEBP } from '@/config/hotel-lobby-visuals'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SITE_CONFIG, siteUrl } from '@/config/site'

const images = {
  friends: HOTEL_LOBBY_FRIENDS_WEBP,
  streetwear: HOTEL_LOBBY_STREETWEAR_WEBP,
  pets: HOTEL_LOBBY_PETS_WEBP,
} as const

export const Route = createFileRoute('/blog')({
  head: () => ({
    meta: [
      { title: 'Hotel Lobby AI Blog – Guides, Tips, and Troubleshooting' },
      { name: 'description', content: 'Hotel Lobby AI guides covering how to make the trend, better source photos, face drift, pricing, credits, and common generation questions.' },
      { property: 'og:title', content: 'Hotel Lobby AI Blog' },
      { property: 'og:description', content: 'Practical Hotel Lobby AI guides, photo tips, troubleshooting, and pricing explanations.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: siteUrl('/blog') },
      { property: 'og:site_name', content: SITE_CONFIG.name },
      { name: 'robots', content: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' },
    ],
    links: [{ rel: 'canonical', href: siteUrl('/blog') }],
  }),
  component: BlogPage,
})

function BlogPage() {
  return <main>
    <SiteHeader />

    <section className="blog-index-hero">
      <span className="section-kicker">Hotel Lobby AI Blog</span>
      <h1>Guides for better Hotel Lobby AI videos</h1>
      <p>Learn how the trend works, which photos perform better, how to reduce identity drift, and how credits and failed generations work.</p>
    </section>

    <section className="section blog-index-section">
      <div className="blog-card-grid blog-card-grid-featured">
        {HOTEL_LOBBY_BLOG.map(article => <a key={article.slug} className="blog-card blog-card-visual" href={'/' + article.slug}>
          <div className="blog-card-image">
            <img src={images[article.image]} alt="" loading="lazy" />
          </div>
          <div className="blog-card-body">
            <span>{article.eyebrow}</span>
            <h2>{article.title}</h2>
            <p>{article.description}</p>
            <b>Read guide →</b>
          </div>
        </a>)}
      </div>
    </section>

    <section className="section launch-cta">
      <div>
        <span className="eyebrow">Try the generator</span>
        <h2>Turn two photos into a 15-second Hotel Lobby video</h2>
        <p>Swap the performers, choose 9:16 or 16:9, select quality, and generate with preset motion and soundtrack.</p>
      </div>
      <a className="seo-cta" href="/#generator">Open generator →</a>
    </section>

    <SiteFooter />
  </main>
}
