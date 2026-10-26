// Port of the terminal's `UsageText` (CrystalCode.Engine/Sessions). The status
// line must read the same in both front ends, so the rounding, the decimal
// place, and the k / M suffixes follow the engine exactly.

const TENTHS = 10
const FULL_TENTHS = 100 * TENTHS

/** Percent of the window used, in tenths: rounded half away from zero, clamped to 0..1000. */
export function contextTenths(totalTokens: number, contextWindow: number): number {
  if (contextWindow <= 0 || totalTokens <= 0) return 0
  const tenths = (totalTokens / contextWindow) * FULL_TENTHS
  return Math.min(FULL_TENTHS, Math.max(0, Math.round(tenths)))
}

/** `7.7`, always one decimal place. */
export function formatPercent(tenths: number): string {
  return `${Math.trunc(tenths / TENTHS)}.${tenths % TENTHS}`
}

/** `CTX 7.7%`, or `CTX --` before the first call returns. */
export function formatContextUsed(totalTokens: number | null, contextWindow: number): string {
  return totalTokens === null ? 'CTX --' : `CTX ${formatPercent(contextTenths(totalTokens, contextWindow))}%`
}

/** `77k`, `1.2M`: the engine's `FormatNumber`. */
export function formatCount(value: number): string {
  if (value >= 1_000_000) return `${trimTenth(value / 1_000_000)}M`
  if (value >= 10_000) return `${trimTenth(value / 1_000)}k`
  return String(value)
}

// The engine formats with "0.#": one decimal place, dropped when it is zero.
function trimTenth(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/** The terminal's window label: `1M`, `200K`. */
export function formatWindow(window: number): string {
  if (window <= 0) return ''
  if (window % 1_000_000 === 0) return `${window / 1_000_000}M`
  if (window % 1_000 === 0) return `${window / 1_000}K`
  return String(window)
}
