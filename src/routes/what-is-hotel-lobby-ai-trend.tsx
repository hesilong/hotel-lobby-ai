import { createFileRoute } from '@tanstack/react-router'
import { BlogArticlePage, blogHead } from '@/components/blog/BlogArticlePage'
import { BLOG_BY_SLUG } from '@/content/hotel-lobby-blog'

const article = BLOG_BY_SLUG['what-is-hotel-lobby-ai-trend']

export const Route = createFileRoute('/what-is-hotel-lobby-ai-trend')({
  head: () => blogHead(article),
  component: Page,
})

function Page() {
  return <BlogArticlePage article={article} />
}
