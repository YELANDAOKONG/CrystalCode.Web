import type { ServerAddress } from './address'

// Predicts what a browser will do with a request from this page to this
// server. The client cannot observe a block directly: a blocked request looks
// like any other network failure. The advisory is a prediction, so its wording
// must say "may", never "is".
//
// Sources checked 2026-10-26: MDN "Local network access", the Chrome 142
// release notes, and Microsoft's guide for Edge 143.

export type PageScheme = 'http' | 'https'

export interface PageContext {
  scheme: PageScheme
  /** Address space of the page itself, for an HTTP page served on a LAN. */
  space: 'loopback' | 'local' | 'public'
}

export type AdvisoryCode =
  | 'none'
  | 'permission-prompt' // https page to a local or loopback target: the browser asks the operator
  | 'mixed-content-public' // https page to http public: blocked, TLS on the server is the only way
  | 'mixed-content-local' // https page to http local: blocked unless the operator grants the permission
  | 'mixed-content-loopback' // https page to http loopback: allowed after the permission
  | 'mixed-content-name' // https page to http name that may resolve to a local address
  | 'clear-text' // the target is not loopback and not TLS: tokens travel in clear text
  | 'certificate' // https target: a self-signed certificate fails until the browser trusts it

export interface Advisory {
  codes: AdvisoryCode[]
  /** True when the browser is likely to refuse the request outright. */
  likelyBlocked: boolean
  /** True when the operator can say where a name resolves, to set `targetAddressSpace`. */
  canDeclareAddressSpace: boolean
}

export function advise(page: PageContext, target: ServerAddress): Advisory {
  const codes: AdvisoryCode[] = []
  let likelyBlocked = false
  let canDeclareAddressSpace = false

  if (page.scheme === 'https' && target.scheme === 'http') {
    likelyBlocked = true
    if (target.space === 'public') {
      if (target.isName) {
        // A name can resolve to a private address. Only the operator knows.
        codes.push('mixed-content-name')
        canDeclareAddressSpace = true
      } else {
        codes.push('mixed-content-public')
      }
    } else if (target.space === 'local') {
      codes.push('mixed-content-local')
    } else {
      codes.push('mixed-content-loopback')
    }
  }

  if (target.scheme === 'https') {
    codes.push('certificate')
    if (target.space !== 'public' && page.scheme === 'https') codes.push('permission-prompt')
  }

  if (target.scheme === 'http' && target.space === 'public') codes.push('clear-text')
  if (target.scheme === 'http' && target.space === 'local') codes.push('clear-text')

  return { codes: codes.length === 0 ? ['none'] : codes, likelyBlocked, canDeclareAddressSpace }
}
