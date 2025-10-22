import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 核心框架
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI 组件库
          'antd-vendor': ['antd', '@ant-design/icons'],
          // 工具库
          'utils-vendor': ['axios', 'dayjs', 'zustand'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  server: {
    port: 5174,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:30000',
        changeOrigin: true,
      },
    },
  },
})
