import type { Chrome, SlashCommand } from '@/protocol/types'
import { displayToken } from './display-case'

// The settings page changes the session by sending the same slash commands the
// terminal accepts. The values it offers come from the server's own command
// list (`commands`), so a model that has no thinking gears offers none.

export interface Option {
  /** What is sent after the command name. */
  value: string
  label: string
  help: string
  /** Shown as a heading over the entries that share it. */
  group?: string
}

/** Looks a command up by name, then follows nested argument names. */
export function findArguments(commands: SlashCommand[], ...path: string[]): SlashCommand[] {
  let level = commands
  for (const name of path) {
    const next = level.find((command) => command.name === name)
    if (!next) return []
    level = next.arguments
  }

  return level
}

export function toOptions(commands: SlashCommand[]): Option[] {
  return commands.map((command) => ({
    value: command.name,
    label: displayToken(command.name),
    help: command.help,
  }))
}

// `/approval` mixes the five modes with sub-commands for the reviewer model.
const APPROVAL_SUBCOMMANDS = new Set(['model', 'thinking', 'tier', 'speed', 'extended'])

export function approvalModes(commands: SlashCommand[]): Option[] {
  return toOptions(findArguments(commands, 'approval').filter((c) => !APPROVAL_SUBCOMMANDS.has(c.name)))
}

/**
 * The context window arrives as `1m` or `200k` with the raw number as an
 * alias. The chrome carries the number, so match on either.
 */
export function matchesWindow(option: SlashCommand, window: number): boolean {
  return option.keys.some((key) => key === String(window))
}

export function currentWindowOption(options: SlashCommand[], chrome: Chrome | null): string | undefined {
  if (!chrome) return undefined
  return options.find((option) => matchesWindow(option, chrome.contextWindow))?.name
}

/**
 * The chrome shows `Think Medium`-style labels. A choice matches when the
 * label ends with the option's display form.
 */
export function currentByLabel(options: Option[], shown: string): string | undefined {
  const text = shown.toLowerCase()
  return options.find((option) => text === option.label.toLowerCase() || text.endsWith(` ${option.label.toLowerCase()}`))?.value
}
