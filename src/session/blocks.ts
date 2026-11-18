import type { ConversationItem, ToolCall } from '@/protocol/types'
import type { Notice } from './state'

// Turns the flat conversation list into what the transcript draws: a tool call
// and its result become one block, matched by call id.

// The engine opens every compaction summary with this heading. Same rule as the
// terminal: a summary is whatever starts with it, and an empty one is not shown.
const SUMMARY_MARKER = '## Earlier context'

/** The summary text without its heading, or null when `text` is not a compaction summary. */
export function compactionSummary(text: string): string | null {
  if (!text.startsWith(SUMMARY_MARKER)) return null
  const body = text.slice(SUMMARY_MARKER.length).trim()
  return body === '' ? null : body
}

export interface ToolResult {
  status: string
  text: string
  images: number[]
}

// `streaming` and `running` mark a block that is still arriving from the live round.
export type Block =
  | { kind: 'message'; key: string; role: string; text: string; images: number[]; streaming?: boolean }
  | { kind: 'summary'; key: string; text: string }
  | { kind: 'turn_failure'; key: string; text: string }
  | { kind: 'reasoning'; key: string; text: string; streaming?: boolean }
  | { kind: 'tool'; key: string; call: ToolCall; result: ToolResult | null; running?: boolean }
  | { kind: 'notice'; key: string; notice: Notice }

export type ToolEntry = Extract<Block, { kind: 'tool' }>
export type GroupedBlock = Block | { kind: 'toolgroup'; key: string; calls: ToolEntry[] }

/** A step of the model's work: thinking or tool calls, as opposed to a message. */
export type StepBlock = Extract<GroupedBlock, { kind: 'reasoning' | 'tool' | 'toolgroup' }>
export type FoldedBlock = GroupedBlock | { kind: 'process'; key: string; steps: StepBlock[]; thinking: number; tools: number }

/**
 * Folds each run of two or more steps between messages into one entry. A lone
 * step stays as it is. With `enabled` false every step is listed on its own.
 */
export function foldRuns(list: GroupedBlock[], enabled: boolean): FoldedBlock[] {
  if (!enabled) return list
  const entries: FoldedBlock[] = []
  let run: StepBlock[] = []
  const flush = () => {
    if (run.length > 1) {
      entries.push({
        kind: 'process',
        key: `p${run[0]!.key}`,
        steps: run,
        thinking: run.filter((step) => step.kind === 'reasoning').length,
        tools: run.reduce((sum, step) => sum + (step.kind === 'toolgroup' ? step.calls.length : step.kind === 'tool' ? 1 : 0), 0),
      })
    } else {
      entries.push(...run)
    }
    run = []
  }
  for (const block of list) {
    if (block.kind === 'reasoning' || block.kind === 'tool' || block.kind === 'toolgroup') {
      run.push(block)
    } else {
      flush()
      entries.push(block)
    }
  }
  flush()
  return entries
}

/**
 * Folds two or more tool calls in a row into one entry. With `enabled` false
 * every call keeps its own entry. With `includeSingle` a lone call becomes a
 * group of one.
 */
export function groupToolBlocks(list: Block[], enabled: boolean, includeSingle = false): GroupedBlock[] {
  if (!enabled) return list
  const entries: GroupedBlock[] = []
  for (const block of list) {
    const last = entries[entries.length - 1]
    if (block.kind !== 'tool') {
      entries.push(block)
    } else if (last?.kind === 'toolgroup') {
      last.calls.push(block)
    } else if (last?.kind === 'tool') {
      entries[entries.length - 1] = { kind: 'toolgroup', key: `g${last.key}`, calls: [last, block] }
    } else {
      entries.push(block)
    }
  }
  if (!includeSingle) return entries
  return entries.map((entry) => (entry.kind === 'tool' ? { kind: 'toolgroup' as const, key: `g${entry.key}`, calls: [entry] } : entry))
}

/**
 * @param notices Notes, errors, and reports. Each is placed before the item at
 *   its `at` index, so output appears where the command that caused it was typed.
 */
export function toBlocks(items: ConversationItem[], notices: Notice[] = []): Block[] {
  const results = new Map<string, ToolResult>()
  for (const item of items) {
    if (item.kind === 'tool_result') {
      results.set(item.callId, { status: item.status, text: item.text, images: item.images })
    }
  }

  const blocks: Block[] = []
  const called = new Set<string>()
  let next = 0
  const placed = notices.filter((notice) => notice.at !== null).sort((a, b) => (a.at as number) - (b.at as number) || a.seq - b.seq)
  const flush = (index: number) => {
    while (next < placed.length && (placed[next]!.at as number) <= index) {
      blocks.push({ kind: 'notice', key: `n${placed[next]!.seq}`, notice: placed[next]! })
      next += 1
    }
  }

  items.forEach((item, index) => {
    flush(index)
    switch (item.kind) {
      case 'message': {
        const summary = item.role === 'system' ? compactionSummary(item.text) : null
        if (summary !== null) blocks.push({ kind: 'summary', key: `s${index}`, text: summary })
        else blocks.push({ kind: 'message', key: `m${index}`, role: item.role, text: item.text, images: item.images })
        break
      }
      case 'turn_failure':
        blocks.push({ kind: 'turn_failure', key: `f${index}`, text: item.text })
        break
      case 'reasoning': {
        const text = item.segments.map((segment) => segment.text).join('\n\n').trim()
        if (text !== '') blocks.push({ kind: 'reasoning', key: `r${index}`, text })
        break
      }
      case 'tool_call':
        called.add(item.callId)
        blocks.push({
          kind: 'tool',
          key: `t${item.callId}`,
          call: { callId: item.callId, name: item.name, arguments: item.arguments, inputKind: item.inputKind },
          result: results.get(item.callId) ?? null,
        })
        break
      case 'tool_result':
        if (!called.has(item.callId) && !hasCall(items, item.callId)) {
          blocks.push({
            kind: 'tool',
            key: `o${index}`,
            call: { callId: item.callId, name: '', arguments: '', inputKind: '' },
            result: results.get(item.callId) ?? null,
          })
        }
        break
      default:
        break
    }
  })
  flush(Number.POSITIVE_INFINITY)
  return blocks
}

function hasCall(items: ConversationItem[], callId: string): boolean {
  return items.some((item) => item.kind === 'tool_call' && item.callId === callId)
}

/** Pretty-prints a JSON argument string. Anything that is not JSON is shown as sent. */
export function prettyArguments(raw: string): string {
  const text = raw.trim()
  if (text === '') return ''
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return raw
  }
}

/** One line for a collapsed tool call: the first short string value, or the raw text cut short. */
export function argumentSummary(raw: string): string {
  try {
    const value: unknown = JSON.parse(raw)
    if (value && typeof value === 'object') {
      for (const entry of Object.values(value)) {
        if (typeof entry === 'string' && entry.trim() !== '') return clip(entry.replace(/\s+/g, ' '), 120)
      }
    }
  } catch {
    // Not JSON: fall through to the raw text.
  }

  return clip(raw.replace(/\s+/g, ' ').trim(), 120)
}

function clip(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text
}
