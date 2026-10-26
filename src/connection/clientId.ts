// One random id per page load. The server accepts letters, digits, `-`, `_`,
// `.`, at most 128 characters.
export function newClientId(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return 'web-' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

// Distinct from the client id: an id that makes a repeated state-changing
// request run once. A retry of the same action reuses the same value.
export function newRequestId(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
