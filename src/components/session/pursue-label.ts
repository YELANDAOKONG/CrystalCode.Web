import { t, type MessageKey } from '@/i18n'
import { displayToken } from '@/session/display-case'

const LABELS = new Map<string, MessageKey>([
  ['status.active', 'pursue.status.active'],
  ['status.paused', 'pursue.status.paused'],
  ['status.blocked', 'pursue.status.blocked'],
  ['status.complete', 'pursue.status.complete'],
  ['phase.none', 'pursue.phase.none'],
  ['phase.working', 'pursue.phase.working'],
  ['phase.checking', 'pursue.phase.checking'],
  ['phase.waiting', 'pursue.phase.waiting'],
  ['verdict.done', 'pursue.verdict.done'],
  ['verdict.continue', 'pursue.verdict.continue'],
  ['verdict.wait', 'pursue.verdict.wait'],
  ['verdict.blocked', 'pursue.status.blocked'],
  ['verdict.failed', 'pursue.verdict.failed'],
])

export function pursueLabel(kind: 'status' | 'phase' | 'verdict', value: string): string {
  const key = LABELS.get(`${kind}.${value}`)
  return key ? t(key) : displayToken(value)
}
