// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  base: '/sayur5/', // ← repo name
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: { outDir: 'dist', sourcemap: false },
})
