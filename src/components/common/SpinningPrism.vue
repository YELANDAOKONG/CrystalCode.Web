<script setup lang="ts">
// A wireframe cube turning in space, drawn on a canvas at device resolution so
// the lines stay sharp. Edges and vertex dots only, in the text color. Decorative.
import { onBeforeUnmount, onMounted, ref } from 'vue'

const SIZE = 72
const HALF = 17
const PERIOD_MS = 14000
const FOCAL = 5

const corners = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x, y, z] as const)))
// Two corners share an edge when they differ in exactly one coordinate.
const edges = corners.flatMap((a, i) =>
  corners.slice(i + 1).flatMap((b, j) => (a.filter((v, k) => v !== b[k]).length === 1 ? [[i, i + 1 + j] as const] : [])),
)

const canvas = ref<HTMLCanvasElement>()
let frame = 0

function draw(el: HTMLCanvasElement, angle: number) {
  const ctx = el.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  if (el.width !== SIZE * dpr) {
    el.width = SIZE * dpr
    el.height = SIZE * dpr
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, SIZE, SIZE)
  ctx.strokeStyle = ctx.fillStyle = getComputedStyle(el).color
  ctx.lineWidth = 1.5
  ctx.lineCap = 'round'

  const tilt = 0.6 + 0.25 * Math.sin(angle)
  const cosY = Math.cos(angle)
  const sinY = Math.sin(angle)
  const cosX = Math.cos(tilt)
  const sinX = Math.sin(tilt)
  const points = corners.map(([x, y, z]) => {
    const rx = x * cosY + z * sinY
    const rz = -x * sinY + z * cosY
    const ry = y * cosX - rz * sinX
    const depth = y * sinX + rz * cosX
    const k = FOCAL / (FOCAL - depth)
    return { x: SIZE / 2 + rx * k * HALF, y: SIZE / 2 + ry * k * HALF, depth }
  })

  const shade = (depth: number) => 0.35 + 0.65 * ((depth + 1.8) / 3.6)
  for (const [a, b] of edges) {
    const p = points[a]
    const q = points[b]
    ctx.globalAlpha = shade((p.depth + q.depth) / 2)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(q.x, q.y)
    ctx.stroke()
  }
  for (const p of points) {
    ctx.globalAlpha = shade(p.depth)
    ctx.beginPath()
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

onMounted(() => {
  const el = canvas.value
  if (!el) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    draw(el, 0.6)
    return
  }
  const start = performance.now()
  const tick = (now: number) => {
    draw(el, (((now - start) % PERIOD_MS) / PERIOD_MS) * Math.PI * 2)
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
})

onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" :style="{ width: `${SIZE}px`, height: `${SIZE}px` }" />
</template>
