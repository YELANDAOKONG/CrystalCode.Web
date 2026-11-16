import { baseUrl, parseAddress } from './address'

// A Crystal Code server that serves this page also answers `GET /config` on
// the same origin. The answer names the API path and says whether a token is
// needed. It never holds a token or a host, so it cannot send the page, or
// anything the page holds, to another server. Pure: the caller does the fetch.

export interface HostedServer {
  /** `origin` plus the server's api base, with no trailing slash. */
  url: string
  /** A hint for the form only. The server's answers decide what is allowed. */
  authentication: boolean
}

/** Returns the hosting server, or null when the text is not a Crystal Code `/config`. */
export function parseConfig(text: string, pageOrigin: string): HostedServer | null {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    // A static host with no such route may answer with the page itself.
    return null
  }

  if (typeof value !== 'object' || value === null) return null
  const config = value as Record<string, unknown>
  if (config.product !== 'crystal-code') return null

  const path = config.apiBase ?? '/'
  if (typeof path !== 'string' || !path.startsWith('/')) return null

  const result = parseAddress(pageOrigin + path, 'https')
  if (!result.ok) return null

  return { url: baseUrl(result.address), authentication: config.authentication !== false }
}
