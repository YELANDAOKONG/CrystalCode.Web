// Prompt history for the composer. The server publishes the saved list once,
// when the session starts. The terminal's composer also remembers each prompt
// as it is submitted; this does the same for prompts sent in the current page.

const MAXIMUM = 200

/** Invisible prefix of a trusted image marker. Those prompts are not history. */
const IMAGE_PREFIX = '\u2063'

/** Appends one submitted prompt. A blank, an image, or a repeat of the last entry is left out. */
export function rememberPrompt(history: readonly string[], text: string): string[] {
  if (text.trim() === '' || text.includes(IMAGE_PREFIX)) return [...history]
  if (history.length > 0 && history[history.length - 1] === text) return [...history]
  const next = [...history, text]
  return next.length > MAXIMUM ? next.slice(next.length - MAXIMUM) : next
}

/**
 * Saved entries, then prompts remembered on this page that the saved list
 * does not already end with.
 */
export function promptHistory(saved: readonly string[], remembered: readonly string[]): string[] {
  const merged = [...saved]
  for (const item of remembered) {
    if (merged.length > 0 && merged[merged.length - 1] === item) continue
    merged.push(item)
  }

  return merged.length > MAXIMUM ? merged.slice(merged.length - MAXIMUM) : merged
}
