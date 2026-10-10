import { SITE_CONFIG } from '@/config/site'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <a className="brand" href="/">{SITE_CONFIG.name}</a>
        <p>Independent AI video tool for creating hotel-lobby-style motion videos.</p>
        <p>Customer support: <a href={`mailto:${SITE_CONFIG.supportEmail}`}>{SITE_CONFIG.supportEmail}</a></p>
        <p><a href="/terms-of-service#reporting">Report content</a></p>
      </div>
      <div className="footer-links">
        <a href="/">{SITE_CONFIG.name}</a>
        <a href="/migos-ai-video">Migos AI Video</a>
        <a href="/blog">Blog</a>
        <a href="/pricing">Pricing</a>
        <a href="/privacy-policy">Privacy</a>
        <a href="/terms-of-service">Terms</a>
      </div>
      <p className="disclaimer">
        {SITE_CONFIG.name} is an independent tool and is not affiliated with or endorsed by Migos or related rights holders.
      </p>
    </footer>
  )
}
