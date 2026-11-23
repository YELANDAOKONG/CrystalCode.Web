import type { ThemeSetting } from './theme'
import { INK_BRUSH_RING } from './inkMark'
import { PRIDE_BRUSH_HIGHLIGHT, PRIDE_SPIRAL } from './prideMark'

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
<g stroke-linecap="round" stroke-linejoin="round">
  <path d="${PRIDE_SPIRAL}" fill="#b7467c" stroke="#fff3fb" stroke-width="1.7" paint-order="stroke fill"/>
  <path d="${PRIDE_BRUSH_HIGHLIGHT}" fill="none" stroke="#fff3fb" stroke-width=".8" opacity=".65"/>
</g>
</svg>`

const INK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<rect width="32" height="32" rx="5" fill="#f3f0e5"/>
<path d="${INK_BRUSH_RING}" fill="#202d28"/>
<path d="m23.5 13 4.8.2-.2 4.8-4.9-.2Z" fill="#953e30"/>
</svg>`

let original: string | null = null

export function applyFavicon(theme: ThemeSetting): void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) return
  original ??= link.getAttribute('href')
  if (theme === 'sakura') link.setAttribute('href', `data:image/svg+xml,${encodeURIComponent(SAKURA)}`)
  else if (theme === 'pride') link.setAttribute('href', `data:image/svg+xml,${encodeURIComponent(PRIDE)}`)
  else if (theme === 'ink') link.setAttribute('href', `data:image/svg+xml,${encodeURIComponent(INK)}`)
  else if (original) link.setAttribute('href', original)
}
