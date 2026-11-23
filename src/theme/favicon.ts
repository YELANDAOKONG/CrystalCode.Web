import type { ThemeSetting } from './theme'

// The tab icon follows the theme where the theme has its own mark. The data URL
// is built here, so nothing is fetched.
const SAKURA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<rect width="32" height="32" fill="#1e111b"/>
<g fill="none" stroke="#f7a0bd" stroke-width="1.4" stroke-linejoin="round">
${[0, 72, 144, 216, 288].map((angle) => `<path transform="rotate(${angle} 16 16)" d="M16 16C12 12.2 10.8 7.4 13.6 4.8L16 6.6 18.4 4.8C21.2 7.4 20 12.2 16 16Z"/>`).join('\n')}
</g>
<circle cx="16" cy="16" r="1.7" fill="#f7a0bd"/>
</svg>`

// A narutomaki in the three flag colors on the deep night blue.
const PRIDE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-32 -32 64 64">
<rect x="-32" y="-32" width="64" height="64" fill="#141a2b"/>
<circle r="26" fill="#fff" stroke="#f5a9b8" stroke-width="4"/>
<path d="M0 0a5 5 0 0 1 10 0a10 10 0 0 1-20 0a15 15 0 0 1 30 0" fill="none" stroke="#5bcefa" stroke-width="4" stroke-linecap="round"/>
</svg>`

let original: string | null = null

export function applyFavicon(theme: ThemeSetting): void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) return
  original ??= link.getAttribute('href')
  if (theme === 'sakura') link.setAttribute('href', `data:image/svg+xml,${encodeURIComponent(SAKURA)}`)
  else if (theme === 'pride') link.setAttribute('href', `data:image/svg+xml,${encodeURIComponent(PRIDE)}`)
  else if (original) link.setAttribute('href', original)
}
