// Parsing helpers for wire data. Everything from the server arrives as
// `unknown` and is narrowed here, field by field.

export type JsonObject = Record<string, unknown>

export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asObject(value: unknown): JsonObject {
  return isObject(value) ? value : {}
}

export function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function optStr(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function optNum(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function strings(value: unknown): string[] {
  return arr(value).filter((item): item is string => typeof item === 'string')
}
