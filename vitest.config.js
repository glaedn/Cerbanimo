import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    globals: true,
    server: {
      deps: {
        inline: [/@mui\/material/, /@mui\/x-date-pickers/],
      },
    },
  },
})
