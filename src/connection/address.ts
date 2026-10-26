// Turns what the operator typed into a validated server address, and decides
// what the browser is likely to do with it. Pure functions: no storage, no
// window, no network, so every case can be checked directly.

export type AddressSpace = 'loopback' | 'local' | 'public'

export interface ServerAddress {
  scheme: 'http' | 'https'
  /** Host as the URL reports it. IPv6 literals keep their brackets. */
  host: string
  port: number | null
  /** `scheme://host[:port]` with no trailing slash. This is the Origin the server sees. */
  origin: string
  /** Path prefix for a server behind a reverse proxy. No trailing slash. */
  pathPrefix: string
  space: AddressSpace
  /** True when the host is a name, so the client cannot know where it resolves. */
  isName: boolean
}

export type AddressError =
  | 'empty'
  | 'invalid'
  | 'unsupported-scheme'
  | 'credentials'
  | 'query-or-fragment'

export type ParseResult = { ok: true; address: ServerAddress } | { ok: false; error: AddressError }

/**
 * @param input What the operator typed. A missing scheme takes `defaultScheme`.
 * @param defaultScheme The page's own scheme: an HTTPS page guessing `http://`
 *   would be blocked before it started.
 */
export function parseAddress(input: string, defaultScheme: 'http' | 'https'): ParseResult {
  const text = input.trim()
  if (text === '') return { ok: false, error: 'empty' }

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text)
  if (!hasScheme && /^[a-z][a-z0-9+.-]*:/i.test(text) && !/^[^/]*:\d+(\/|$)/.test(text) && !text.startsWith('[')) {
    // `javascript:alert(1)` and similar. `host:8080` has a digit port and passes.
    return { ok: false, error: 'unsupported-scheme' }
  }

  let url: URL
  try {
    url = new URL(hasScheme ? text : `${defaultScheme}://${text}`)
  } catch {
    return { ok: false, error: 'invalid' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, error: 'unsupported-scheme' }
  if (url.username !== '' || url.password !== '') return { ok: false, error: 'credentials' }
  if (url.search !== '' || url.hash !== '') return { ok: false, error: 'query-or-fragment' }
  if (url.hostname === '') return { ok: false, error: 'invalid' }

  const scheme = url.protocol === 'https:' ? 'https' : 'http'
  const host = url.hostname
  const port = url.port === '' ? null : Number(url.port)
  const origin = `${scheme}://${host}${port === null ? '' : `:${port}`}`
  const pathPrefix = url.pathname.replace(/\/+$/, '')
  return {
    ok: true,
    address: {
      scheme,
      host,
      port,
      origin,
      pathPrefix,
      space: classifyHost(host),
      isName: !isIpLiteral(host),
    },
  }
}

export function baseUrl(address: ServerAddress): string {
  return address.origin + address.pathPrefix
}

function isIpLiteral(host: string): boolean {
  return host.startsWith('[') || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
}

/**
 * Classifies a host from its text only. A name such as `nas.home.lan` is
 * `public` here even when it resolves to a private address; the browser may
 * treat it as local. That gap is why the operator can state where a server is.
 */
export function classifyHost(rawHost: string): AddressSpace {
  const host = rawHost.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost')) return 'loopback'
  if (host === '::1') return 'loopback'

  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])]
    if (a === 127) return 'loopback'
    if (a === 10) return 'local'
    if (a === 172 && b >= 16 && b <= 31) return 'local'
    if (a === 192 && b === 168) return 'local'
    if (a === 169 && b === 254) return 'local'
    if (a === 100 && b >= 64 && b <= 127) return 'local' // carrier-grade NAT, shared address space
    return 'public'
  }

  if (host.includes(':')) {
    if (host.startsWith('fe80:') || /^f[cd][0-9a-f]{2}:/.test(host)) return 'local'
    return 'public'
  }

  if (host.endsWith('.local')) return 'local'
  return 'public'
}
