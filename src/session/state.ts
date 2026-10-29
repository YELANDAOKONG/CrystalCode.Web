import { arr, asObject, bool, num, optNum, optStr, str } from '@/protocol/json'
import {
  parseChild,
  parseChrome,
  parseCommands,
  parseInteraction,
  parseItems,
  parseOptions,
  parsePreferences,
  parseSide,
  parseStatusFields,
  parseTodos,
  parseToolCall,
  parseUsage,
} from '@/protocol/parse'
import type {
  ChildSummary,
  Chrome,
  ConversationItem,
  Interaction,
  LastTurn,
  LiveRound,
  Preferences,
  ServerEvent,
  SessionOption,
  Side,
  SlashCommand,
  Snapshot,
  StatusField,
  Todo,
  ToolCall,
  Usage,
} from '@/protocol/types'
import { isChildActive, type ChildTrace } from './child-trace'
import { isActivityStep, sameStep, stepForActivity, stepFromSnapshot, type Step } from './progress'
import { RoundAssembler, toolResultItems, withIssuedCalls } from './round'

/** A note, error, or report that answers one request. Reports are not session state. */
export interface Notice {
  seq: number
  /**
   * Where it belongs in the conversation: the number of items before it. Null
   * while a model round is still streaming; it takes its place when that round
   * is committed, so a note never lands in the middle of a reply.
   */
  at: number | null
  kind: 'note' | 'error' | 'report'
  /** For a report, the event type such as `report.status`. */
  type: string
  text: string
  data: Record<string, unknown>
  time: string
}

export interface ServerStatus {
  state: string
  error: string | null
  closing: { reason: string | null; saved: boolean | null; sessionId: string | null } | null
}

/**
 * Applies a snapshot and the events that follow it. Mirrors the engine's
 * `SessionState` so a reconnect draws the same thing a live stream would.
 * Child events are folded into the child list and never into the parent
 * conversation, because a child event carries `source`.
 */
export class SessionModel {
  sessionId: string | null = null
  /** False until the first snapshot has been applied. */
  loaded = false
  lastSeq = 0
  server: ServerStatus = { state: 'starting', error: null, closing: null }
  chrome: Chrome | null = null
  preferences: Preferences | null = null
  commands: SlashCommand[] = []
  /** From `options.changed` or `GET /options`. Not part of the snapshot. */
  options: SessionOption[] = []
  promptHistory: string[] = []
  conversation: ConversationItem[] = []
  live: LiveRound | null = null
  turnActive = false
  activity = 'idle'
  /** What the main session is doing now, for the progress row. Null when idle. */
  step: Step | null = null
  queue: string[] = []
  todos: Todo[] = []
  statusFields: StatusField[] = []
  usage: Usage | null = null
  cumulativeUsage: Usage | null = null
  contextWindow = 0
  estimatedContextTokens: number | null = null
  side: Side = parseSide({})
  children: ChildSummary[] = []
  lastTurn: LastTurn | null = null
  interactions: Interaction[] = []
  notices: Notice[] = []
  /** The `/stats` page. It is a window of its own, not part of the conversation. */
  statsPage: { seq: number; data: Record<string, unknown> } | null = null
  /** Set by `message.recalled`: the text the composer should take back. */
  recalledDraft: { seq: number; text: string } | null = null

  /** What each running child has done since this page started watching, by child id. */
  childTraces = new Map<string, ChildTrace>()

  private round = new RoundAssembler()
  private childRounds = new Map<string, RoundAssembler>()

  /** Replaces everything with a snapshot. Notices are kept: they are not in a snapshot. */
  loadSnapshot(snapshot: Snapshot): void {
    this.sessionId = snapshot.sessionId
    this.loaded = true
    this.lastSeq = snapshot.lastSeq
    this.server = { state: snapshot.state, error: this.server.error, closing: this.server.closing }
    this.chrome = snapshot.chrome
    this.preferences = snapshot.preferences
    this.commands = snapshot.commands
    this.promptHistory = snapshot.promptHistory
    this.conversation = snapshot.conversation
    this.turnActive = snapshot.turnActive
    this.activity = snapshot.activity
    this.step = stepFromSnapshot(snapshot.activity, snapshot.turnActive, snapshot.live)
    this.queue = snapshot.queue
    this.todos = snapshot.todos
    this.statusFields = snapshot.statusFields
    this.usage = snapshot.usage
    this.cumulativeUsage = snapshot.cumulativeUsage
    this.contextWindow = snapshot.contextWindow
    this.estimatedContextTokens = snapshot.estimatedContextTokens
    this.side = snapshot.side
    this.children = snapshot.children
    // Events may have been missed, so a trace built before the snapshot cannot
    // be trusted. Running children start a new, incomplete trace on their next event.
    this.childTraces = new Map()
    this.childRounds = new Map()
    this.lastTurn = snapshot.lastTurn
    this.interactions = snapshot.interactions
    this.loadLive(snapshot.live)
  }

  /** Applies one event. Returns false when it was already applied or skipped. */
  apply(event: ServerEvent): boolean {
    if (event.seq <= this.lastSeq) return false
    this.lastSeq = event.seq
    if (event.sessionId !== null) this.sessionId = event.sessionId

    // Child events fold into the child list; they never touch the parent view.
    if (event.source !== null) {
      this.applyChild(event)
      return true
    }

    const d = event.data
    switch (event.type) {
      case 'session.started':
      case 'chrome.changed': {
        const chrome = parseChrome(d.chrome)
        if (chrome) {
          this.chrome = chrome
          this.contextWindow = chrome.contextWindow
          if (event.type === 'chrome.changed' && !chrome.agentsEnabled) this.clearChildren()
        }

        break
      }
      case 'preferences.changed':
        this.preferences = parsePreferences(d.preferences)
        break
      case 'status-fields.changed':
        this.statusFields = parseStatusFields(d.fields)
        break
      case 'options.changed':
        this.options = parseOptions(d.options)
        break
      case 'commands.changed':
        this.commands = parseCommands(d.commands)
        break
      case 'prompt-history.loaded':
        this.promptHistory = arr(d.entries).filter((e): e is string => typeof e === 'string')
        break
      case 'activity.changed': {
        this.activity = str(d.activity, 'idle')
        const next = stepForActivity(this.activity)
        // Idle ends a step only an activity event can set. A stream step is
        // replaced by the next delta, so leave it alone.
        if (next) this.setStep(next)
        else if (isActivityStep(this.step)) this.setStep(this.turnActive ? { kind: 'waiting' } : null)
        break
      }
      case 'queue.changed':
        this.queue = arr(d.items).filter((e): e is string => typeof e === 'string')
        break
      case 'todos.changed':
        this.todos = parseTodos(d.items)
        break
      case 'side.changed':
        this.side = parseSide(d.side)
        break
      case 'usage.changed':
        this.usage = parseUsage(d.usage)
        this.cumulativeUsage = parseUsage(d.cumulativeUsage)
        this.contextWindow = num(d.contextWindow, this.contextWindow)
        if (!bool(d.interim)) this.estimatedContextTokens = null
        break
      case 'context.estimated':
        this.estimatedContextTokens = optNum(d.tokens)
        break
      case 'message.sent':
        this.conversation = [
          ...this.conversation,
          { kind: 'message', role: 'user', text: str(d.text), images: numbers(d.images) },
        ]
        break
      case 'message.recalled':
        this.removeRecalled(str(d.text))
        this.recalledDraft = { seq: event.seq, text: str(d.draft) }
        break
      case 'turn.started':
        this.turnActive = true
        this.resetRound(true)
        this.setStep({ kind: 'waiting' })
        break
      case 'turn.finished': {
        this.turnActive = false
        this.commitRound()
        this.round.reset(false)
        this.live = null
        this.setStep(null)
        this.lastTurn = { reason: str(d.reason), modelCalls: num(d.modelCalls), toolCalls: num(d.toolCalls) }
        this.usage = parseUsage(d.usage)
        this.cumulativeUsage = parseUsage(d.cumulativeUsage)
        this.contextWindow = num(d.contextWindow, this.contextWindow)
        break
      }
      case 'round.closed':
        this.commitRound()
        this.resetRound(this.turnActive)
        break
      case 'retry.scheduled':
        this.round.retry()
        this.refreshLive()
        this.setStep({ kind: 'retrying', attempt: num(d.attempt), until: Date.now() + num(d.delayMilliseconds) })
        break
      case 'tools.called': {
        const calls = arr(d.calls).map(parseToolCall)
        this.addCalls(calls)
        const first = calls[0]
        if (first) this.setStep({ kind: 'running', name: first.name })
        break
      }
      case 'tools.results':
        this.conversation = [...this.conversation, ...toolResultItems(d)]
        this.setStep({ kind: 'waiting' })
        break
      case 'approval.reviewing':
        this.setStep({ kind: 'reviewing', extended: str(d.stage) === 'extended' })
        break
      case 'approval.passed': {
        const name = str(asObject(d.call).name)
        if (name) this.setStep({ kind: 'running', name })
        break
      }
      case 'conversation.cleared':
        this.conversation = []
        this.notices = []
        this.statsPage = null
        this.clearChildren()
        this.round.reset(false)
        this.live = null
        this.setStep(null)
        this.lastTurn = null
        break
      case 'conversation.replayed':
        this.conversation = parseItems(d.items)
        this.notices = []
        this.clearChildren()
        this.round.reset(false)
        this.live = null
        this.setStep(null)
        break
      case 'child.changed':
        this.upsertChild(parseChild(d.child), str(d.invocationId))
        break
      case 'stream.text':
      case 'stream.reasoning':
      case 'stream.tool-call':
        this.applyStream(event.type, d)
        break
      case 'note':
      case 'error':
        this.pushNotice(event, event.type, str(d.text))
        break
      case 'interaction.opened': {
        const interaction = parseInteraction(d.interaction)
        this.interactions = [...this.interactions.filter((i) => i.id !== interaction.id), interaction]
        break
      }
      case 'interaction.resolved':
      case 'interaction.cancelled':
        this.interactions = this.interactions.filter((i) => i.id !== str(d.id))
        break
      case 'server.state':
        this.server = { ...this.server, state: str(d.state), error: optStr(d.error) }
        break
      case 'server.closing':
        this.server = {
          ...this.server,
          state: 'closing',
          closing: { reason: optStr(d.reason), saved: typeof d.saved === 'boolean' ? d.saved : null, sessionId: optStr(d.sessionId) },
        }
        break
      default:
        if (event.type === 'report.stats') {
          this.statsPage = { seq: event.seq, data: event.data }
        } else if (event.type.startsWith('report.')) {
          this.pushNotice(event, 'report', '')
        }

        // Anything else is an event this build does not know. Ignore it.
        break
    }

    return true
  }

  clearNotices(): void {
    this.notices = []
  }

  dismissStats(): void {
    this.statsPage = null
  }

  // --- internals -----------------------------------------------------------

  private pushNotice(event: ServerEvent, kind: Notice['kind'], text: string): void {
    const streaming = this.round.streaming
    this.notices = [
      ...this.notices.slice(-199),
      {
        seq: event.seq,
        at: streaming ? null : this.conversation.length,
        kind,
        type: event.type,
        text,
        data: event.data,
        time: event.time,
      },
    ]
  }

  private applyChild(event: ServerEvent): void {
    const source = event.source
    if (!source) return
    this.foldChildTrace(source.childSessionId, source.invocationId, event)

    const index = this.children.findIndex((c) => c.id === source.childSessionId)
    const child = this.children[index]
    if (!child) return
    const d = event.data
    let next = child
    if (event.type === 'usage.changed') {
      next = { ...child, usage: parseUsage(d.usage), cumulativeUsage: parseUsage(d.cumulativeUsage) }
    } else if (event.type === 'todos.changed') {
      next = { ...child, todos: parseTodos(d.items) }
    } else if (event.type === 'child.changed') {
      next = parseChild(d.child)
    }

    if (next !== child) this.children = this.children.map((c, i) => (i === index ? next : c))
  }

  /**
   * Folds a child's stream, tool, and error events into its trace. The server
   * saves a child's archive only when an invocation starts and settles, so
   * this is the only way to show what a running child is doing.
   */
  private foldChildTrace(id: string, invocationId: string, event: ServerEvent): void {
    const d = event.data
    let trace = this.childTraces.get(id)
    if (!trace || trace.invocationId !== invocationId) {
      trace = this.startTrace(id, invocationId, false)
    }

    const round = this.childRounds.get(id) ?? new RoundAssembler()
    this.childRounds.set(id, round)
    let next: ChildTrace | null = null
    switch (event.type) {
      case 'stream.text':
      case 'stream.reasoning':
      case 'stream.tool-call':
        if (round.apply(event.type, d)) next = { ...trace, live: round.live() }
        break
      case 'retry.scheduled':
        round.retry()
        next = { ...trace, live: round.live() }
        break
      case 'round.closed':
        next = { ...trace, items: [...trace.items, ...round.commit()], live: null }
        round.reset(false)
        break
      case 'tools.called':
        next = { ...trace, items: withIssuedCalls(trace.items, arr(d.calls).map(parseToolCall)) }
        break
      case 'tools.results':
        next = { ...trace, items: [...trace.items, ...toolResultItems(d)] }
        break
      case 'error':
        next = { ...trace, errors: [...trace.errors.slice(-19), str(d.text)] }
        break
      default:
        break
    }

    if (next) this.setTrace(id, next)
  }

  private startTrace(id: string, invocationId: string, complete: boolean): ChildTrace {
    this.childRounds.set(id, new RoundAssembler())
    const trace: ChildTrace = { invocationId, items: [], live: null, errors: [], complete, settled: false }
    this.setTrace(id, trace)
    return trace
  }

  private setTrace(id: string, trace: ChildTrace): void {
    const next = new Map(this.childTraces)
    next.set(id, trace)
    this.childTraces = next
  }

  /** The sheet calls this once it holds the saved archive, which covers the trace. */
  dropChildTrace(id: string): void {
    if (!this.childTraces.has(id)) return
    const next = new Map(this.childTraces)
    next.delete(id)
    this.childTraces = next
    this.childRounds.delete(id)
  }

  private clearChildren(): void {
    this.children = []
    this.childTraces = new Map()
    this.childRounds = new Map()
  }

  private upsertChild(child: ChildSummary, invocationId: string): void {
    this.followTrace(child, invocationId)
    const index = this.children.findIndex((c) => c.id === child.id)
    if (index < 0) {
      this.children = [...this.children, child]
      return
    }

    const known = this.children[index]
    // While a child runs, its usage and todos come from live events. A saved
    // copy would put them back to the last settled values.
    const merged =
      known && isChildActive(child.status)
        ? { ...child, usage: known.usage, cumulativeUsage: known.cumulativeUsage, todos: known.todos }
        : child
    this.children = this.children.map((c, i) => (i === index ? merged : c))
  }

  /** An invocation that starts here is watched from its first event; one that ends is sealed. */
  private followTrace(child: ChildSummary, invocationId: string): void {
    const trace = this.childTraces.get(child.id)
    if (isChildActive(child.status)) {
      if (!trace || trace.invocationId !== invocationId) this.startTrace(child.id, invocationId, true)
      return
    }

    if (!trace || trace.settled) return
    const round = this.childRounds.get(child.id)
    this.setTrace(child.id, {
      ...trace,
      items: [...trace.items, ...(round?.commit() ?? [])],
      live: null,
      settled: true,
    })
    round?.reset(false)
    this.trimSettledTraces()
  }

  /** Traces of children nobody opened would otherwise stay until the session is cleared. */
  private trimSettledTraces(): void {
    const settled = [...this.childTraces.entries()].filter(([, trace]) => trace.settled)
    if (settled.length <= 8) return
    const next = new Map(this.childTraces)
    for (const [id] of settled.slice(0, settled.length - 8)) {
      next.delete(id)
      this.childRounds.delete(id)
    }

    this.childTraces = next
  }

  private applyStream(type: string, d: Record<string, unknown>): void {
    if (!this.round.apply(type, d)) return
    this.refreshLive()
    if (type === 'stream.reasoning') {
      this.setStep({ kind: 'thinking' })
    } else if (type === 'stream.text') {
      this.setStep({ kind: 'writing' })
    } else {
      // The name arrives in pieces; show the call once it has one.
      const name = this.round.callName(num(d.item))
      if (name) this.setStep({ kind: 'calling', name })
    }
  }

  /** Streams touch this on every token, so an unchanged step must not re-render the page. */
  private setStep(next: Step | null): void {
    if (!sameStep(this.step, next)) this.step = next
  }

  private refreshLive(): void {
    this.live = this.round.live()
  }

  private loadLive(live: LiveRound | null): void {
    this.round.load(live)
    this.live = live
  }

  private resetRound(active: boolean): void {
    this.round.reset(active)
    this.refreshLive()
  }

  private commitRound(): void {
    const items = this.round.commit()
    if (items.length > 0) this.conversation = [...this.conversation, ...items]
    if (this.notices.some((notice) => notice.at === null)) {
      const placed = this.conversation.length
      this.notices = this.notices.map((notice) => (notice.at === null ? { ...notice, at: placed } : notice))
    }
  }

  private addCalls(calls: ToolCall[]): void {
    this.conversation = withIssuedCalls(this.conversation, calls)
  }

  private removeRecalled(text: string): void {
    for (let i = this.conversation.length - 1; i >= 0; i--) {
      const item = this.conversation[i]
      if (item && item.kind === 'message' && item.role === 'user' && item.text === text) {
        this.conversation = this.conversation.filter((_, index) => index !== i)
        return
      }
    }
  }
}

function numbers(value: unknown): number[] {
  return arr(value).filter((item): item is number => typeof item === 'number')
}
