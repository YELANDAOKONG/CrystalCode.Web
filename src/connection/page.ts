import { classifyHost, parseAddress, type ParseResult } from './address'
import { advise, type Advisory, type PageContext } from './advisory'

// The only place that reads where this page was loaded from.

export function pageContext(): PageContext {
  return {
    scheme: window.location.protocol === 'https:' ? 'https' : 'http',
    space: classifyHost(window.location.hostname),
  }
}

export interface Inspection {
  result: ParseResult
  advisory: Advisory | null
}

/** Parses what the operator typed and predicts what the browser will do with it. */
export function inspectAddress(input: string): Inspection {
  const page = pageContext()
  const result = parseAddress(input, page.scheme)
  return { result, advisory: result.ok ? advise(page, result.address) : null }
}
