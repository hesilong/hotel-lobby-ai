import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { localeFromPrefix } from '@/i18n/config'

export const Route = createFileRoute('/$locale')({
  beforeLoad: ({ params }) => {
    const locale = localeFromPrefix(params.locale)
    if (!locale || locale === 'en') throw notFound()
  },
  component: LocaleLayout,
})

function LocaleLayout() {
  return <Outlet />
}
