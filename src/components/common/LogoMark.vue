<script setup lang="ts">
// The site's mark, drawn with currentColor so it follows the theme. Sakura
// swaps the diamond for a five-petal blossom unless the caller asks for the
// diamond.
import { useTheme } from '@/theme/theme'

const props = defineProps<{ crystal?: boolean }>()
const { theme } = useTheme()
const ANGLES = [0, 72, 144, 216, 288]
</script>

<template>
  <svg v-if="theme === 'sakura' && !props.crystal" viewBox="0 0 32 32" aria-hidden="true" class="size-6" fill="none" stroke="currentColor">
    <path v-for="angle in ANGLES" :key="angle" :transform="`rotate(${angle} 16 16)`" d="M16 16C12 12.2 10.8 7.4 13.6 4.8L16 6.6 18.4 4.8C21.2 7.4 20 12.2 16 16Z" stroke-width="1.4" stroke-linejoin="round" />
    <circle cx="16" cy="16" r="1.7" fill="currentColor" stroke="none" />
  </svg>
  <svg v-else viewBox="0 0 32 32" aria-hidden="true" class="size-6" fill="none" stroke="currentColor">
    <path d="M16 4.5 27.5 16 16 27.5 4.5 16Z" stroke-width="1.5" stroke-linejoin="round" />
    <g fill="currentColor" stroke="none">
      <circle cx="16" cy="4.5" r="1.6" />
      <circle cx="27.5" cy="16" r="1.6" />
      <circle cx="16" cy="27.5" r="1.6" />
      <circle cx="4.5" cy="16" r="1.6" />
    </g>
  </svg>
</template>
