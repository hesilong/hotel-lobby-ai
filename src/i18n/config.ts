export const DEFAULT_LOCALE = 'en' as const

export const LOCALES = [
  { locale: 'en', prefix: '', label: 'English', htmlLang: 'en' },
  { locale: 'zh-CN', prefix: 'zh', label: '简体中文', htmlLang: 'zh-CN' },
  { locale: 'ja', prefix: 'ja', label: '日本語', htmlLang: 'ja' },
] as const

export type Locale = (typeof LOCALES)[number]['locale']

const PREFIX_TO_LOCALE: Record<string, Locale> = Object.fromEntries(
  LOCALES.filter(item => item.prefix).map(item => [item.prefix, item.locale]),
) as Record<string, Locale>

export const LOCALIZED_ROUTE_PATHS = new Set([
  '/',
  '/pricing',
  '/migos-ai-video',
])

export function localeFromPrefix(prefix: string | undefined): Locale | null {
  if (!prefix) return null
  return PREFIX_TO_LOCALE[prefix] ?? null
}

export function getLocaleFromPathname(pathname: string): Locale {
  const prefix = pathname.split('/').filter(Boolean)[0]
  return localeFromPrefix(prefix) ?? DEFAULT_LOCALE
}

export function stripLocaleFromPathname(pathname: string) {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  const segments = normalized.split('/').filter(Boolean)
  if (!segments.length) return '/'

  if (localeFromPrefix(segments[0])) {
    const rest = segments.slice(1)
    return rest.length ? `/${rest.join('/')}` : '/'
  }

  return normalized
}

export function localizeHref(href: string, locale: Locale) {
  const match = href.match(/^([^?#]*)(.*)$/)
  const pathname = stripLocaleFromPathname(match?.[1] || '/')
  const suffix = match?.[2] || ''
  const localeConfig = LOCALES.find(item => item.locale === locale)

  if (!localeConfig?.prefix) return `${pathname}${suffix}`
  if (pathname === '/') return `/${localeConfig.prefix}/${suffix}`
  return `/${localeConfig.prefix}${pathname}${suffix}`
}

export function isLocalizedRoute(pathname: string) {
  return LOCALIZED_ROUTE_PATHS.has(stripLocaleFromPathname(pathname))
}

export function htmlLangForLocale(locale: Locale) {
  return LOCALES.find(item => item.locale === locale)?.htmlLang ?? 'en'
}

export function dateLocaleForLocale(locale: Locale) {
  if (locale === 'zh-CN') return 'zh-CN'
  if (locale === 'ja') return 'ja-JP'
  return 'en-US'
}
