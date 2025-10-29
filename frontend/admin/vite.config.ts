import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import viteCompression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),

    // Gzip 压缩
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240, // 大于 10KB 的文件才压缩
      algorithm: 'gzip',
      ext: '.gz',
      deleteOriginFile: false,
    }),

    // Brotli 压缩 (比 Gzip 压缩率更高)
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'brotliCompress',
      ext: '.br',
      deleteOriginFile: false,
    }),

    // 构建分析器 (仅在需要时启用)
    process.env.ANALYZE ? visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
    }) : undefined,
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // 目标浏览器
    target: 'es2015',

    // 启用 CSS 代码分割
    cssCodeSplit: true,

    // 启用源码映射（开发环境）
    sourcemap: process.env.NODE_ENV === 'development',

    rollupOptions: {
      output: {
        // 手动代码分割
        manualChunks: (id) => {
          // 核心框架
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'react-vendor';
          }
          // React Query
          if (id.includes('@tanstack/react-query')) {
            return 'react-query-vendor';
          }
          // UI 组件库
          if (id.includes('antd') || id.includes('@ant-design')) {
            return 'antd-vendor';
          }
          // 图表库
          if (id.includes('echarts')) {
            return 'charts-vendor';
          }
          // Socket.IO
          if (id.includes('socket.io-client')) {
            return 'socket-vendor';
          }
          // 工具库
          if (id.includes('axios') || id.includes('dayjs') || id.includes('zustand')) {
            return 'utils-vendor';
          }
          // node_modules 中的其他依赖
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },

        // 输出文件命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // 根据文件类型分类
          const info = assetInfo.name?.split('.');
          const ext = info?.[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff|woff2/.test(ext || '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          } else if (ext === 'css') {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },

    // 代码分割阈值
    chunkSizeWarningLimit: 1000,

    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production', // 生产环境移除 console
        drop_debugger: true,
        pure_funcs: process.env.NODE_ENV === 'production' ? ['console.log'] : [],
      },
      format: {
        comments: false, // 移除注释
      },
    },

    // Rollup 优化
    reportCompressedSize: false, // 加快构建速度

    // 输出目录
    outDir: 'dist',
    assetsDir: 'assets',

    // 清空输出目录
    emptyOutDir: true,
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
