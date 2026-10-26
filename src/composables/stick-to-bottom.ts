import { nextTick, onMounted, ref, watch, type WatchSource } from 'vue'

/**
 * Keeps a scroll container at its bottom while the reader is already there.
 * Once they scroll up, new content must not pull them back down.
 */
export function useStickToBottom(source: WatchSource) {
  const scroller = ref<HTMLElement | null>(null)
  const pinned = ref(true)

  function onScroll(): void {
    const element = scroller.value
    if (!element) return
    pinned.value = element.scrollHeight - element.scrollTop - element.clientHeight < 96
  }

  function toBottom(): void {
    const element = scroller.value
    if (!element) return
    element.scrollTop = element.scrollHeight
    pinned.value = true
  }

  watch(source, async () => {
    if (!pinned.value) return
    await nextTick()
    toBottom()
  })

  onMounted(toBottom)

  // A function ref keeps the binding explicit for templates that destructure the result.
  const bind = (element: unknown) => {
    scroller.value = element instanceof HTMLElement ? element : null
  }

  return { bind, pinned, onScroll, toBottom }
}
