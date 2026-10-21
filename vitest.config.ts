import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Tests must not depend on a developer's .env.local: with VITE_API_URL set
    // every port would bind to binder-api. Tests that need API mode opt in
    // explicitly (vi.stubEnv / mocking apiConfigured).
    env: { VITE_API_URL: '' },
  },
})
