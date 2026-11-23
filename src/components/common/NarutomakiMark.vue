<script setup lang="ts">
// A narutomaki: the white fish cake with a fluted rim and a pink swirl, a
// symbol in Chinese-speaking trans communities. The rim takes currentColor and
// the swirl is the flag's pink. `solid` fills the disc white so it reads as a
// cake over any page.
defineProps<{ solid?: boolean }>()
</script>

<template>
  <svg viewBox="-32 -32 64 64" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M27.0 0.0Q29.8 6.8 24.3 11.7Q23.9 19.0 16.8 21.1Q13.2 27.5 6.0 26.3Q0.0 30.5 -6.0 26.3Q-13.2 27.5 -16.8 21.1Q-23.9 19.0 -24.3 11.7Q-29.8 6.8 -27.0 0.0Q-29.8 -6.8 -24.3 -11.7Q-23.9 -19.0 -16.8 -21.1Q-13.2 -27.5 -6.0 -26.3Q-0.0 -30.5 6.0 -26.3Q13.2 -27.5 16.8 -21.1Q23.9 -19.0 24.3 -11.7Q29.8 -6.8 27.0 -0.0Z" stroke="currentColor" stroke-width="2.2" :fill="solid ? 'var(--pride-white)' : 'none'" />
    <path d="M0.7 -1.9 L1.2 -2.0 L1.7 -2.1 L2.2 -2.0 L2.8 -1.9 L3.3 -1.6 L3.8 -1.1 L4.3 -0.6 L4.7 0.1 L4.9 0.8 L5.1 1.7 L5.1 2.6 L4.9 3.5 L4.5 4.4 L4.0 5.3 L3.3 6.2 L2.5 6.9 L1.4 7.5 L0.3 8.0 L-1.0 8.3 L-2.3 8.4 L-3.7 8.2 L-5.0 7.9 L-6.4 7.3 L-7.7 6.4 L-8.8 5.4 L-9.9 4.1 L-10.7 2.6 L-11.3 1.0 L-11.7 -0.7 L-11.7 -2.5 L-11.5 -4.4 L-11.0 -6.3 L-10.2 -8.1 L-9.1 -9.8 L-7.7 -11.3 L-6.1 -12.7 L-4.2 -13.7 L-2.1 -14.5 L0.1 -15.0 L2.5 -15.2 L4.8 -14.9 L7.2 -14.3 L9.5 -13.3 L11.6 -12.0 L13.6 -10.3 L15.3 -8.3 L16.6 -6.0 L17.7 -3.5 L18.4 -0.8 L18.6 2.0 L18.4 4.9 L17.7 7.8 L16.6 10.5 L15.1 13.2 L13.2 15.5 L10.8 17.6 L8.2 19.4 L5.2 20.7 L2.1 21.6 L-1.2 22.0" stroke="var(--pride-pink)" stroke-width="4.6" />
  </svg>
</template>
