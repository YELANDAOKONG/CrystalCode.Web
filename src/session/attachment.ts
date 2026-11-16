// An image the operator added to the draft. The server holds the bytes once the
// upload is ready; `file` and `preview` stay in the page so a failed upload can
// be retried and the draft can show a thumbnail.
export type AttachmentStatus = 'uploading' | 'ready' | 'failed'

export interface Attachment {
  id: number
  name: string
  file: Blob
  /** Object URL of the local file. Revoke it when the attachment is dropped. */
  preview: string
  status: AttachmentStatus
  /** Text the server expects in the submitted message. Empty until ready. */
  marker: string
  number: number
}

/** `POST /images` keeps the host limit of 20 MiB (docs/server.md). */
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024

/** Insert a marker at the caret, set apart from the words around it. */
export function insertMarker(text: string, marker: string, at: number): { text: string; caret: number } {
  const before = text.slice(0, at)
  const after = text.slice(at)
  const lead = before !== '' && !/\s$/.test(before) ? ' ' : ''
  const trail = after !== '' && !/^\s/.test(after) ? ' ' : ''
  const inserted = `${lead}${marker}${trail}`
  return { text: `${before}${inserted}${after}`, caret: before.length + lead.length + marker.length + trail.length }
}

/** Remove a marker and one space that set it apart. */
export function removeMarker(text: string, marker: string): string {
  const at = text.indexOf(marker)
  if (at < 0) return text
  const end = at + marker.length
  if (text[end] === ' ') return `${text.slice(0, at)}${text.slice(end + 1)}`
  if (at > 0 && text[at - 1] === ' ') return `${text.slice(0, at - 1)}${text.slice(end)}`
  return `${text.slice(0, at)}${text.slice(end)}`
}
