import { computed, ref, shallowReactive, shallowRef } from 'vue'
import { baseUrl } from '@/connection/address'
import { advise, type Advisory } from '@/connection/advisory'
import { newClientId, newRequestId } from '@/connection/clientId'
import { diagnose, type Diagnosis } from '@/connection/diagnosis'
import { inspectAddress, pageContext } from '@/connection/page'
import {
  clearTabToken,
  loadServers,
  loadTabToken,
  saveServer,
  saveTabToken,
  forgetServer,
  type SavedServer,
} from '@/connection/storage'
import { CrystalClient } from '@/protocol/client'
import { ProtocolError, isAbort } from '@/protocol/errors'
import type {
  ChildSummary,
  IssuedToken,
  QuickPromptCatalog,
  Scope,
  ServerEvent,
  ServerInfo,
} from '@/protocol/types'
import { SessionModel } from '@/session/state'
import type { AddressError, ServerAddress } from '@/connection/address'

// The composition root. It owns the one connection to the one server and ties
// `connection`, `protocol`, and `session` together. Components read state from
// here and call actions here; none of them touches `fetch`.

export type Phase = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'failed' | 'closed'

export interface ConnectRequest {
  input: string
  token: string
  /** Keep the token in this tab's sessionStorage. It never goes to localStorage. */
  keepTokenInTab: boolean
  remember: boolean
  /** Set only when the operator says where a host name lives. */
  addressSpace: 'local' | 'loopback' | null
}

export type FormError = { kind: 'address'; error: AddressError }

export interface Problem {
  id: number
  error: unknown
}

const SILENCE_LIMIT_MS = 45_000
const BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 15_000]
const FATAL_KINDS = new Set(['unauthorized', 'forbidden', 'host'])
const SCOPE_RANK: Record<Scope, number> = { observe: 0, operate: 1, admin: 2 }

function createServer() {
  const model = shallowReactive(new SessionModel())
  const phase = ref<Phase>('idle')
  const info = shallowRef<ServerInfo | null>(null)
  const diagnosis = shallowRef<Diagnosis | null>(null)
  const formError = shallowRef<FormError | null>(null)
  const advisory = shallowRef<Advisory | null>(null)
  const target = shallowRef<{ address: ServerAddress; url: string } | null>(null)
  const savedServers = ref<SavedServer[]>(loadServers())
  const problem = shallowRef<Problem | null>(null)
  /** Seconds until the next reconnect attempt, for display. */
  const retryIn = ref<number | null>(null)
  const waitingState = ref<string | null>(null)

  let client: CrystalClient | null = null
  let run: AbortController | null = null
  let problemId = 0
  let refreshing = false
  const clientId = newClientId()

  const scope = computed<Scope>(() => info.value?.scope ?? 'observe')
  const canOperate = computed(() => SCOPE_RANK[scope.value] >= SCOPE_RANK.operate)
  const isAdmin = computed(() => SCOPE_RANK[scope.value] >= SCOPE_RANK.admin)

  function can(operation: string): boolean {
    return info.value?.operations.includes(operation) ?? false
  }

  function report(error: unknown): void {
    if (error instanceof ProtocolError && error.kind === 'aborted') return
    problem.value = { id: ++problemId, error }
  }

  // --- connecting ----------------------------------------------------------

  function startingToken(url: string, typed: string): string {
    return typed !== '' ? typed : (loadTabToken(url) ?? '')
  }

  async function connect(request: ConnectRequest): Promise<void> {
    disconnect()
    formError.value = null
    diagnosis.value = null

    const inspected = inspectAddress(request.input)
    if (!inspected.result.ok) {
      formError.value = { kind: 'address', error: inspected.result.error }
      return
    }

    const address = inspected.result.address
    const url = baseUrl(address)
    const token = startingToken(url, request.token.trim())
    advisory.value = inspected.advisory ?? advise(pageContext(), address)
    target.value = { address, url }

    client = new CrystalClient({
      baseUrl: url,
      token: token === '' ? null : token,
      clientId,
      targetAddressSpace: request.addressSpace ?? undefined,
    })

    run = new AbortController()
    phase.value = 'connecting'
    const signal = run.signal
    const current = client

    try {
      // Health and info do not depend on each other, so ask together and save a
      // round trip. Health is read first so its failure is the one reported.
      const infoRequest = current.info(signal)
      infoRequest.catch(() => {})
      await current.health(signal)
      info.value = await infoRequest
    } catch (error) {
      if (signal.aborted) return
      fail(error, address)
      return
    }

    // The handshake proved the address and the token. From here the session
    // view takes over, even when the server still waits for the operator to
    // trust the workspace: that question is answered inside the view.
    if (request.keepTokenInTab && token !== '') saveTabToken(url, token)
    else clearTabToken(url)
    if (request.remember) {
      savedServers.value = saveServer({
        url,
        label: '',
        addressSpace: request.addressSpace,
        lastUsed: Date.now(),
      })
    }

    phase.value = 'live'
    try {
      await loadWhenReady(current, signal)
    } catch (error) {
      if (signal.aborted) return
      fail(error, address)
      return
    }

    void keepStreaming(current, signal, address)
  }

  function fail(error: unknown, address: ServerAddress): void {
    diagnosis.value = diagnose(error, advisory.value ?? advise(pageContext(), address), address.scheme)
    phase.value = 'failed'
    client = null
    run?.abort()
    run = null
  }

  async function loadWhenReady(c: CrystalClient, signal: AbortSignal): Promise<void> {
    for (;;) {
      const current = info.value
      if (current && current.state !== 'ready') {
        waitingState.value = current.state
        model.server = { state: current.state, error: current.error, closing: null }
        if (current.state === 'failed') throw new ProtocolError('server', current.error ?? 'The server failed to start.')
        try {
          model.interactions = await c.interactions(signal)
        } catch (error) {
          if (!(error instanceof ProtocolError) || error.kind !== 'not-ready') throw error
        }

        await sleep(2_000, signal)
        info.value = await c.info(signal)
        continue
      }

      waitingState.value = null
      try {
        model.loadSnapshot(await c.snapshot(signal))
        return
      } catch (error) {
        if (!(error instanceof ProtocolError) || error.kind !== 'not-ready') throw error
        // The state changed between info and snapshot. Ask again.
        info.value = await c.info(signal)
      }
    }
  }

  async function keepStreaming(c: CrystalClient, signal: AbortSignal, address: ServerAddress): Promise<void> {
    let attempt = 0
    let needSnapshot = false
    for (;;) {
      if (signal.aborted) return
      let resync = false
      const inner = new AbortController()
      const relay = () => inner.abort()
      signal.addEventListener('abort', relay, { once: true })
      let timer: ReturnType<typeof setTimeout> | undefined
      const arm = () => {
        clearTimeout(timer)
        timer = setTimeout(() => {
          inner.abort()
        }, SILENCE_LIMIT_MS)
      }

      try {
        if (needSnapshot) {
          info.value = await c.info(signal)
          await loadWhenReady(c, signal)
          needSnapshot = false
        }

        arm()
        await c.stream(
          model.lastSeq,
          {
            onOpen: () => {
              attempt = 0
              retryIn.value = null
              phase.value = 'live'
            },
            onActivity: arm,
            onEvent: (event) => handleEvent(event, c, signal),
            onResync: () => {
              resync = true
            },
          },
          inner.signal,
        )
      } catch (error) {
        if (signal.aborted) return
        if (error instanceof ProtocolError && FATAL_KINDS.has(error.kind)) {
          fail(error, address)
          return
        }

        needSnapshot = needSnapshot || (error instanceof ProtocolError && error.kind === 'not-ready')
      } finally {
        clearTimeout(timer)
        signal.removeEventListener('abort', relay)
      }

      if (signal.aborted) return
      if (model.server.state === 'closing') {
        phase.value = 'closed'
        return
      }

      if (resync) {
        needSnapshot = true
        continue
      }

      // The stream ended or failed. A server that restarted has a new session
      // id and a fresh counter, so look before resuming from an old cursor.
      try {
        const fresh = await c.info(signal)
        if (fresh.sessionId !== model.sessionId || fresh.state !== 'ready') {
          info.value = fresh
          needSnapshot = true
        }
      } catch (error) {
        if (signal.aborted) return
        if (error instanceof ProtocolError && FATAL_KINDS.has(error.kind)) {
          fail(error, address)
          return
        }
      }

      phase.value = 'reconnecting'
      const delay = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)] ?? 15_000
      attempt += 1
      retryIn.value = Math.round(delay / 1000)
      try {
        await sleep(delay, signal)
      } catch {
        return
      }
    }
  }

  function handleEvent(event: ServerEvent, c: CrystalClient, signal: AbortSignal): void {
    if (!model.apply(event)) return
    if (event.type === 'conversation.cleared' || event.type === 'conversation.replayed') {
      void refreshSnapshot(c, signal)
    }
  }

  // Redraws from a snapshot after /clear, /resume, or /fork, so chrome, todos,
  // and usage match what the engine holds.
  async function refreshSnapshot(c: CrystalClient, signal: AbortSignal): Promise<void> {
    if (refreshing) return
    refreshing = true
    try {
      model.loadSnapshot(await c.snapshot(signal))
    } catch (error) {
      if (!isAbort(error)) report(error)
    } finally {
      refreshing = false
    }
  }

  function disconnect(): void {
    run?.abort()
    run = null
    client = null
    phase.value = 'idle'
    info.value = null
    retryIn.value = null
    waitingState.value = null
    Object.assign(model, new SessionModel())
  }

  function forget(url: string): void {
    savedServers.value = forgetServer(url)
  }

  // --- actions -------------------------------------------------------------

  async function act<T>(task: (c: CrystalClient) => Promise<T>): Promise<T | undefined> {
    const c = client
    if (!c) return undefined
    try {
      return await task(c)
    } catch (error) {
      report(error)
      return undefined
    }
  }

  const send = (text: string) => act((c) => c.input(text, newRequestId()))
  const interrupt = () => act((c) => c.interrupt())
  const recall = () => act((c) => c.recall())
  const setMode = (action: 'cycle' | 'toggle-plan' | 'set', name?: string) =>
    act((c) => c.setMode(action, name, newRequestId()))
  const setVerbose = (targetName: string, enabled: boolean) =>
    act((c) => c.setVerbose(targetName, enabled, newRequestId()))
  const sendQuickPrompt = (name: string) => act((c) => c.sendQuickPrompt(name, newRequestId()))
  const cancelSide = () => act((c) => c.cancelSide())
  const clearSide = () => act((c) => c.clearSide(newRequestId()))
  async function answer(id: string, body: unknown): Promise<boolean> {
    const done = await act(async (c) => {
      await c.answer(id, body)
      return true
    })
    // While the server is not ready there is no stream to report the
    // resolution, so drop the question here.
    if (done) model.interactions = model.interactions.filter((item) => item.id !== id)
    return done === true
  }
  const uploadImage = (blob: Blob) => act((c) => c.uploadImage(blob, newRequestId()))
  const loadImage = (number: number) => act((c) => c.image(number))
  const loadChild = (id: string): Promise<ChildSummary | undefined> => act((c) => c.child(id))
  const loadQuickPrompts = (): Promise<QuickPromptCatalog | undefined> => act((c) => c.quickPrompts())
  const listTokens = (): Promise<IssuedToken[] | undefined> => act((c) => c.listTokens())
  const issueToken = (tokenScope: Scope, label: string | null) => act((c) => c.issueToken(tokenScope, label))
  const revokeToken = (id: string) => act((c) => c.revokeToken(id))
  const shutdown = () => act((c) => c.shutdown())
  const exportSession = (format: 'markdown' | 'json', includeSystem: boolean) =>
    act((c) => c.export(format, includeSystem))

  /** The draft only matters for image bookkeeping on the server, so failures stay quiet. */
  async function syncDraft(text: string): Promise<void> {
    const c = client
    if (!c || !canOperate.value || !can('PUT /draft')) return
    try {
      await c.draft(text, newRequestId())
    } catch {
      // A missed draft update loses nothing the next one does not restore.
    }
  }

  return {
    model,
    phase,
    info,
    diagnosis,
    formError,
    advisory,
    target,
    savedServers,
    problem,
    retryIn,
    waitingState,
    scope,
    canOperate,
    isAdmin,
    can,
    connect,
    disconnect,
    forget,
    send,
    interrupt,
    recall,
    setMode,
    setVerbose,
    sendQuickPrompt,
    cancelSide,
    clearSide,
    answer,
    uploadImage,
    loadImage,
    loadChild,
    loadQuickPrompts,
    listTokens,
    issueToken,
    revokeToken,
    shutdown,
    exportSession,
    syncDraft,
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }

    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export const server = createServer()
export type Server = typeof server
