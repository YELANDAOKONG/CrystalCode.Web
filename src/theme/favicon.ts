import type { ThemeSetting } from './theme'
import { NARUTOMAKI_RIM, NARUTOMAKI_SWIRL } from './prideMark'

// The tab icon follows the theme where the theme has its own mark. The data URL
// is built here, so nothing is fetched.
const SAKURA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<rect width="32" height="32" fill="#1e111b"/>
<g fill="none" stroke="#f7a0bd" stroke-width="1.4" stroke-linejoin="round">
${[0, 72, 144, 216, 288].map((angle) => `<path transform="rotate(${angle} 16 16)" d="M16 16C12 12.2 10.8 7.4 13.6 4.8L16 6.6 18.4 4.8C21.2 7.4 20 12.2 16 16Z"/>`).join('\n')}
</g>
<circle cx="16" cy="16" r="1.7" fill="#f7a0bd"/>
</svg>`

// The tab icon uses the same narutomaki as the in-page mark.
const PRIDE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<path d="${NARUTOMAKI_RIM}" fill="#fff5fc" stroke="#527fa6" stroke-width="1.6" stroke-linejoin="round"/>
<path d="${NARUTOMAKI_SWIRL}" fill="none" stroke="#aa3e75" stroke-width="2.8" stroke-linecap="round"/>
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
