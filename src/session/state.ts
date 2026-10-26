import { arr, asObject, bool, num, optNum, optStr, str } from '@/protocol/json'
import {
  parseChild,
  parseChrome,
  parseCommands,
  parseInteraction,
  parseItems,
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
  Side,
  SlashCommand,
  Snapshot,
  StatusField,
  Todo,
  ToolCall,
  Usage,
} from '@/protocol/types'

/** A note, error, or report that answers one request. Reports are not session state. */
export interface Notice {
  seq: number
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

interface RoundCall {
  id: string
  name: string
  arguments: string
  kind: string
}

/**
 * Applies a snapshot and the events that follow it. Mirrors the engine's
 * `SessionState` so a reconnect draws the same thing a live stream would.
 * Child events are folded into the child list and never into the parent
 * conversation, because a child event carries `source`.
 */
export class SessionModel {
  sessionId: string | null = null
  lastSeq = 0
  server: ServerStatus = { state: 'starting', error: null, closing: null }
  chrome: Chrome | null = null
  preferences: Preferences | null = null
  commands: SlashCommand[] = []
  promptHistory: string[] = []
  conversation: ConversationItem[] = []
  live: LiveRound | null = null
  turnActive = false
  activity = 'idle'
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
  /** Set by `message.recalled`: the text the composer should take back. */
  recalledDraft: { seq: number; text: string } | null = null

  private roundText = ''
  private roundReasoning = ''
  private roundCalls = new Map<number, RoundCall>()
  private roundRetries = 0
  private hasRound = false

  /** Replaces everything with a snapshot. Notices are kept: they are not in a snapshot. */
  loadSnapshot(snapshot: Snapshot): void {
    this.sessionId = snapshot.sessionId
    this.lastSeq = snapshot.lastSeq
    this.server = { state: snapshot.state, error: this.server.error, closing: this.server.closing }
    this.chrome = snapshot.chrome
    this.preferences = snapshot.preferences
    this.commands = snapshot.commands
    this.promptHistory = snapshot.promptHistory
    this.conversation = snapshot.conversation
    this.turnActive = snapshot.turnActive
    this.activity = snapshot.activity
    this.queue = snapshot.queue
    this.todos = snapshot.todos
    this.statusFields = snapshot.statusFields
    this.usage = snapshot.usage
    this.cumulativeUsage = snapshot.cumulativeUsage
    this.contextWindow = snapshot.contextWindow
    this.estimatedContextTokens = snapshot.estimatedContextTokens
    this.side = snapshot.side
    this.children = snapshot.children
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
          if (event.type === 'chrome.changed' && !chrome.agentsEnabled) this.children = []
        }

        break
      }
      case 'preferences.changed':
        this.preferences = parsePreferences(d.preferences)
        break
      case 'status-fields.changed':
        this.statusFields = parseStatusFields(d.fields)
        break
      case 'commands.changed':
        this.commands = parseCommands(d.commands)
        break
      case 'prompt-history.loaded':
        this.promptHistory = arr(d.entries).filter((e): e is string => typeof e === 'string')
        break
      case 'activity.changed':
        this.activity = str(d.activity, 'idle')
        break
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
        break
      case 'turn.finished': {
        this.turnActive = false
        this.commitRound()
        this.hasRound = false
        this.live = null
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
        this.roundText = ''
        this.roundReasoning = ''
        this.roundCalls = new Map()
        this.roundRetries += 1
        this.hasRound = true
        this.refreshLive()
        break
      case 'tools.called':
        this.addCalls(arr(d.calls).map(parseToolCall))
        break
      case 'tools.results': {
        const results = arr(d.results).map((r) => {
          const o = asObject(r)
          return {
            kind: 'tool_result' as const,
            callId: str(o.callId),
            status: str(o.status),
            text: str(o.text),
            images: numbers(o.images),
          }
        })
        this.conversation = [...this.conversation, ...results]
        break
      }
      case 'conversation.cleared':
        this.conversation = []
        this.children = []
        this.hasRound = false
        this.live = null
        this.lastTurn = null
        break
      case 'conversation.replayed':
        this.conversation = parseItems(d.items)
        this.children = []
        this.hasRound = false
        this.live = null
        break
      case 'child.changed':
        this.upsertChild(parseChild(d.child))
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
        if (event.type.startsWith('report.')) {
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

  // --- internals -----------------------------------------------------------

  private pushNotice(event: ServerEvent, kind: Notice['kind'], text: string): void {
    this.notices = [
      ...this.notices.slice(-199),
      { seq: event.seq, kind, type: event.type, text, data: event.data, time: event.time },
    ]
  }

  private applyChild(event: ServerEvent): void {
    const index = this.children.findIndex((c) => c.id === event.source?.childSessionId)
    if (index < 0) return
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

  private upsertChild(child: ChildSummary): void {
    const index = this.children.findIndex((c) => c.id === child.id)
    if (index < 0) {
      this.children = [...this.children, child]
      return
    }

    const known = this.children[index]
    // While a child runs, its usage and todos come from live events. A saved
    // copy would put them back to the last settled values.
    const active = child.status === 'running' || child.status === 'queued'
    const merged =
      known && active
        ? { ...child, usage: known.usage, cumulativeUsage: known.cumulativeUsage, todos: known.todos }
        : child
    this.children = this.children.map((c, i) => (i === index ? merged : c))
  }

  private applyStream(type: string, d: Record<string, unknown>): void {
    // The engine assembles candidate 0 only.
    if (num(d.candidate) !== 0) return
    this.hasRound = true
    if (type === 'stream.text') {
      this.roundText += str(d.delta)
    } else if (type === 'stream.reasoning') {
      this.roundReasoning += str(d.delta)
    } else {
      const item = num(d.item)
      const call = this.roundCalls.get(item) ?? { id: '', name: '', arguments: '', kind: str(d.inputKind, 'json') }
      call.id += str(d.callIdDelta)
      call.name += str(d.nameDelta)
      call.arguments += str(d.argumentsDelta)
      this.roundCalls.set(item, call)
    }

    this.refreshLive()
  }

  private roundToolCalls(): ToolCall[] {
    return [...this.roundCalls.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, call]) => call)
      .filter((call) => call.id.length > 0 && call.name.length > 0)
      .map((call) => ({ callId: call.id, name: call.name, arguments: call.arguments, inputKind: call.kind }))
  }

  private refreshLive(): void {
    this.live = this.hasRound
      ? { text: this.roundText, reasoning: this.roundReasoning, toolCalls: this.roundToolCalls(), retries: this.roundRetries }
      : null
  }

  private loadLive(live: LiveRound | null): void {
    this.roundCalls = new Map()
    this.roundText = live?.text ?? ''
    this.roundReasoning = live?.reasoning ?? ''
    this.roundRetries = live?.retries ?? 0
    this.hasRound = live !== null
    // A snapshot has whole tool calls, not deltas. Keep them in item order so
    // later argument deltas for the same item extend them.
    live?.toolCalls.forEach((call, index) => {
      this.roundCalls.set(index, { id: call.callId, name: call.name, arguments: call.arguments, kind: call.inputKind })
    })
    this.live = live
  }

  private resetRound(active: boolean): void {
    this.roundText = ''
    this.roundReasoning = ''
    this.roundCalls = new Map()
    this.roundRetries = 0
    this.hasRound = active
    this.refreshLive()
  }

  private commitRound(): void {
    if (!this.hasRound) return
    const items: ConversationItem[] = []
    if (this.roundReasoning.length > 0) {
      items.push({ kind: 'reasoning', segments: [{ kind: 'trace', text: this.roundReasoning }], hasState: false })
    }

    if (this.roundText.length > 0) {
      items.push({ kind: 'message', role: 'assistant', text: this.roundText, images: [] })
    }

    for (const call of this.roundToolCalls()) items.push({ kind: 'tool_call', ...call })
    if (items.length > 0) this.conversation = [...this.conversation, ...items]
  }

  /** Issued calls carry final arguments and replace the streamed copies. */
  private addCalls(calls: ToolCall[]): void {
    const ids = new Set(calls.map((c) => c.callId))
    this.conversation = [
      ...this.conversation.filter((item) => !(item.kind === 'tool_call' && ids.has(item.callId))),
      ...calls.map((call) => ({ kind: 'tool_call' as const, ...call })),
    ]
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
