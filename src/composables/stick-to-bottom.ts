import { nextTick, onBeforeUnmount, onMounted, ref, watch, type WatchSource } from 'vue'

/**
 * Keeps a scroll container at its bottom while the reader is already there.
 * Once they scroll up, new content must not pull them back down.
 */
export function useStickToBottom(source: WatchSource) {
  const scroller = ref<HTMLElement | null>(null)
  const pinned = ref(true)
  // Updates that arrived while the reader was scrolled up.
  const unseen = ref(0)
  let observer: ResizeObserver | null = null

  function distance(element: HTMLElement): number {
    return element.scrollHeight - element.scrollTop - element.clientHeight
  }

  function onScroll(): void {
    const element = scroller.value
    if (!element) return
    pinned.value = distance(element) < 96
    if (pinned.value) unseen.value = 0
  }

  function toBottom(): void {
    const element = scroller.value
    if (!element) return
    element.scrollTop = element.scrollHeight
    pinned.value = true
    unseen.value = 0
  }

  watch(source, async () => {
    if (!pinned.value) {
      unseen.value += 1
      return
    }
    await nextTick()
    // A scroll that started while this render was queued has to win.
    if (!pinned.value) return
    toBottom()
  })

  // The slot changes height when the progress row appears. Follow the tail
  // only while the reader is already there; otherwise leave their place.
  function observe(element: HTMLElement | null): void {
    observer?.disconnect()
    observer = null
    if (!element) return
    observer = new ResizeObserver(() => {
      const element = scroller.value
      if (!pinned.value || !element || distance(element) < 1) return
      toBottom()
    })
    observer.observe(element)
  }

  watch(scroller, (element) => observe(element))
  onMounted(toBottom)
  onBeforeUnmount(() => observer?.disconnect())

  // A function ref keeps the binding explicit for templates that destructure the result.
  const bind = (element: unknown) => {
    scroller.value = element instanceof HTMLElement ? element : null
  }

  return { bind, pinned, unseen, onScroll, toBottom }
}
