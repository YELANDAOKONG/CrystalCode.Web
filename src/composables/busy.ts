import { reactive } from 'vue'

/**
 * Tracks which controls have a request in flight, by key. A control shows a
 * spinner and ignores input while its key is busy, so a slow answer never
 * looks like a frozen page and a second click cannot send the change twice.
 */
export function useBusy() {
  const active = reactive(new Set<string>())

  async function run<T>(key: string, task: () => Promise<T>): Promise<T | undefined> {
    if (active.has(key)) return undefined
    active.add(key)
    try {
      return await task()
    } finally {
      active.delete(key)
    }
  }

  return { busy: (key: string) => active.has(key), anyBusy: () => active.size > 0, run }
}
