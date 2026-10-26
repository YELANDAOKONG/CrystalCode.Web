import type { ConversationItem, LiveRound } from '@/protocol/types'

// What a running child has done since the page started watching it. The server
// saves a child's archive only when an invocation starts and settles, so the
// work in between exists only as events. The sheet shows the saved archive
// followed by this trace.

export interface ChildTrace {
  /** The invocation these items belong to. A new one starts a new trace. */
  invocationId: string
  items: ConversationItem[]
  live: LiveRound | null
  errors: string[]
  /**
   * False when the page began watching after the invocation started, or after
   * a resync. The earlier work is missing here and arrives with the archive
   * once the child settles.
   */
  complete: boolean
  /** The child stopped. The archive the server saved now holds this work. */
  settled: boolean
}

export type ChildActivity =
  | { kind: 'tool'; name: string }
  | { kind: 'writing' }
  | { kind: 'thinking' }
  | { kind: 'waiting' }

export function isChildActive(status: string): boolean {
  return status === 'running' || status === 'queued'
}

/** What the child is doing right now, read from its trace. */
export function childActivity(trace: ChildTrace | null): ChildActivity {
  if (trace) {
    const answered = new Set<string>()
    for (const item of trace.items) {
      if (item.kind === 'tool_result') answered.add(item.callId)
    }

    // A call that was issued and has no result yet is executing.
    for (let i = trace.items.length - 1; i >= 0; i--) {
      const item = trace.items[i]
      if (item?.kind === 'tool_call' && !answered.has(item.callId)) return { kind: 'tool', name: item.name }
    }

    const live = trace.live
    const call = live?.toolCalls[live.toolCalls.length - 1]
    if (call) return { kind: 'tool', name: call.name }
    if (live?.text) return { kind: 'writing' }
    if (live?.reasoning) return { kind: 'thinking' }
  }

  return { kind: 'waiting' }
}
