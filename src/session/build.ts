import type { BuildIdentity } from '@/protocol/types'
import { displayToken } from './display-case'

// The terminal's `crystal version` prints a build section and a host section,
// and leaves out anything the build did not record. This keeps that shape.

export interface BuildRow {
  key: 'crystalCode' | 'crystal' | 'sdk' | 'configuration' | 'runtime' | 'os'
  value: string
  /** A source revision is a hash: shown in full, in the monospace face. */
  mono?: boolean
}

const COMMIT = /^[0-9a-f]{40}$/i

function clean(value: string | null): string | null {
  const text = value?.trim()
  return text ? text : null
}

function revision(value: string | null): Pick<BuildRow, 'value' | 'mono'> | null {
  const text = clean(value)
  if (!text) return null
  return COMMIT.test(text) ? { value: text, mono: true } : { value: text }
}

export function buildSections(build: BuildIdentity): { build: BuildRow[]; host: BuildRow[] } {
  const rows: BuildRow[] = []
  const add = (key: BuildRow['key'], part: Pick<BuildRow, 'value' | 'mono'> | null) => {
    if (part) rows.push({ key, ...part })
  }

  const text = (value: string | null) => {
    const v = clean(value)
    return v ? { value: v } : null
  }

  add('crystalCode', revision(build.crystalCode))
  add('crystal', revision(build.crystal))
  add('sdk', text(build.sdk))
  const configuration = clean(build.configuration)
  add('configuration', configuration ? { value: displayToken(configuration) } : null)
  add('runtime', text(build.runtime))
  add('os', text(build.os))
  return {
    build: rows.filter((row) => ['crystalCode', 'crystal', 'sdk', 'configuration'].includes(row.key)),
    host: rows.filter((row) => ['runtime', 'os'].includes(row.key)),
  }
}
