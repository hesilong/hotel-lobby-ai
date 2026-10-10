import { createFileRoute } from '@tanstack/react-router'
import { BlogArticlePage, blogHead } from '@/components/blog/BlogArticlePage'
import { BLOG_BY_SLUG } from '@/content/hotel-lobby-blog'

const article = BLOG_BY_SLUG['how-to-make-hotel-lobby-ai-video']

export const Route = createFileRoute('/how-to-make-hotel-lobby-ai-video')({
  head: () => blogHead(article),
  component: Page,
})

function Page() {
  return <BlogArticlePage article={article} />
}
