import type { SlashCommand } from '@/protocol/types'

// The composer's slash picker. It follows the terminal's picker rule for rule:
// a prefix matches any key of a command (its name or an alias), arguments nest
// up to three levels, and a completed entry that equals the text means "send".
// The server's own command list is the only source of names and arguments.

export interface SlashPicker {
  matches: SlashCommand[]
  /** The text before the entry being completed, such as `/approval ` or `/`. */
  prefix: string
  /** True when the matches are arguments of a command, not top-level commands. */
  nested: boolean
  /** True when the parent's arguments are optional, so the bare prefix is already a complete command. */
  parentOptional: boolean
}

const keysOf = (command: SlashCommand) => (command.keys.length > 0 ? command.keys : [command.name])

const sameKey = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

const matchesPrefix = (command: SlashCommand, prefix: string) =>
  keysOf(command).some((key) => key.toLowerCase().startsWith(prefix))

function filter(
  options: SlashCommand[],
  typed: string,
  prefix: string,
  nested: boolean,
  parentOptional: boolean,
): SlashPicker | null {
  const lowered = typed.toLowerCase()
  const matches = options.filter((option) => matchesPrefix(option, lowered))
  return matches.length === 0 ? null : { matches, prefix, nested, parentOptional }
}

function findCommand(verb: string, options: SlashCommand[]): SlashCommand | null {
  return options.find((option) => keysOf(option).some((key) => sameKey(key, verb))) ?? null
}

// A key can name several entries (a mode and a sub-command). Prefer the one
// that has arguments of its own, as the terminal does.
function findNested(verb: string, options: SlashCommand[]): SlashCommand | null {
  let fallback: SlashCommand | null = null
  for (const option of options) {
    if (!keysOf(option).some((key) => sameKey(key, verb))) continue
    if (option.arguments.length > 0) return option
    fallback ??= option
  }

  return fallback
}

/** The entries to offer for `text`, or null when it is not a slash command being typed. */
export function createPicker(text: string, commands: SlashCommand[]): SlashPicker | null {
  if (!text.startsWith('/') || text.includes('\n')) return null

  const rest = text.slice(1)
  const space = rest.indexOf(' ')
  if (space < 0) return filter(commands, rest, '/', false, false)

  const verb = rest.slice(0, space)
  const remainder = rest.slice(space + 1)
  const command = findCommand(verb, commands)
  if (!command || command.arguments.length === 0) return null

  const nestedSpace = remainder.indexOf(' ')
  if (nestedSpace < 0) return filter(command.arguments, remainder, `/${verb} `, true, false)

  const first = remainder.slice(0, nestedSpace)
  const nestedRemainder = remainder.slice(nestedSpace + 1)
  const nested = findNested(first, command.arguments)
  if (!nested) return null

  const trailingSpace = nestedRemainder.indexOf(' ')
  if (trailingSpace < 0) {
    if (nested.arguments.length === 0) return null
    return filter(nested.arguments, nestedRemainder, `/${verb} ${first} `, true, nested.argumentsOptional)
  }

  const value = nestedRemainder.slice(0, trailingSpace)
  const trailing = nestedRemainder.slice(trailingSpace + 1)
  if (trailing.includes(' ')) return null

  const prefix = `/${verb} ${first} ${value} `
  const deeper = findNested(value, nested.arguments)
  if (deeper) {
    if (deeper.arguments.length === 0) return null
    return filter(deeper.arguments, trailing, prefix, true, deeper.argumentsOptional)
  }

  if (nested.argumentsAfterValue.length === 0) return null
  return filter(nested.argumentsAfterValue, trailing, prefix, true, false)
}

/** What the composer holds after picking `command` from `picker`. */
export function completedText(picker: SlashPicker, command: SlashCommand): string {
  return `${picker.prefix}${command.name} `
}

/**
 * True when `text` already is the chosen entry, so Enter sends it instead of
 * completing it again. A command whose arguments are optional is also complete
 * as its bare prefix.
 */
export function isExact(picker: SlashPicker, command: SlashCommand, text: string): boolean {
  const typed = text.trimEnd().toLowerCase()
  return (
    typed === completedText(picker, command).trimEnd().toLowerCase() ||
    (picker.parentOptional && typed === picker.prefix.trimEnd().toLowerCase())
  )
}

/** Aliases other than the canonical name, written as the operator would type them. */
export function aliasesOf(command: SlashCommand, nested: boolean): string[] {
  return keysOf(command)
    .filter((key) => !sameKey(key, command.name))
    .map((key) => (nested ? key : `/${key}`))
}
