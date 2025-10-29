# Week 3 Day 3 - 代码分割和懒加载实施计划

**日期**: 2025-10-29
**目标**: 前端 Bundle 优化 - 减小体积、提升加载速度
**预计耗时**: 1 天 (8 小时)

---

## 🎯 优化目标

### 性能指标
| 指标 | 当前 | 目标 | 提升 |
|------|------|------|------|
| 初始 Bundle 大小 | 3MB | 800KB | **-73%** |
| 首次加载时间 | 8s | 2s | **-75%** |
| 路由切换时间 | 500ms | 100ms | **-80%** |
| Lighthouse 得分 | 65 | 90 | **+38%** |
| First Contentful Paint | 3.5s | 1.2s | **-66%** |

---

## 📋 任务清单

### Phase 1: 路由级代码分割 (2 小时)

#### Task 1.1: 创建懒加载路由配置 (1 小时)

**文件**: `frontend/admin/src/router/lazyRoutes.tsx`

**代码实现**:
```typescript
import { lazy, Suspense } from 'react';
import { RouteObject } from 'react-router-dom';
import { Spin } from 'antd';
import MainLayout from '@/layouts/MainLayout';

// 懒加载包装器 - 统一的加载状态
const LazyLoad = (Component: React.LazyExoticComponent<any>) => {
  return (
    <Suspense
      fallback={
        <div
          style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spin size="large" tip="加载中..." />
        </div>
      }
    >
      <Component />
    </Suspense>
  );
};

// 懒加载所有页面组件
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const DeviceList = lazy(() => import('@/pages/Devices/DeviceListPage'));
const DeviceDetail = lazy(() => import('@/pages/Devices/DeviceDetail'));
const UserList = lazy(() => import('@/pages/Users/UserList'));
const UserDetail = lazy(() => import('@/pages/Users/UserDetail'));
const BillingDashboard = lazy(() => import('@/pages/Billing/Dashboard'));
const BillingHistory = lazy(() => import('@/pages/Billing/History'));
const Settings = lazy(() => import('@/pages/Settings'));
const Login = lazy(() => import('@/pages/Login'));

// 路由配置
export const routes: RouteObject[] = [
  {
    path: '/login',
    element: LazyLoad(Login),
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: LazyLoad(Dashboard),
      },
      {
        path: 'devices',
        children: [
          {
            index: true,
            element: LazyLoad(DeviceList),
          },
          {
            path: ':deviceId',
            element: LazyLoad(DeviceDetail),
          },
        ],
      },
      {
        path: 'users',
        children: [
          {
            index: true,
            element: LazyLoad(UserList),
          },
          {
            path: ':userId',
            element: LazyLoad(UserDetail),
          },
        ],
      },
      {
        path: 'billing',
        children: [
          {
            index: true,
            element: LazyLoad(BillingDashboard),
          },
          {
            path: 'history',
            element: LazyLoad(BillingHistory),
          },
        ],
      },
      {
        path: 'settings',
        element: LazyLoad(Settings),
      },
    ],
  },
];

export default routes;
```

**关键技术**:
- ✅ `React.lazy()` - 动态导入组件
- ✅ `Suspense` - 提供加载状态
- ✅ 统一的 `LazyLoad` 包装器
- ✅ 每个路由独立打包成 chunk

**预期效果**:
```
优化前:
  main.js: 3MB (包含所有页面)

优化后:
  main.js: 200KB (只包含基础框架)
  Dashboard.chunk.js: 150KB
  DeviceList.chunk.js: 180KB
  DeviceDetail.chunk.js: 200KB
  UserList.chunk.js: 120KB
  ... (按需加载)
```

---

#### Task 1.2: 更新路由器配置 (30 分钟)

**文件**: `frontend/admin/src/router/index.tsx`

**修改前**:
```typescript
import Dashboard from '@/pages/Dashboard';
import DeviceList from '@/pages/Devices/DeviceListPage';
// ... 所有页面都直接导入
```

**修改后**:
```typescript
import { createBrowserRouter } from 'react-router-dom';
import routes from './lazyRoutes';

export const router = createBrowserRouter(routes);
```

**收益**:
- ✅ 初始 Bundle 减小 ~2.5MB
- ✅ 首屏加载加快 ~5s
- ✅ 路由切换时才加载对应页面

---

#### Task 1.3: 添加路由预加载 (30 分钟)

**文件**: `frontend/admin/src/utils/routePreloader.ts`

**代码实现**:
```typescript
/**
 * 路由预加载工具
 * 在用户 hover 链接时预加载对应的 chunk
 */

const preloadedRoutes = new Set<string>();

export const preloadRoute = (routePath: string) => {
  if (preloadedRoutes.has(routePath)) {
    return; // 已预加载
  }

  // 根据路由路径动态导入
  const importMap: Record<string, () => Promise<any>> = {
    '/devices': () => import('@/pages/Devices/DeviceListPage'),
    '/devices/:id': () => import('@/pages/Devices/DeviceDetail'),
    '/users': () => import('@/pages/Users/UserList'),
    '/billing': () => import('@/pages/Billing/Dashboard'),
    '/settings': () => import('@/pages/Settings'),
  };

  const importFn = importMap[routePath];
  if (importFn) {
    importFn()
      .then(() => {
        preloadedRoutes.add(routePath);
        console.log(`[Preload] ${routePath} loaded`);
      })
      .catch((err) => {
        console.error(`[Preload] Failed to load ${routePath}:`, err);
      });
  }
};

/**
 * 预加载链接组件
 */
export const PreloadLink: React.FC<{
  to: string;
  children: React.ReactNode;
  [key: string]: any;
}> = ({ to, children, ...props }) => {
  const handleMouseEnter = () => {
    preloadRoute(to);
  };

  return (
    <a href={to} onMouseEnter={handleMouseEnter} {...props}>
      {children}
    </a>
  );
};
```

**使用示例**:
```typescript
import { PreloadLink } from '@/utils/routePreloader';

// 鼠标悬停时预加载
<PreloadLink to="/devices">
  设备管理
</PreloadLink>
```

---

### Phase 2: 组件级懒加载 (2 小时)

#### Task 2.1: 大型图表组件懒加载 (1 小时)

**文件**: `frontend/admin/src/components/LazyComponents/index.tsx`

**代码实现**:
```typescript
import { lazy, Suspense } from 'react';
import { Spin } from 'antd';

// 懒加载大型组件
export const LazyECharts = lazy(() => import('echarts-for-react'));
export const LazyMonacoEditor = lazy(() => import('@monaco-editor/react'));
export const LazyMarkdownEditor = lazy(() => import('react-markdown-editor-lite'));

// 通用懒加载包装器
export const withLazyLoad = <P extends object>(
  Component: React.LazyExoticComponent<React.ComponentType<P>>,
  fallback?: React.ReactNode
) => {
  return (props: P) => (
    <Suspense fallback={fallback || <Spin />}>
      <Component {...props} />
    </Suspense>
  );
};

// 预配置的懒加载组件
export const EChartsLazy = withLazyLoad(LazyECharts);
export const MonacoEditorLazy = withLazyLoad(LazyMonacoEditor);
export const MarkdownEditorLazy = withLazyLoad(LazyMarkdownEditor);
```

**使用示例**:
```typescript
// 优化前: 直接导入,增加主 Bundle 体积
import ReactECharts from 'echarts-for-react';

// 优化后: 懒加载,只在需要时加载
import { EChartsLazy } from '@/components/LazyComponents';

const Dashboard = () => {
  return (
    <div>
      <h1>数据看板</h1>
      {/* 只有当 Dashboard 页面加载时才加载 ECharts */}
      <EChartsLazy option={chartOption} />
    </div>
  );
};
```

**优化对象**:
- ✅ ECharts (echarts-for-react) - ~500KB
- ✅ Monaco Editor (@monaco-editor/react) - ~2MB
- ✅ Markdown Editor (react-markdown-editor-lite) - ~300KB
- ✅ PDF Viewer (react-pdf) - ~400KB
- ✅ Excel Export (xlsx) - ~600KB

**预期节省**: ~3.8MB

---

#### Task 2.2: 条件渲染组件懒加载 (1 小时)

**文件**: `frontend/admin/src/hooks/useLazyComponent.ts`

**代码实现**:
```typescript
import { useState, useEffect, lazy } from 'react';

/**
 * 懒加载组件 Hook
 * 只有在条件满足时才加载组件
 */
export const useLazyComponent = <P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  shouldLoad: boolean
) => {
  const [Component, setComponent] = useState<React.ComponentType<P> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (shouldLoad && !Component) {
      setLoading(true);
      importFn()
        .then((module) => {
          setComponent(() => module.default);
          setLoading(false);
        })
        .catch((err) => {
          setError(err);
          setLoading(false);
        });
    }
  }, [shouldLoad, Component, importFn]);

  return { Component, loading, error };
};
```

**使用示例**:
```typescript
import { useLazyComponent } from '@/hooks/useLazyComponent';

const DeviceDetail = ({ deviceId }) => {
  const [showChart, setShowChart] = useState(false);

  // 只有在用户点击"显示图表"时才加载 ECharts
  const { Component: ChartComponent, loading } = useLazyComponent(
    () => import('@/components/DeviceChart'),
    showChart
  );

  return (
    <div>
      <h1>设备详情</h1>
      <Button onClick={() => setShowChart(true)}>显示图表</Button>

      {showChart && (
        loading ? <Spin /> : ChartComponent && <ChartComponent deviceId={deviceId} />
      )}
    </div>
  );
};
```

---

### Phase 3: Vite 构建优化 (2 小时)

#### Task 3.1: 配置 Chunk 分割策略 (1 小时)

**文件**: `frontend/admin/vite.config.ts`

**完整配置**:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    // 目标浏览器
    target: 'es2015',

    // 输出目录
    outDir: 'dist',

    // 启用 CSS 代码分割
    cssCodeSplit: true,

    // Chunk 大小警告限制 (KB)
    chunkSizeWarningLimit: 1000,

    // Rollup 配置
    rollupOptions: {
      output: {
        // 手动 Chunk 分割
        manualChunks: {
          // React 核心库
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // Ant Design
          'antd-vendor': ['antd', '@ant-design/icons'],

          // 图表库 (单独打包)
          'charts-vendor': ['echarts', 'echarts-for-react'],

          // 工具库
          'utils-vendor': ['dayjs', 'lodash-es'],

          // React Query
          'query-vendor': ['@tanstack/react-query', '@tanstack/react-query-devtools'],

          // 虚拟滚动
          'virtual-vendor': ['react-window', 'react-window-infinite-loader'],
        },

        // 文件命名策略
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // 根据文件类型分类
          if (assetInfo.name?.endsWith('.css')) {
            return 'css/[name]-[hash][extname]';
          }
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(assetInfo.name || '')) {
            return 'images/[name]-[hash][extname]';
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name || '')) {
            return 'fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },

    // 压缩选项
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // 移除 console
        drop_debugger: true, // 移除 debugger
        pure_funcs: ['console.log'], // 移除特定函数
      },
    },

    // 启用 sourcemap (开发环境)
    sourcemap: process.env.NODE_ENV !== 'production',
  },

  // 优化选项
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'antd',
      '@ant-design/icons',
    ],
  },
});
```

**Chunk 分割策略说明**:

1. **Vendor Chunk (第三方库)**
   - `react-vendor`: React 核心 (~150KB)
   - `antd-vendor`: Ant Design (~800KB)
   - `charts-vendor`: ECharts (~500KB)
   - `utils-vendor`: 工具库 (~100KB)

2. **App Chunk (业务代码)**
   - 按路由自动分割
   - 每个页面独立 chunk

3. **Common Chunk (共享代码)**
   - Vite 自动提取公共依赖

**优化效果**:
```
优化前:
  main.js: 3MB (所有代码混在一起)

优化后:
  main.js: 50KB (入口文件)
  react-vendor.js: 150KB (React 核心,缓存)
  antd-vendor.js: 800KB (Ant Design,缓存)
  charts-vendor.js: 500KB (按需加载)
  Dashboard.chunk.js: 150KB (按需加载)
  DeviceList.chunk.js: 180KB (按需加载)
  ...
```

---

#### Task 3.2: 启用 Gzip 和 Brotli 压缩 (30 分钟)

**安装依赖**:
```bash
cd frontend/admin
pnpm add -D vite-plugin-compression
```

**更新 vite.config.ts**:
```typescript
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),

    // Gzip 压缩
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // 10KB 以上才压缩
      deleteOriginFile: false,
    }),

    // Brotli 压缩 (更高压缩率)
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
      deleteOriginFile: false,
    }),
  ],
});
```

**压缩效果**:
```
原始:     antd-vendor.js: 800KB
Gzip:     antd-vendor.js.gz: 250KB (-69%)
Brotli:   antd-vendor.js.br: 200KB (-75%)
```

---

#### Task 3.3: 资源预加载和懒加载 (30 分钟)

**文件**: `frontend/admin/index.html`

**优化 HTML**:
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>云手机管理平台</title>

  <!-- DNS 预解析 -->
  <link rel="dns-prefetch" href="//stun.l.google.com" />
  <link rel="dns-prefetch" href="//cdn.example.com" />

  <!-- 预连接关键域名 -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

  <!-- 预加载关键资源 -->
  <link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/css/critical.css" as="style" />

  <!-- 内联关键 CSS -->
  <style>
    /* 首屏关键样式 */
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #root { min-height: 100vh; }
    .loading-screen { display: flex; align-items: center; justify-content: center; height: 100vh; }
  </style>
</head>
<body>
  <div id="root">
    <!-- 首屏加载指示器 -->
    <div class="loading-screen">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>
  </div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

---

### Phase 4: Tree Shaking 和代码优化 (2 小时)

#### Task 4.1: 优化导入语句 (1 小时)

**优化前**:
```typescript
// ❌ 导入整个库
import _ from 'lodash';
import * as Icons from '@ant-design/icons';
import moment from 'moment';

// 使用
_.debounce(fn, 300);
<Icons.UserOutlined />
moment().format();
```

**优化后**:
```typescript
// ✅ 按需导入
import debounce from 'lodash-es/debounce';
import { UserOutlined, SettingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

// 使用
debounce(fn, 300);
<UserOutlined />
dayjs().format();
```

**自动化工具**: 创建 ESLint 规则

**文件**: `frontend/admin/.eslintrc.json`
```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["lodash"],
            "message": "请使用 lodash-es 并按需导入"
          },
          {
            "group": ["moment"],
            "message": "请使用 dayjs 替代 moment"
          }
        ]
      }
    ]
  }
}
```

---

#### Task 4.2: 移除未使用的代码 (30 分钟)

**工具**: `vite-plugin-purgecss`

```bash
pnpm add -D @fullhuman/postcss-purgecss
```

**配置**: `postcss.config.js`
```javascript
module.exports = {
  plugins: [
    require('@fullhuman/postcss-purgecss')({
      content: ['./src/**/*.{ts,tsx,html}'],
      defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
      safelist: ['html', 'body'],
    }),
  ],
};
```

**效果**: 移除未使用的 CSS,减小 ~30%

---

#### Task 4.3: 代码质量检查 (30 分钟)

**Bundle 分析工具**:
```bash
pnpm add -D rollup-plugin-visualizer
```

**vite.config.ts**:
```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

**使用**:
```bash
pnpm build
# 自动打开 dist/stats.html 查看 Bundle 组成
```

---

## 📊 预期优化效果

### Bundle 大小对比

| Chunk | 优化前 | 优化后 | 压缩后 (Brotli) |
|-------|--------|--------|----------------|
| **main.js** | 3.0 MB | 50 KB | 15 KB |
| **react-vendor.js** | - | 150 KB | 45 KB |
| **antd-vendor.js** | - | 800 KB | 200 KB |
| **charts-vendor.js** | - | 500 KB | 120 KB |
| **Dashboard.chunk.js** | - | 150 KB | 40 KB |
| **DeviceList.chunk.js** | - | 180 KB | 50 KB |
| **总计 (首屏)** | 3.0 MB | 1.0 MB | 255 KB |

### 加载时间对比 (3G 网络)

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| **首屏加载** | 8.0s | 2.0s | **-75%** |
| **FCP** | 3.5s | 1.2s | **-66%** |
| **TTI** | 9.0s | 2.5s | **-72%** |
| **路由切换** | 500ms | 100ms | **-80%** |

---

## 📁 交付文件清单

```
frontend/admin/
├── src/
│   ├── router/
│   │   └── lazyRoutes.tsx              ✅ 懒加载路由 (150+ 行)
│   ├── components/
│   │   └── LazyComponents/
│   │       └── index.tsx               ✅ 懒加载组件 (80+ 行)
│   ├── hooks/
│   │   └── useLazyComponent.ts         ✅ 懒加载 Hook (50+ 行)
│   └── utils/
│       └── routePreloader.ts           ✅ 路由预加载 (60+ 行)
├── vite.config.ts                      ✅ Vite 配置优化 (已更新)
├── postcss.config.js                   ✅ PostCSS 配置 (新增)
├── .eslintrc.json                      ✅ ESLint 规则 (已更新)
└── index.html                          ✅ HTML 优化 (已更新)

total: 4 个新文件, 4 个修改文件, ~340 行新代码
```

---

## 🧪 测试和验证

### 测试 1: Bundle 大小检查
```bash
cd frontend/admin
pnpm build
ls -lh dist/js/
```

**预期**: 主 Bundle < 100KB

### 测试 2: 路由懒加载验证
```bash
# 打开浏览器 DevTools → Network
# 访问首页,只应加载 main.js + react-vendor.js
# 点击"设备管理",应加载 DeviceList.chunk.js
```

### 测试 3: Lighthouse 测试
```bash
# Chrome DevTools → Lighthouse
# 运行测试
```

**预期**: Performance 得分 > 90

---

## ✅ 验收标准

- ✅ 初始 Bundle < 100KB (不含 vendor)
- ✅ Vendor Chunk 合理分割 (React, Ant Design 独立)
- ✅ 路由切换无白屏 (Suspense loading)
- ✅ Lighthouse 得分 > 85
- ✅ FCP < 1.5s
- ✅ TTI < 3s

---

**准备好开始实施了吗? 🚀**
