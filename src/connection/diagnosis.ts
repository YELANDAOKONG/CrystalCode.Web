import { ProtocolError } from '@/protocol/errors'
import type { Advisory } from './advisory'

// Turns a failure into a stable code the interface can translate. A rejected
// Origin never reaches the page as a status, so a `network` failure keeps every
// cause on the list instead of claiming one.

export type DiagnosisCode =
  | 'unauthorized' // 401: token missing or wrong
  | 'forbidden' // 403 readable: the token's scope is too low
  | 'host-not-allowed' // 421 readable: --allow-host
  | 'rate-limited' // 429
  | 'not-ready' // 503
  | 'unreachable' // network: several causes, see the checklist
  | 'unreachable-blocked' // network, and the advisory said the browser likely blocked it
  | 'bad-response' // reachable but not a Crystal Code server
  | 'other'

export interface Diagnosis {
  code: DiagnosisCode
  detail: string
  retryAfter: number | null
  /** Checklist items for `unreachable`, in the order an operator should try them. */
  checklist: ChecklistItem[]
}

export type ChecklistItem =
  | 'address' // typo, port, scheme
  | 'running' // is crystal server running
  | 'allow-origin' // --allow-origin <page origin>
  | 'allow-host' // --allow-host <name>
  | 'certificate' // self-signed certificate not trusted yet
  | 'mixed-content' // https page, http server
  | 'permission' // local network permission denied

export function diagnose(error: unknown, advisory: Advisory, targetScheme: 'http' | 'https'): Diagnosis {
  if (!(error instanceof ProtocolError)) {
    return { code: 'other', detail: '', retryAfter: null, checklist: [] }
  }

  const base = { detail: error.message, retryAfter: error.retryAfter, checklist: [] as ChecklistItem[] }
  switch (error.kind) {
    case 'unauthorized':
      return { ...base, code: 'unauthorized' }
    case 'forbidden':
      return { ...base, code: 'forbidden' }
    case 'host':
      return { ...base, code: 'host-not-allowed' }
    case 'rate-limited':
      return { ...base, code: 'rate-limited' }
    case 'not-ready':
      return { ...base, code: 'not-ready' }
    case 'invalid-response':
    case 'not-found':
      return { ...base, code: 'bad-response' }
    case 'network': {
      const checklist: ChecklistItem[] = []
      if (advisory.likelyBlocked) checklist.push('mixed-content')
      checklist.push('address', 'running', 'allow-origin', 'allow-host')
      if (targetScheme === 'https') checklist.push('certificate')
      if (advisory.codes.includes('permission-prompt') || advisory.codes.includes('mixed-content-local')) {
        checklist.push('permission')
      }

      return {
        ...base,
        code: advisory.likelyBlocked ? 'unreachable-blocked' : 'unreachable',
        checklist,
      }
    }
    default:
      return { ...base, code: 'other' }
  }
}
