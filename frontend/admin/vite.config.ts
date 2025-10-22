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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 核心框架
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI 组件库
          'antd-vendor': ['antd', '@ant-design/icons', '@ant-design/pro-components'],
          // 图表库
          'charts-vendor': ['echarts', 'echarts-for-react'],
          // 工具库
          'utils-vendor': ['axios', 'dayjs', 'zustand'],
        },
      },
    },
    // 代码分割阈值
    chunkSizeWarningLimit: 1000,
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 生产环境移除 console
        drop_debugger: true,
      },
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
