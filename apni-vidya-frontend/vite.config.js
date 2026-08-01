import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In dev mode (`npm run dev`) the frontend runs on its own port (5173)
    // and the backend on another (3000 by default). Requests to /api/* get
    // forwarded to the backend so the app works without a full merge build.
    // Not needed once you run merge_and_run.sh (single-port production mode).
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
