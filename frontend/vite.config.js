import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxyTarget = process.env.NOVOGAR_API_PROXY_TARGET || 'http://localhost:3002'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    cors: false,
    proxy: {
      '/api': apiProxyTarget
    }
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    proxy: {
      '/api': apiProxyTarget
    }
  }
})
