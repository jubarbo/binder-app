import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  // Base path for the deployed site. The default '/' is correct for both
  // local dev and production: GitHub Pages serves this project at the custom
  // domain root (binder.mantisuy.com). A deployment under a subpath (e.g. a
  // plain username.github.io/repo/ page) would set the BASE_PATH env var.
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
