// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(() => {
  // kalau dulu kamu pakai base dinamis, pastikan build GH memberi DEPLOY_TARGET=gh
  return {
    plugins: [react()],
    base: '/sayur5/',                               // <— WAJIB untuk GitHub Pages (project repo)
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    build: { outDir: 'dist' },
  }
})
