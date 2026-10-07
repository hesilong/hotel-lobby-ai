export const SITE_CONFIG = {
  name: 'Hotel Lobby AI',
  domain: 'hotel-lobby-ai.pro',
  url: 'https://hotel-lobby-ai.pro',
  supportEmail: 'support@hotel-lobby-ai.pro',
  faviconPath: '/favicon.svg',
  mediaCdnUrl: 'https://cdn.hotel-lobby-ai.pro',
  defaultTitle: 'Hotel Lobby AI Video Generator',
  defaultDescription: 'Create Hotel Lobby AI videos from two photos and a reference motion video.',
} as const

export function siteUrl(path = '/') {
  if (!path || path === '/') return `${SITE_CONFIG.url}/`
  return `${SITE_CONFIG.url}${path.startsWith('/') ? path : `/${path}`}`
}

export function mediaUrl(path = '') {
  if (!path) return SITE_CONFIG.mediaCdnUrl
  return `${SITE_CONFIG.mediaCdnUrl}${path.startsWith('/') ? path : `/${path}`}`
}
