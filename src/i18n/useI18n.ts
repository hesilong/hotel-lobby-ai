import { useLocation } from '@tanstack/react-router'
import { getLocaleFromPathname, localizeHref } from './config'
import { getMessages } from './messages'

export function useI18n() {
  const location = useLocation()
  const locale = getLocaleFromPathname(location.pathname)

  return {
    locale,
    messages: getMessages(locale),
    localize: (href: string) => localizeHref(href, locale),
  }
}
