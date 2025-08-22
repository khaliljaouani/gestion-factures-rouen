// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',                 // <<< IMPORTANT pour Electron (file://)
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // (facultatif) si tu veux des chunks plus petits
    // rollupOptions: { output: { manualChunks: {} } }
  },
})
