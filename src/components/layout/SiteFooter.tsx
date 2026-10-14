import { SITE_CONFIG } from '@/config/site'
import { useI18n } from '@/i18n/useI18n'

export function SiteFooter() {
  const { messages, localize } = useI18n()
  const m = messages.footer

  return (
    <footer className="site-footer">
      <div>
        <a className="brand" href={localize('/')}>{SITE_CONFIG.name}</a>
        <p>{m.tagline}</p>
        <p>{m.support}: <a href={`mailto:${SITE_CONFIG.supportEmail}`}>{SITE_CONFIG.supportEmail}</a></p>
        <p><a href="/terms-of-service#reporting">{m.reportContent}</a></p>
      </div>
      <div className="footer-links">
        <a href={localize('/')}>{SITE_CONFIG.name}</a>
        <a href={localize('/migos-ai-video')}>{m.migosVideo}</a>
        <a href="/blog">{m.blog}</a>
        <a href={localize('/pricing')}>{m.pricing}</a>
        <a href="/privacy-policy">{m.privacy}</a>
        <a href="/terms-of-service">{m.terms}</a>
      </div>
      <p className="disclaimer">
        {m.disclaimer}
      </p>
    </footer>
  )
}
