import type { ConversationItem, ToolCall } from '@/protocol/types'
import type { Notice } from './state'

// Turns the flat conversation list into what the transcript draws: a tool call
// and its result become one block, matched by call id.

export interface ToolResult {
  status: string
  text: string
  images: number[]
}

export type Block =
  | { kind: 'message'; key: string; role: string; text: string; images: number[] }
  | { kind: 'reasoning'; key: string; text: string }
  | { kind: 'tool'; key: string; call: ToolCall; result: ToolResult | null }
  | { kind: 'notice'; key: string; notice: Notice }

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
      case 'message':
        blocks.push({ kind: 'message', key: `m${index}`, role: item.role, text: item.text, images: item.images })
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
