import { useLocation } from '@tanstack/react-router'
import {
  LOCALES,
  getLocaleFromPathname,
  isLocalizedRoute,
  localizeHref,
  stripLocaleFromPathname,
  type Locale,
} from '@/i18n/config'
import { getMessages } from '@/i18n/messages'

export function LanguageSwitcher() {
  const location = useLocation()
  const locale = getLocaleFromPathname(location.pathname)
  const messages = getMessages(locale)

  if (!isLocalizedRoute(location.pathname)) return null

  const onChange = (nextLocale: Locale) => {
    if (nextLocale === locale || typeof window === 'undefined') return
    const basePath = stripLocaleFromPathname(location.pathname)
    const target = localizeHref(basePath, nextLocale)
    window.location.assign(`${target}${window.location.search}${window.location.hash}`)
  }

  return (
    <select
      className="header-signin"
      aria-label={messages.header.language}
      value={locale}
      onChange={event => onChange(event.target.value as Locale)}
    >
      {LOCALES.map(item => (
        <option key={item.locale} value={item.locale}>{item.label}</option>
      ))}
    </select>
  )
}
