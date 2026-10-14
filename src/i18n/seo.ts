import { siteUrl } from '@/config/site'
import { LOCALES, localizeHref, type Locale } from './config'

export function localizedAlternates(path: string) {
  return [
    ...LOCALES.map(item => ({
      rel: 'alternate',
      hrefLang: item.htmlLang,
      href: siteUrl(localizeHref(path, item.locale)),
    })),
    { rel: 'alternate', hrefLang: 'x-default', href: siteUrl(path) },
  ]
}

export function localizedCanonical(path: string, locale: Locale) {
  return siteUrl(localizeHref(path, locale))
}
