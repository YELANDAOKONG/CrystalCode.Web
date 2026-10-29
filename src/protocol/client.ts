import { ProtocolError, isAbort, kindForStatus } from './errors'
import { arr, asObject, bool, optStr, str } from './json'
import {
  parseEvent,
  parseInfo,
  parseInteraction,
  parseQuickPrompts,
  parseSnapshot,
  parseChild,
  parseScope,
  parseAgents,
  parseMcp,
  parseModelCatalog,
  parseOptionCatalog,
  parsePlugins,
  parseSavedSessions,
  parseSkills,
  parseTaskLog,
  parseTasks,
} from './parse'
import { SseParser } from './sse'
import type {
  AgentsReport,
  BackgroundTask,
  ChildSummary,
  Interaction,
  McpReport,
  ModelCatalog,
  OptionCatalog,
  PluginsReport,
  SavedSession,
  SkillsReport,
  TaskLog,
  IssuedToken,
  QuickPromptCatalog,
  Scope,
  ServerEvent,
  ServerInfo,
  Snapshot,
} from './types'

export interface ClientOptions {
  /** Origin and path prefix of the server, without a trailing slash. */
  baseUrl: string
  /** Bearer token, or null when the server runs with authentication off. */
  token: string | null
  /** Random id for this page. Letters, digits, `-`, `_`, `.`, at most 128. */
  clientId: string
  /**
   * Set only when the operator said the server is on their local network or
   * on this computer. It lets the browser skip the mixed-content check for a
   * host name it cannot classify.
   */
  targetAddressSpace?: 'local' | 'loopback'
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

type RequestInitWithSpace = RequestInit & { targetAddressSpace?: 'local' | 'loopback' }

// Only Authorization, Content-Type, X-Crystal-Client, and Last-Event-ID pass
// the server's CORS preflight. Add no other custom request header.
export class CrystalClient {
  private readonly options: ClientOptions
  private readonly fetcher: FetchLike

  constructor(options: ClientOptions, fetcher: FetchLike = (input, init) => fetch(input, init)) {
    this.options = options
    this.fetcher = fetcher
  }

  get clientId(): string {
    return this.options.clientId
  }

  // --- reads ---------------------------------------------------------------

  /** `GET /health`: no token. Returns the server state. */
  async health(signal?: AbortSignal): Promise<string> {
    const body = await this.json('GET', '/health', undefined, signal, false)
    return str(asObject(body).state)
  }

  async info(signal?: AbortSignal): Promise<ServerInfo> {
    return parseInfo(await this.json('GET', '/info', undefined, signal))
  }

  async snapshot(signal?: AbortSignal): Promise<Snapshot> {
    return parseSnapshot(await this.json('GET', '/snapshot', undefined, signal))
  }

  async interactions(signal?: AbortSignal): Promise<Interaction[]> {
    const body = asObject(await this.json('GET', '/interactions', undefined, signal))
    return arr(body.interactions).map(parseInteraction)
  }

  async quickPrompts(signal?: AbortSignal): Promise<QuickPromptCatalog> {
    return parseQuickPrompts(await this.json('GET', '/quick-prompts', undefined, signal))
  }

  async children(signal?: AbortSignal): Promise<ChildSummary[]> {
    const body = asObject(await this.json('GET', '/children', undefined, signal))
    return arr(body.children).map(parseChild)
  }

  async child(id: string, signal?: AbortSignal): Promise<ChildSummary> {
    const body = asObject(await this.json('GET', `/children/${encodeURIComponent(id)}`, undefined, signal))
    return parseChild(body.child)
  }

  async sessions(all: boolean, signal?: AbortSignal): Promise<SavedSession[]> {
    return parseSavedSessions(await this.json('GET', `/sessions?all=${all ? 'true' : 'false'}`, undefined, signal))
  }

  async models(signal?: AbortSignal): Promise<ModelCatalog> {
    return parseModelCatalog(await this.json('GET', '/models', undefined, signal))
  }

  async optionCatalog(signal?: AbortSignal): Promise<OptionCatalog> {
    return parseOptionCatalog(await this.json('GET', '/options', undefined, signal))
  }

  async agents(signal?: AbortSignal): Promise<AgentsReport> {
    return parseAgents(await this.json('GET', '/agents', undefined, signal))
  }

  async skills(signal?: AbortSignal): Promise<SkillsReport> {
    return parseSkills(await this.json('GET', '/skills', undefined, signal))
  }

  async mcp(signal?: AbortSignal): Promise<McpReport> {
    return parseMcp(await this.json('GET', '/mcp', undefined, signal))
  }

  async plugins(signal?: AbortSignal): Promise<PluginsReport> {
    return parsePlugins(await this.json('GET', '/plugins', undefined, signal))
  }

  async tasks(signal?: AbortSignal): Promise<BackgroundTask[]> {
    return parseTasks(await this.json('GET', '/tasks', undefined, signal))
  }

  /** A 410 means the offset left the bounded log; the caller restarts from the task's `logStartOffset`. */
  async taskLog(id: string, offset: number, signal?: AbortSignal): Promise<TaskLog> {
    const path = `/tasks/${encodeURIComponent(id)}/logs?offset=${offset}`
    return parseTaskLog(await this.json('GET', path, undefined, signal))
  }

  /**
   * `PUT /options/{id}`: runs the value's slash command, so validation and
   * next-turn rules match the terminal. A switch takes a boolean.
   */
  async setOption(
    id: string,
    value: string | boolean,
    requestId: string,
    signal?: AbortSignal,
  ): Promise<OptionCatalog & { applied: 'now' | 'next-turn' }> {
    const body = await this.json('PUT', `/options/${encodeURIComponent(id)}`, { value, clientRequestId: requestId }, signal)
    const catalog = parseOptionCatalog(body, 'pendingSettings')
    return { ...catalog, applied: bool(asObject(body).pending) ? 'next-turn' : 'now' }
  }

  /** `GET /export`. The server names the file in Content-Disposition. */
  async export(
    format: 'markdown' | 'json',
    includeSystem: boolean,
    signal?: AbortSignal,
  ): Promise<{ blob: Blob; fileName: string | null }> {
    const query = `?format=${format}&system=${includeSystem ? 'true' : 'false'}`
    const response = await this.request('GET', `/export${query}`, undefined, signal)
    const blob = await response.blob()
    return { blob, fileName: fileNameFrom(response.headers.get('Content-Disposition')) }
  }

  /** Image bytes from `GET /images/{number}`, or a remote URI the server reports. */
  async image(number: number, signal?: AbortSignal): Promise<{ blob: Blob } | { uri: string }> {
    const response = await this.request('GET', `/images/${number}`, undefined, signal)
    const type = response.headers.get('Content-Type') ?? ''
    if (type.startsWith('application/json')) {
      const body = asObject(await response.json())
      return { uri: str(body.uri) }
    }

    return { blob: await response.blob() }
  }

  // --- commands ------------------------------------------------------------

  /**
   * `accepted` is false when the engine refused the input; the reason also
   * arrives as an `error` event. `pending` means a setting was recorded for the
   * next turn.
   */
  async input(
    text: string,
    requestId: string,
    signal?: AbortSignal,
  ): Promise<{ accepted: boolean; pending: boolean; turnActive: boolean; quit: boolean }> {
    const body = asObject(await this.json('POST', '/input', { text, clientRequestId: requestId }, signal))
    return {
      accepted: bool(body.accepted, true),
      pending: bool(body.pending),
      turnActive: bool(body.turnActive),
      quit: bool(body.quit),
    }
  }

  async interrupt(signal?: AbortSignal): Promise<boolean> {
    return bool(asObject(await this.json('POST', '/interrupt', {}, signal)).interrupted)
  }

  async recall(signal?: AbortSignal): Promise<boolean> {
    return bool(asObject(await this.json('POST', '/recall', {}, signal)).recalled)
  }

  async setMode(
    action: 'cycle' | 'toggle-plan' | 'set',
    name: string | undefined,
    requestId: string,
    signal?: AbortSignal,
  ): Promise<{ mode: string; planMode: boolean }> {
    const body = asObject(await this.json('POST', '/mode', { action, name, clientRequestId: requestId }, signal))
    return { mode: str(body.mode), planMode: bool(body.planMode) }
  }

  async setVerbose(target: string, enabled: boolean, requestId: string, signal?: AbortSignal): Promise<void> {
    await this.json('POST', '/verbose', { target, enabled, clientRequestId: requestId }, signal)
  }

  async draft(text: string, requestId: string, signal?: AbortSignal): Promise<void> {
    await this.json('PUT', '/draft', { text, clientRequestId: requestId }, signal)
  }

  async uploadImage(
    data: Blob,
    requestId: string,
    signal?: AbortSignal,
  ): Promise<{ number: number; mimeType: string; marker: string; trustedMarker: string }> {
    const response = await this.request(
      'POST',
      `/images?clientRequestId=${encodeURIComponent(requestId)}`,
      data,
      signal,
      data.type || 'application/octet-stream',
    )
    const body = asObject(await response.json())
    return {
      number: typeof body.number === 'number' ? body.number : 0,
      mimeType: str(body.mimeType),
      marker: str(body.marker),
      trustedMarker: str(body.trustedMarker),
    }
  }

  async sendQuickPrompt(name: string, requestId: string, signal?: AbortSignal): Promise<boolean> {
    const body = asObject(
      await this.json('POST', `/quick-prompts/${encodeURIComponent(name)}/send`, { clientRequestId: requestId }, signal),
    )
    return bool(body.turnActive)
  }

  async cancelSide(signal?: AbortSignal): Promise<boolean> {
    return bool(asObject(await this.json('POST', '/side/cancel', {}, signal)).cancelled)
  }

  async clearSide(requestId: string, signal?: AbortSignal): Promise<void> {
    await this.json('POST', '/side/clear', { clientRequestId: requestId }, signal)
  }

  async answer(id: string, answer: unknown, signal?: AbortSignal): Promise<void> {
    await this.json('POST', `/interactions/${encodeURIComponent(id)}`, answer, signal)
  }

  // --- auth ----------------------------------------------------------------

  async ticket(signal?: AbortSignal): Promise<string> {
    return str(asObject(await this.json('POST', '/auth/ticket', {}, signal)).ticket)
  }

  async listTokens(signal?: AbortSignal): Promise<IssuedToken[]> {
    const body = asObject(await this.json('GET', '/auth/tokens', undefined, signal))
    return arr(body.tokens).map((item) => {
      const o = asObject(item)
      return { id: str(o.id), scope: parseScope(o.scope), label: optStr(o.label) }
    })
  }

  async issueToken(scope: Scope, label: string | null, signal?: AbortSignal): Promise<IssuedToken> {
    const body = asObject(await this.json('POST', '/auth/tokens', { scope, label }, signal))
    return { id: str(body.id), scope: parseScope(body.scope), label: optStr(body.label), token: str(body.token) }
  }

  async revokeToken(id: string, signal?: AbortSignal): Promise<void> {
    await this.json('DELETE', `/auth/tokens/${encodeURIComponent(id)}`, undefined, signal)
  }

  async shutdown(signal?: AbortSignal): Promise<void> {
    await this.json('POST', '/shutdown', {}, signal)
  }

  // --- event stream --------------------------------------------------------

  /**
   * Reads `GET /events` with fetch so the token stays in a header and never
   * in a URL. Resolves when the stream ends. Calls `onEvent` for each event
   * and `onResync` when the server says the cursor left its buffer.
   */
  async stream(
    after: number,
    handlers: {
      onEvent: (event: ServerEvent) => void
      onResync: () => void
      onOpen?: () => void
      /** Called for every chunk, including the server's 15-second heartbeat comment. */
      onActivity?: () => void
    },
    signal: AbortSignal,
  ): Promise<void> {
    const response = await this.request('GET', `/events?after=${after}`, undefined, signal, undefined, {
      Accept: 'text/event-stream',
      'Last-Event-ID': String(after),
    })
    if (!response.body) {
      throw new ProtocolError('invalid-response', 'The server sent no event stream.')
    }

    handlers.onOpen?.()
    const decoder = new TextDecoder('utf-8')
    const parser = new SseParser()
    const reader = response.body.getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        handlers.onActivity?.()
        for (const frame of parser.push(decoder.decode(value, { stream: true }))) {
          if (frame.event === 'resync') {
            handlers.onResync()
            return
          }

          let parsed: unknown
          try {
            parsed = JSON.parse(frame.data)
          } catch {
            continue
          }

          const event = parseEvent(parsed)
          if (event) handlers.onEvent(event)
        }
      }
    } catch (error) {
      if (isAbort(error)) return
      throw new ProtocolError('network', 'The event stream was interrupted.')
    } finally {
      reader.cancel().catch(() => {})
    }
  }

  // --- plumbing ------------------------------------------------------------

  private async json(
    method: string,
    path: string,
    body?: unknown,
    signal?: AbortSignal,
    authenticated = true,
  ): Promise<unknown> {
    const response = await this.request(
      method,
      path,
      body === undefined ? undefined : JSON.stringify(body),
      signal,
      body === undefined ? undefined : 'application/json',
      undefined,
      authenticated,
    )
    try {
      return await response.json()
    } catch {
      throw new ProtocolError('invalid-response', 'The server sent a response that is not JSON.', response.status)
    }
  }

  private async request(
    method: string,
    path: string,
    body: BodyInit | undefined,
    signal: AbortSignal | undefined,
    contentType?: string,
    extra?: Record<string, string>,
    authenticated = true,
  ): Promise<Response> {
    const headers: Record<string, string> = { 'X-Crystal-Client': this.options.clientId, ...extra }
    if (contentType) headers['Content-Type'] = contentType
    if (authenticated && this.options.token) headers.Authorization = `Bearer ${this.options.token}`

    const init: RequestInitWithSpace = { method, headers, body, signal, mode: 'cors', credentials: 'omit', cache: 'no-store' }
    if (this.options.targetAddressSpace) init.targetAddressSpace = this.options.targetAddressSpace

    let response: Response
    try {
      response = await this.fetcher(this.options.baseUrl + path, init)
    } catch (error) {
      if (isAbort(error)) throw new ProtocolError('aborted', 'The request was cancelled.')
      throw new ProtocolError('network', 'The server could not be reached.')
    }

    if (!response.ok) throw await problem(response)
    return response
  }
}

async function problem(response: Response): Promise<ProtocolError> {
  let detail = ''
  try {
    const body = asObject(await response.json())
    detail = str(body.detail) || str(body.title)
  } catch {
    // A proxy in front of the server may answer with HTML or nothing.
  }

  const retry = Number.parseInt(response.headers.get('Retry-After') ?? '', 10)
  return new ProtocolError(
    kindForStatus(response.status),
    detail || `The server answered ${response.status}.`,
    response.status,
    Number.isFinite(retry) ? retry : null,
  )
}

function fileNameFrom(header: string | null): string | null {
  if (!header) return null
  const match = /filename="([^"]+)"/.exec(header)
  const name = match?.[1]
  // A name from the server is shown, never used as a path.
  return name ? name.replace(/[\\/]/g, '_') : null
}
