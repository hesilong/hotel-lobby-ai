import type { BlogArticle } from '@/content/hotel-lobby-blog'
import { HOTEL_LOBBY_BLOG } from '@/content/hotel-lobby-blog'
import { HOTEL_LOBBY_FRIENDS_WEBP, HOTEL_LOBBY_PETS_WEBP, HOTEL_LOBBY_STREETWEAR_WEBP } from '@/config/hotel-lobby-visuals'
import { SITE_CONFIG, siteUrl } from '@/config/site'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'

const images = {
  friends: HOTEL_LOBBY_FRIENDS_WEBP,
  streetwear: HOTEL_LOBBY_STREETWEAR_WEBP,
  pets: HOTEL_LOBBY_PETS_WEBP,
} as const

export function BlogArticlePage({ article }: { article: BlogArticle }) {
  const related = HOTEL_LOBBY_BLOG.filter(item => item.slug !== article.slug).slice(0, 3)
  const articleUrl = siteUrl('/' + article.slug)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: article.title,
        description: article.description,
        datePublished: article.published,
        dateModified: article.updated,
        mainEntityOfPage: articleUrl,
        author: {
          '@type': 'Organization',
          name: SITE_CONFIG.name,
        },
        publisher: {
          '@type': 'Organization',
          name: SITE_CONFIG.name,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl('/') },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: siteUrl('/blog') },
          { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl },
        ],
      },
    ],
  }

  return <main>
    <SiteHeader />

    <article className="blog-article">
      <header className="blog-article-head">
        <a className="blog-back" href="/blog">← Blog</a>
        <span className="section-kicker">{article.eyebrow}</span>
        <h1>{article.title}</h1>
        <p className="blog-article-description">{article.description}</p>
        <div className="blog-article-meta">
          <span>Updated {formatDate(article.updated)}</span>
          <span>Hotel Lobby AI Guide</span>
        </div>
      </header>

      <figure className="blog-hero-image">
        <img src={images[article.image]} alt={article.title} />
      </figure>

      <div className="blog-article-body">
        <div className="blog-intro">
          {article.intro.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        </div>

        <aside className="blog-inline-cta">
          <div>
            <strong>Want to try it now?</strong>
            <span>Upload two photos and create the fixed 15-second Hotel Lobby performance.</span>
          </div>
          <a href="/#generator">Open generator →</a>
        </aside>

        {article.sections.map(section => <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          {section.bullets && <ul>
            {section.bullets.map(item => <li key={item}>{item}</li>)}
          </ul>}
        </section>)}

        <aside className="blog-price-note">
          <strong>No subscription required.</strong>
          <span>Pay per video: $4.99 for 480p, $9.90 for 720p, or $19.90 for 1080p. Technical failures can be retried free or refunded on request.</span>
          <a href="/pricing">View pricing →</a>
        </aside>
      </div>
    </article>

    <section className="section blog-related">
      <div className="section-heading">
        <span>Keep reading</span>
        <h2>More Hotel Lobby AI guides</h2>
      </div>
      <div className="blog-card-grid">
        {related.map(item => <a key={item.slug} className="blog-card" href={'/' + item.slug}>
          <span>{item.eyebrow}</span>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <b>Read guide →</b>
        </a>)}
      </div>
    </section>

    <SiteFooter />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  </main>
}

export function blogHead(article: BlogArticle) {
  return {
    meta: [
      { title: article.title + ' – ' + SITE_CONFIG.name },
      { name: 'description', content: article.description },
      { property: 'og:title', content: article.title },
      { property: 'og:description', content: article.description },
      { property: 'og:type', content: 'article' },
      { property: 'og:url', content: siteUrl('/' + article.slug) },
      { property: 'og:site_name', content: SITE_CONFIG.name },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: article.title },
      { name: 'twitter:description', content: article.description },
      { name: 'robots', content: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' },
    ],
    links: [{ rel: 'canonical', href: siteUrl('/' + article.slug) }],
  }
}

function formatDate(value: string) {
  const date = new Date(value + 'T00:00:00Z')
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}
