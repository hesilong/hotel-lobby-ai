import { createFileRoute } from '@tanstack/react-router'
import { BlogArticlePage, blogHead } from '@/components/blog/BlogArticlePage'
import { BLOG_BY_SLUG } from '@/content/hotel-lobby-blog'

const article = BLOG_BY_SLUG['how-to-fix-face-drift-hotel-lobby-ai']

export const Route = createFileRoute('/how-to-fix-face-drift-hotel-lobby-ai')({
  head: () => blogHead(article),
  component: Page,
})

function Page() {
  return <BlogArticlePage article={article} />
}
