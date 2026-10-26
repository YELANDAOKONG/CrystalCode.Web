// The only place that reads or writes browser storage for server addresses
// and tokens. A token lives in memory. It reaches sessionStorage only when the
// operator ticks "keep for this tab", and never reaches localStorage.

const ADDRESSES_KEY = 'crystalcode.servers'
const TOKEN_PREFIX = 'crystalcode.token.'

export interface SavedServer {
  /** Normalized origin plus path prefix. This is also the identity of the entry. */
  url: string
  label: string
  /** Where the operator said a host name lives. Set only when they chose it. */
  addressSpace: 'local' | 'loopback' | null
  lastUsed: number
}

function safeLocal(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function safeSession(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function loadServers(): SavedServer[] {
  const raw = safeLocal()?.getItem(ADDRESSES_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const servers: SavedServer[] = []
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) continue
      const o = item as Record<string, unknown>
      if (typeof o.url !== 'string') continue
      servers.push({
        url: o.url,
        label: typeof o.label === 'string' ? o.label : '',
        addressSpace: o.addressSpace === 'local' || o.addressSpace === 'loopback' ? o.addressSpace : null,
        lastUsed: typeof o.lastUsed === 'number' ? o.lastUsed : 0,
      })
    }

    return servers.sort((a, b) => b.lastUsed - a.lastUsed)
  } catch {
    return []
  }
}

export function saveServer(server: SavedServer): SavedServer[] {
  const others = loadServers().filter((item) => item.url !== server.url)
  const next = [server, ...others].slice(0, 20)
  safeLocal()?.setItem(ADDRESSES_KEY, JSON.stringify(next))
  return next
}

export function forgetServer(url: string): SavedServer[] {
  const next = loadServers().filter((item) => item.url !== url)
  safeLocal()?.setItem(ADDRESSES_KEY, JSON.stringify(next))
  safeSession()?.removeItem(TOKEN_PREFIX + url)
  return next
}

export function loadTabToken(url: string): string | null {
  return safeSession()?.getItem(TOKEN_PREFIX + url) ?? null
}

export function saveTabToken(url: string, token: string): void {
  safeSession()?.setItem(TOKEN_PREFIX + url, token)
}

export function clearTabToken(url: string): void {
  safeSession()?.removeItem(TOKEN_PREFIX + url)
}

export function loadPreference(name: string): string | null {
  return safeLocal()?.getItem('crystalcode.pref.' + name) ?? null
}

export function savePreference(name: string, value: string): void {
  safeLocal()?.setItem('crystalcode.pref.' + name, value)
}
