import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    // 使用 jsdom 环境模拟浏览器 DOM
    environment: 'jsdom',

    // 启用全局 API（describe, it, expect 等）
    globals: true,

    // 全局 setup 文件（引入 @testing-library/jest-dom 匹配器）
    setupFiles: './src/tests/setup.ts',

    // 启用 CSS 处理
    css: true,

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/types/',
        'dist/',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/router/index.tsx', // 路由配置通常不需要测试
      ],
      // 覆盖率阈值 - 从低阈值开始逐步提升
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 40,
        statements: 40,
      },
    },

    // 测试文件匹配模式
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/**/__tests__/**/*.{ts,tsx}',
    ],

    // 排除文件
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
    ],

    // 测试超时时间（毫秒）
    testTimeout: 10000,

    // Watch 模式排除
    watchExclude: ['**/node_modules/**', '**/dist/**'],

    // UI 配置
    ui: true,

    // 并行运行测试（默认开启）
    threads: true,

    // 显示详细输出
    logHeapUsage: true,

    // 失败后继续运行其他测试（0 = 全部运行）
    bail: 0,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
