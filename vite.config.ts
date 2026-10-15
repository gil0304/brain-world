import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base: './' keeps the build portable (GitHub Pages / any sub-path).
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: { port: 5173, host: true },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
})
