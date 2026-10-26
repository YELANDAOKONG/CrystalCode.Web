// What a failed request can tell the page. A rejected Origin never reaches
// the page as a status: the server sends no CORS header for it, so the
// browser reports a network failure that looks like any other.

export type FailureKind =
  | 'network' // no readable response: wrong address, server down, certificate, mixed content, or a rejected Origin
  | 'aborted'
  | 'unauthorized' // 401
  | 'forbidden' // 403 with a readable body: a scope problem
  | 'host' // 421
  | 'rate-limited' // 429
  | 'not-ready' // 503
  | 'conflict' // 409
  | 'bad-request' // 400
  | 'not-found' // 404
  | 'too-large' // 413
  | 'server' // other 5xx
  | 'invalid-response'

export class ProtocolError extends Error {
  readonly kind: FailureKind
  readonly status: number | null
  /** Seconds from Retry-After on a 429, when the server exposes it. */
  readonly retryAfter: number | null

  constructor(kind: FailureKind, message: string, status: number | null = null, retryAfter: number | null = null) {
    super(message)
    this.name = 'ProtocolError'
    this.kind = kind
    this.status = status
    this.retryAfter = retryAfter
  }
}

export function kindForStatus(status: number): FailureKind {
  switch (status) {
    case 400:
      return 'bad-request'
    case 401:
      return 'unauthorized'
    case 403:
      return 'forbidden'
    case 404:
      return 'not-found'
    case 409:
      return 'conflict'
    case 413:
      return 'too-large'
    case 421:
      return 'host'
    case 429:
      return 'rate-limited'
    case 503:
      return 'not-ready'
    default:
      return status >= 500 ? 'server' : 'bad-request'
  }
}

export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
