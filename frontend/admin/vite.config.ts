import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // 所有 /api 请求统一代理到 API Gateway
      '/api': {
        target: 'http://localhost:30000',
        changeOrigin: true,
        ws: true, // 支持 WebSocket
      },
    },
  },
})
