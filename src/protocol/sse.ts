// Server-sent event frame parser. A frame ends at a blank line. Chunks from a
// network stream can split a frame, a line, or a UTF-8 sequence anywhere, so
// the parser keeps the unfinished tail between pushes.

export interface SseFrame {
  id: string | null
  event: string
  data: string
}

export class SseParser {
  private buffer = ''
  private id: string | null = null
  private event = ''
  private data: string[] = []
  private hasData = false

  /** Feeds decoded text and returns the frames it completed. */
  push(text: string): SseFrame[] {
    this.buffer += text
    const frames: SseFrame[] = []
    let start = 0
    while (start < this.buffer.length) {
      const end = this.lineEnd(start)
      if (end === null) break
      const line = this.buffer.slice(start, end.index)
      start = end.next
      const frame = this.line(line)
      if (frame) frames.push(frame)
    }
    this.buffer = this.buffer.slice(start)
    return frames
  }

  private lineEnd(from: number): { index: number; next: number } | null {
    for (let i = from; i < this.buffer.length; i++) {
      const c = this.buffer[i]
      if (c === '\n') return { index: i, next: i + 1 }
      if (c === '\r') {
        // A lone CR at the end of the buffer may be the first half of CRLF.
        if (i + 1 >= this.buffer.length) return null
        return { index: i, next: this.buffer[i + 1] === '\n' ? i + 2 : i + 1 }
      }
    }
    return null
  }

  private line(line: string): SseFrame | null {
    if (line === '') return this.dispatch()
    if (line.startsWith(':')) return null
    const colon = line.indexOf(':')
    const field = colon < 0 ? line : line.slice(0, colon)
    let value = colon < 0 ? '' : line.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    switch (field) {
      case 'id':
        // An id with a NUL is ignored by the specification.
        if (!value.includes('\0')) this.id = value
        break
      case 'event':
        this.event = value
        break
      case 'data':
        this.data.push(value)
        this.hasData = true
        break
      default:
        break
    }
    return null
  }

  private dispatch(): SseFrame | null {
    const frame: SseFrame | null = this.hasData
      ? { id: this.id, event: this.event || 'message', data: this.data.join('\n') }
      : null
    this.event = ''
    this.data = []
    this.hasData = false
    return frame
  }
}
