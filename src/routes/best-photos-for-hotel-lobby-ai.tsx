import { createFileRoute } from '@tanstack/react-router'
import { BlogArticlePage, blogHead } from '@/components/blog/BlogArticlePage'
import { BLOG_BY_SLUG } from '@/content/hotel-lobby-blog'

const article = BLOG_BY_SLUG['best-photos-for-hotel-lobby-ai']

export const Route = createFileRoute('/best-photos-for-hotel-lobby-ai')({
  head: () => blogHead(article),
  component: Page,
})

function Page() {
  return <BlogArticlePage article={article} />
}
