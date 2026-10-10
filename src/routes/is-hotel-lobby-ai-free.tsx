import { createFileRoute } from '@tanstack/react-router'
import { BlogArticlePage, blogHead } from '@/components/blog/BlogArticlePage'
import { BLOG_BY_SLUG } from '@/content/hotel-lobby-blog'

const article = BLOG_BY_SLUG['is-hotel-lobby-ai-free']

export const Route = createFileRoute('/is-hotel-lobby-ai-free')({
  head: () => blogHead(article),
  component: Page,
})

function Page() {
  return <BlogArticlePage article={article} />
}
