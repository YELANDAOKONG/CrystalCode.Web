// The server rejects a JSON body over 1 MiB (CrystalCode.Server/Endpoints/Json.cs).
// The request wraps the message in a small object, so leave room for it.
export const MAX_BODY_BYTES = 1024 * 1024
const ENVELOPE_BYTES = 256 // {"text":"...","clientRequestId":"..."} plus escaping slack
export const WARN_AT = 0.9

const encoder = new TextEncoder()

/** Size of the text as UTF-8 on the wire. */
export function byteLength(text: string): number {
  return encoder.encode(text).length
}

/**
 * JSON escapes quotes, backslashes, and control characters, which can make the
 * body bigger than the raw text. Count that, so the warning matches what the
 * server will measure.
 */
export function bodyBytes(text: string): number {
  return byteLength(JSON.stringify(text)) + ENVELOPE_BYTES
}

export type DraftSize = 'ok' | 'near' | 'over'

export function sizeState(text: string): DraftSize {
  const bytes = bodyBytes(text)
  if (bytes > MAX_BODY_BYTES) return 'over'
  return bytes >= MAX_BODY_BYTES * WARN_AT ? 'near' : 'ok'
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${bytes} B`
}
