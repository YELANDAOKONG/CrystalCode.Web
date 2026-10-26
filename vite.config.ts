// import vue from '@vitejs/plugin-vue'
// import { defineConfig } from 'vite'
//
// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [vue()],
// })
import path from 'node:path'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
