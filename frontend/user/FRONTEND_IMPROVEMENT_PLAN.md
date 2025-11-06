# 前端用户端改进计划

## 📊 当前状态

### ✅ 已完成
- ✅ TypeScript 编译错误全部修复 (158 → 0)
- ✅ 生产构建成功
- ✅ 31 个页面组件完整
- ✅ 路由配置完整
- ✅ 环境变量配置完整
- ✅ 基础类型定义存在

### ❌ 待补充项

## 1. 🔴 P0 - 必须修复

### 1.1 ESLint 配置错误
**问题**: ESLint flat config 格式不正确，无法运行 lint 检查

**错误信息**:
```
A config object has a "plugins" key defined as an array of strings
Flat config requires "plugins" to be an object
```

**影响**: 无法进行代码质量检查

**修复方案**:
```javascript
// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
)
```

**涉及文件**:
- `eslint.config.js` (user 和 admin 都需要修复)

---

## 2. 🟡 P1 - 重要但不紧急

### 2.1 缺少测试配置和测试用例

**问题**: user 前端完全没有测试配置和测试用例

**对比 admin 前端**:
- admin: 100% 测试通过 (166 tests, 6 test files)
- user: ❌ 无测试配置

**需要安装的依赖**:
```json
{
  "devDependencies": {
    "@testing-library/jest-dom": "^6.x",
    "@testing-library/react": "^16.x",
    "@testing-library/user-event": "^14.x",
    "@vitest/coverage-v8": "^3.x",
    "@vitest/ui": "^3.x",
    "vitest": "^3.x",
    "jsdom": "^24.x"
  }
}
```

**需要创建的配置文件**:

1. `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

2. `src/tests/setup.ts`:
```typescript
import '@testing-library/jest-dom';
```

3. `src/tests/test-utils.tsx`:
```typescript
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    );
  }

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), queryClient };
}

export * from '@testing-library/react';
export { renderWithProviders as render };
```

**package.json 添加脚本**:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

**优先级测试组件**:
1. 核心 hooks (useAuth, useDeviceList)
2. 关键页面 (Login, Dashboard, MyDevices)
3. 公共组件 (ProtectedRoute, ErrorBoundary)

---

### 2.2 缺少图表库依赖

**问题**: `BalanceTrendChart` 组件使用临时占位符

**当前代码** (`src/components/AccountBalance/BalanceTrendChart.tsx`):
```typescript
// import { Line } from '@ant-design/charts'; // TODO: 需要安装 @ant-design/charts
const Line = () => null; // 临时占位符
```

**使用位置**:
- `src/pages/AccountBalance.tsx` (余额趋势图表)

**解决方案选项**:

**方案 A: 安装 @ant-design/charts** (推荐)
```bash
pnpm add @ant-design/charts
```

**优点**:
- 与 Ant Design 风格一致
- 开箱即用，API 简单
- 响应式设计

**缺点**:
- 包体积较大 (~500KB)
- 基于 G2Plot，学习曲线

**方案 B: 使用轻量级替代 - recharts**
```bash
pnpm add recharts
```

修改 `BalanceTrendChart.tsx`:
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const BalanceTrendChart = memo<BalanceTrendChartProps>(({ lineChartConfig }) => {
  return (
    <Card title="余额趋势">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={lineChartConfig.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="#1890ff"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
});
```

**优点**:
- 轻量级 (~100KB)
- React 友好
- 文档完善

**缺点**:
- 需要手动调整样式匹配 Ant Design

**方案 C: 使用 Chart.js + react-chartjs-2**
```bash
pnpm add chart.js react-chartjs-2
```

**建议**: 优先使用**方案 B (recharts)**，平衡了包体积和功能性。

---

### 2.3 缺失的类型定义

**问题**: 以下类型使用了 `type X = any` 临时定义

#### 2.3.1 UsageRecord (使用记录)

**位置**: `src/pages/UsageRecords.tsx`

**当前**:
```typescript
// import type { UsageRecord } from '@/types'; // TODO: 添加 UsageRecord 类型定义
type UsageRecord = any;
```

**应添加到** `src/types/index.ts`:
```typescript
/**
 * 设备使用记录
 */
export interface UsageRecord {
  id: string;
  userId: string;
  deviceId: string;
  device?: Device;
  startTime: string;
  endTime?: string;
  duration: number; // 使用时长（秒）
  cpuUsage?: number; // 平均 CPU 使用率（%）
  memoryUsage?: number; // 平均内存使用（MB）
  networkUsage?: number; // 网络流量（字节）
  cost: number; // 费用（元）
  createdAt: string;
}
```

#### 2.3.2 HistoryData (历史监控数据)

**位置**: `src/utils/monitorConfig.ts`

**当前**:
```typescript
// import type { HistoryData } from '@/types'; // TODO: 添加 HistoryData 类型定义
type HistoryData = any;
```

**应添加到** `src/types/index.ts`:
```typescript
/**
 * 设备监控历史数据点
 */
export interface HistoryData {
  time: string; // 时间戳或格式化时间
  cpuUsage: number; // CPU 使用率（%）
  memoryUsage: number; // 内存使用率（%）
  networkIn?: number; // 网络入流量（字节）
  networkOut?: number; // 网络出流量（字节）
}
```

**修改后的文件**:
```typescript
// src/utils/monitorConfig.ts
import type { HistoryData } from '@/types';

// src/pages/UsageRecords.tsx
import type { UsageRecord } from '@/types';
```

---

## 3. 🟢 P2 - 可选优化

### 3.1 API 模拟数据替换

**问题**: 部分 hooks 使用模拟数据而非真实 API

**涉及文件**:
1. `src/hooks/useDeviceTemplates.tsx:52`
   ```typescript
   // TODO: 实际应该调用 API - 目前使用模拟数据
   setTemplates(mockTemplates);
   ```

2. `src/hooks/usePaymentMethods.tsx:32`
   ```typescript
   // TODO: 实际应该调用 API - 目前使用模拟数据
   ```

3. `src/hooks/useDashboard.tsx:50`
   ```typescript
   // 模拟数据（实际应从API获取）
   ```

4. `src/utils/templateConfig.tsx:364`
   ```typescript
   // ===== 模拟数据（仅用于开发） =====
   ```

**优先级**: P2（可以在后端 API 就绪后再替换）

**建议**:
- 保留模拟数据用于开发环境
- 使用环境变量控制：`VITE_ENABLE_MOCK=true/false`
- 创建 MSW (Mock Service Worker) 统一管理模拟数据

---

### 3.2 性能优化建议

**已实现的优化**:
- ✅ 组件懒加载 (React.lazy)
- ✅ useMemo/useCallback 优化
- ✅ 图片懒加载 (react-lazy-load-image-component)
- ✅ 虚拟滚动 (react-window)
- ✅ 代码分割 (Vite)
- ✅ 压缩 (gzip + brotli)

**可进一步优化**:
1. **添加 Bundle Analyzer**
   ```bash
   pnpm build:analyze
   ```
   检查包体积分布

2. **优化图片资源**
   - 使用 WebP 格式
   - 添加响应式图片

3. **PWA 支持** (可选)
   ```bash
   pnpm add vite-plugin-pwa
   ```

---

### 3.3 代码规范和文档

**建议添加**:

1. **Pre-commit Hook**
   ```bash
   pnpm add -D husky lint-staged
   ```

   `.husky/pre-commit`:
   ```bash
   #!/bin/sh
   pnpm lint-staged
   ```

   `package.json`:
   ```json
   {
     "lint-staged": {
       "*.{ts,tsx}": [
         "eslint --fix",
         "prettier --write"
       ]
     }
   }
   ```

2. **组件文档** (Storybook 可选)

3. **API 文档**
   - 补充 `src/services/` 中的 JSDoc 注释

---

## 📋 执行计划

### 第一阶段：修复 P0 问题（必须）
- [ ] 修复 ESLint 配置 (预计 30 分钟)
- [ ] 验证 lint 命令正常运行

### 第二阶段：补充 P1 功能（重要）
- [ ] 添加测试配置 (预计 1 小时)
- [ ] 编写基础测试用例 (预计 2 小时)
- [ ] 补充缺失类型定义 (预计 30 分钟)
- [ ] 安装图表库并实现 BalanceTrendChart (预计 1 小时)

### 第三阶段：优化 P2 项（可选）
- [ ] 配置 Pre-commit Hook (预计 30 分钟)
- [ ] 替换模拟数据为真实 API (待后端就绪)
- [ ] 性能分析和优化 (预计 2 小时)

---

## 📊 总结

**当前完成度**: 85%

**核心功能**: ✅ 完整
**代码质量**: 🟡 需要改进
**测试覆盖**: ❌ 缺失
**性能优化**: ✅ 良好

**建议优先级**:
1. **立即修复**: ESLint 配置
2. **本周完成**: 测试配置 + 类型定义 + 图表库
3. **后续迭代**: API 替换 + 性能优化

**预计总工时**: 7-8 小时（不含测试用例编写）
