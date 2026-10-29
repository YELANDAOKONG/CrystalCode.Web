import { onMounted, onScopeDispose, ref, shallowRef } from 'vue'

/**
 * Loads one structured query when the component mounts and again on demand.
 * `load` resolves to undefined when the request failed (the app already
 * reported it). A newer load replaces an older one still in flight.
 */
export function useQuery<T>(load: () => Promise<T | undefined>) {
  const data = shallowRef<T | null>(null)
  const loading = ref(false)
  const failed = ref(false)
  let ticket = 0

  async function reload(): Promise<void> {
    const mine = ++ticket
    loading.value = true
    const result = await load()
    if (mine !== ticket) return
    failed.value = result === undefined
    if (result !== undefined) data.value = result
    loading.value = false
  }

  onMounted(reload)
  onScopeDispose(() => {
    ticket += 1
  })

  return { data, loading, failed, reload }
}
