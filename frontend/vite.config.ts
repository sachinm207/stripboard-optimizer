import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND_PORT = process.env.PORT || process.env.BACKEND_PORT || '8090'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
      },
      '/ws': {
        target: `ws://localhost:${BACKEND_PORT}`,
        ws: true,
      }
    }
  }
})
