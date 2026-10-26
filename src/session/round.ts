import { arr, asObject, num, str } from '@/protocol/json'
import { parseItem } from '@/protocol/parse'
import type { ConversationItem, LiveRound, ToolCall } from '@/protocol/types'

interface RoundCall {
  id: string
  name: string
  arguments: string
  kind: string
}

/**
 * Assembles one model round from stream deltas. The parent conversation and
 * every child session stream the same event types, so both fold them here.
 */
export class RoundAssembler {
  private text = ''
  private reasoning = ''
  private calls = new Map<number, RoundCall>()
  private retries = 0
  private open = false

  /** True once the round holds any text, reasoning, or tool call. */
  get streaming(): boolean {
    return this.text.length > 0 || this.reasoning.length > 0 || this.calls.size > 0
  }

  get isOpen(): boolean {
    return this.open
  }

  reset(open: boolean): void {
    this.text = ''
    this.reasoning = ''
    this.calls = new Map()
    this.retries = 0
    this.open = open
  }

  /** A retry drops what streamed so far and counts the attempt. */
  retry(): void {
    this.text = ''
    this.reasoning = ''
    this.calls = new Map()
    this.retries += 1
    this.open = true
  }

  /** Starts from a snapshot's live round, which has whole tool calls rather than deltas. */
  load(live: LiveRound | null): void {
    this.calls = new Map()
    this.text = live?.text ?? ''
    this.reasoning = live?.reasoning ?? ''
    this.retries = live?.retries ?? 0
    this.open = live !== null
    // Keep the calls in item order so later argument deltas extend them.
    live?.toolCalls.forEach((call, index) => {
      this.calls.set(index, { id: call.callId, name: call.name, arguments: call.arguments, kind: call.inputKind })
    })
  }

  /** Returns false for a delta the engine does not assemble. */
  apply(type: string, d: Record<string, unknown>): boolean {
    // The engine assembles candidate 0 only.
    if (num(d.candidate) !== 0) return false
    this.open = true
    if (type === 'stream.text') {
      this.text += str(d.delta)
    } else if (type === 'stream.reasoning') {
      this.reasoning += str(d.delta)
    } else {
      const item = num(d.item)
      const call = this.calls.get(item) ?? { id: '', name: '', arguments: '', kind: str(d.inputKind, 'json') }
      call.id += str(d.callIdDelta)
      call.name += str(d.nameDelta)
      call.arguments += str(d.argumentsDelta)
      this.calls.set(item, call)
    }

    return true
  }

  live(): LiveRound | null {
    return this.open
      ? { text: this.text, reasoning: this.reasoning, toolCalls: this.toolCalls(), retries: this.retries }
      : null
  }

  /** The conversation items this round produced. */
  commit(): ConversationItem[] {
    if (!this.open) return []
    const items: ConversationItem[] = []
    if (this.reasoning.length > 0) {
      items.push({ kind: 'reasoning', segments: [{ kind: 'trace', text: this.reasoning }], hasState: false })
    }

    if (this.text.length > 0) {
      items.push({ kind: 'message', role: 'assistant', text: this.text, images: [] })
    }

    for (const call of this.toolCalls()) items.push({ kind: 'tool_call', ...call })
    return items
  }

  private toolCalls(): ToolCall[] {
    return [...this.calls.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, call]) => call)
      .filter((call) => call.id.length > 0 && call.name.length > 0)
      .map((call) => ({ callId: call.id, name: call.name, arguments: call.arguments, inputKind: call.kind }))
  }
}

/** Issued calls carry final arguments and replace the streamed copies. */
export function withIssuedCalls(items: ConversationItem[], calls: ToolCall[]): ConversationItem[] {
  const ids = new Set(calls.map((c) => c.callId))
  return [
    ...items.filter((item) => !(item.kind === 'tool_call' && ids.has(item.callId))),
    ...calls.map((call) => ({ kind: 'tool_call' as const, ...call })),
  ]
}

/** The `tools.results` payload as conversation items. */
export function toolResultItems(d: Record<string, unknown>): ConversationItem[] {
  return arr(d.results).map((result) => parseItem({ ...asObject(result), kind: 'tool_result' }))
}
