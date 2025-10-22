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
      '/api/auth': {
        target: 'http://localhost:30000',
        changeOrigin: true,
      },
      '/api/users': {
        target: 'http://localhost:30001',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/users/, '/users')
      },
      '/api/roles': {
        target: 'http://localhost:30001',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/roles/, '/roles')
      },
      '/api/permissions': {
        target: 'http://localhost:30001',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/permissions/, '/permissions')
      },
      '/api/quotas': {
        target: 'http://localhost:30001',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/quotas/, '/quotas')
      },
      '/api/tickets': {
        target: 'http://localhost:30001',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/tickets/, '/tickets')
      },
      '/api/audit-logs': {
        target: 'http://localhost:30001',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/audit-logs/, '/audit-logs')
      },
      '/api/api-keys': {
        target: 'http://localhost:30001',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/api-keys/, '/api-keys')
      },
      '/api/devices': {
        target: 'http://localhost:30002',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/devices/, '/devices')
      },
      '/api/apps': {
        target: 'http://localhost:30003',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/apps/, '/apps')
      },
      '/api/billing': {
        target: 'http://localhost:30005',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/billing/, '/billing')
      },
      '/api/balance': {
        target: 'http://localhost:30005',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/balance/, '/balance')
      },
      '/api/payments': {
        target: 'http://localhost:30005',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/payments/, '/payments')
      },
      '/api/reports': {
        target: 'http://localhost:30005',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/reports/, '/reports')
      },
      '/api/metering': {
        target: 'http://localhost:30005',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/metering/, '/metering')
      },
      '/api/stats': {
        target: 'http://localhost:30005',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/stats/, '/stats')
      },
      '/api/notifications': {
        target: 'http://localhost:30006',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/notifications/, '/notifications')
      },
    },
  },
})
