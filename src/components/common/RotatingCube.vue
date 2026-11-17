<script setup lang="ts">
// A wireframe cube turning slowly about its vertical axis at a fixed tilt.
// Orthographic, so the size does not pulse as corners swing toward the viewer.
// Canvas at device resolution, text color, edges and vertex dots only.
// Decorative.
import { onBeforeUnmount, onMounted, ref } from 'vue'

const SIZE = 72
const HALF = 17
const PERIOD_MS = 24000
const TILT = 0.5

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

  const cosY = Math.cos(angle)
  const sinY = Math.sin(angle)
  const cosX = Math.cos(TILT)
  const sinX = Math.sin(TILT)
  const points = corners.map(([x, y, z]) => {
    const rx = x * cosY + z * sinY
    const rz = -x * sinY + z * cosY
    const ry = y * cosX - rz * sinX
    return { x: SIZE / 2 + rx * HALF, y: SIZE / 2 + ry * HALF }
  })

  for (const [a, b] of edges) {
    ctx.beginPath()
    ctx.moveTo(points[a].x, points[a].y)
    ctx.lineTo(points[b].x, points[b].y)
    ctx.stroke()
  }
  for (const p of points) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
    ctx.fill()
  }
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
