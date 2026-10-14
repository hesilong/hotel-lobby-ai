import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
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
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = LOCALES.find(item => item.locale === locale) ?? LOCALES[0]

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!isLocalizedRoute(location.pathname)) return null

  const changeLocale = (nextLocale: Locale) => {
    setOpen(false)
    if (nextLocale === locale || typeof window === 'undefined') return

    const basePath = stripLocaleFromPathname(location.pathname)
    const target = localizeHref(basePath, nextLocale)
    window.location.assign(`${target}${window.location.search}${window.location.hash}`)
  }

  return (
    <div className="language-switcher" ref={rootRef}>
      <button
        type="button"
        className="language-trigger"
        aria-label={messages.header.language}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        <span>{current.label}</span>
        <ChevronDown className={open ? 'language-chevron open' : 'language-chevron'} size={14} />
      </button>

      {open && (
        <div className="language-menu" role="menu" aria-label={messages.header.language}>
          {LOCALES.map(item => {
            const selected = item.locale === locale

            return (
              <button
                key={item.locale}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={selected ? 'language-option active' : 'language-option'}
                onClick={() => changeLocale(item.locale)}
              >
                <span>{item.label}</span>
                {selected && <Check size={14} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
