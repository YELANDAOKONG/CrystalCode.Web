import type { MessageKey } from '@/i18n'
import type { Interaction, LiveRound } from '@/protocol/types'
import { displayToken } from './display-case'

// What the main session is doing right now, as the terminal's progress row
// shows it. The server reports only four activities; the rest is read from the
// stream, tool, retry, and review events, exactly as the terminal does.

export type Step =
  | { kind: 'waiting' }
  | { kind: 'thinking' }
  | { kind: 'writing' }
  | { kind: 'calling'; name: string }
  | { kind: 'running'; name: string }
  | { kind: 'retrying'; attempt: number; until: number }
  | { kind: 'reviewing'; extended: boolean }
  | { kind: 'compacting' }
  | { kind: 'loading-tools' }
  | { kind: 'loading-plugins' }

export interface Progress {
  /** Changes when the wording changes, so the elapsed timer can start over. */
  id: string
  key: MessageKey
  params: Record<string, string | number>
  /** Milliseconds until the next retry, or null when the step is not a retry wait. */
  countdown: number | null
}

/** The step an `activity` value stands for. `idle` and unknown values stand for none. */
export function stepForActivity(activity: string): Step | null {
  switch (activity) {
    case 'loading_tools':
      return { kind: 'loading-tools' }
    case 'loading_plugins':
      return { kind: 'loading-plugins' }
    case 'compacting':
      return { kind: 'compacting' }
    case 'waiting_for_model':
      return { kind: 'waiting' }
    default:
      return null
  }
}

const ACTIVITY_STEPS = new Set<Step['kind']>(['compacting', 'loading-tools', 'loading-plugins'])

/** True for a step that only an `activity` event sets, so the next `idle` ends it. */
export function isActivityStep(step: Step | null): boolean {
  return step !== null && ACTIVITY_STEPS.has(step.kind)
}

/** The step to show after a snapshot, which carries the live round but no history of steps. */
export function stepFromSnapshot(activity: string, turnActive: boolean, live: LiveRound | null): Step | null {
  const fromActivity = stepForActivity(activity)
  if (fromActivity && fromActivity.kind !== 'waiting') return fromActivity
  if (!turnActive) return null
  if (live?.text) return { kind: 'writing' }
  if (live?.reasoning) return { kind: 'thinking' }
  const call = live?.toolCalls.at(-1)
  return call ? { kind: 'calling', name: call.name } : { kind: 'waiting' }
}

/** True when `next` would read the same, so a token stream does not churn the page. */
export function sameStep(a: Step | null, b: Step | null): boolean {
  if (a === null || b === null) return a === b
  if (a.kind !== b.kind) return false
  if ((a.kind === 'calling' || a.kind === 'running') && (b.kind === 'calling' || b.kind === 'running')) {
    return a.name === b.name
  }

  if (a.kind === 'reviewing' && b.kind === 'reviewing') return a.extended === b.extended
  return a.kind !== 'retrying'
}

// The terminal's wording for what each built-in tool is doing. A tool that is
// not listed (an external or MCP tool) reads "Running <name>".
const TOOL_PHRASES: Record<string, MessageKey> = {
  bash: 'progress.tool.bash',
  bash_start: 'progress.tool.bashStart',
  bash_status: 'progress.tool.bashStatus',
  bash_logs: 'progress.tool.bashLogs',
  bash_stop: 'progress.tool.bashStop',
  read: 'progress.tool.read',
  list: 'progress.tool.list',
  tree: 'progress.tool.list',
  write: 'progress.tool.write',
  edit: 'progress.tool.edit',
  apply_patch: 'progress.tool.patch',
  glob: 'progress.tool.search',
  grep: 'progress.tool.search',
  search: 'progress.tool.search',
  todowrite: 'progress.tool.todoWrite',
  todoread: 'progress.tool.todoRead',
  question: 'progress.tool.question',
  skill: 'progress.tool.skill',
}

const plain = (key: MessageKey): Progress => ({ id: key, key, params: {}, countdown: null })

/**
 * The line to show, or null when nothing is happening. A question waiting for
 * this client's answer wins over the step, as in the terminal.
 */
export function describeProgress(step: Step | null, interactions: Interaction[], now: number): Progress | null {
  if (interactions.some((item) => item.kind === 'approval')) return plain('progress.approval')
  if (interactions.some((item) => item.kind === 'question')) return plain('progress.answer')
  if (step === null) return null

  switch (step.kind) {
    case 'waiting':
      return plain('progress.waiting')
    case 'thinking':
      return plain('progress.thinking')
    case 'writing':
      return plain('progress.writing')
    case 'compacting':
      return plain('progress.compacting')
    case 'loading-tools':
      return plain('progress.loadingTools')
    case 'loading-plugins':
      return plain('progress.loadingPlugins')
    case 'reviewing':
      return plain(step.extended ? 'progress.extended' : 'progress.reviewing')
    case 'calling':
      return { id: `calling:${step.name}`, key: 'progress.calling', params: { name: displayToken(step.name) }, countdown: null }
    case 'retrying':
      return { id: `retrying:${step.attempt}`, key: 'progress.retrying', params: { attempt: step.attempt }, countdown: Math.max(0, step.until - now) }
    case 'running': {
      const phrase = TOOL_PHRASES[step.name.toLowerCase()]
      if (phrase) return plain(phrase)
      return { id: `running:${step.name}`, key: 'progress.run', params: { name: displayToken(step.name) }, countdown: null }
    }
  }
}

/** The terminal's compact duration: 5s, 2m18s, 1h2m3s. */
export function formatElapsed(milliseconds: number): string {
  const total = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) return `${hours}h${minutes}m${seconds}s`
  if (minutes > 0) return `${minutes}m${seconds}s`
  return `${seconds}s`
}
