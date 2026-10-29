import type { PendingSettings } from '@/protocol/types'
import { displayToken } from './display-case'
import { modeLabel } from './mode'
import { formatWindow } from './usage-text'

/** The settings that wait for the next turn, in the order the terminal's status bar lists them. */
export function pendingText(pending: PendingSettings): string {
  const parts: string[] = []
  if (pending.provider !== undefined) parts.push(`${pending.provider} / ${pending.model}`)
  if (pending.mode !== undefined) parts.push(modeLabel(pending.mode))
  if (pending.approval !== undefined) parts.push(displayToken(pending.approval))
  if (pending.thinking !== undefined) parts.push(displayToken(pending.thinking))
  if (pending.contextWindow !== undefined) parts.push(formatWindow(pending.contextWindow))
  if (pending.serviceTier !== undefined) parts.push(displayToken(pending.serviceTier))
  if (pending.speed !== undefined) parts.push(displayToken(pending.speed))
  return parts.join(' · ')
}
