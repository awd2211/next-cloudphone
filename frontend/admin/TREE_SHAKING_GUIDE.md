# Tree Shaking 优化指南

Tree Shaking 是一种通过静态分析移除未使用代码的优化技术。本指南说明如何在项目中正确使用 Tree Shaking。

## 已优化的库

### 1. Ant Design Icons

**❌ 错误用法（全量导入 500+ icons）**:
```typescript
import * from '@ant-design/icons';
```

**✅ 正确用法（按需导入）**:
```typescript
import { UserOutlined, HomeOutlined } from '@ant-design/icons';
```

**效果**: 从 ~2MB 减少到 ~20KB（每个图标约 2KB）

---

### 2. Ant Design 组件

Ant Design 5.x 已支持自动 Tree Shaking，但仍需注意导入方式。

**✅ 推荐用法**:
```typescript
// 方式 1: 直接导入组件
import { Button, Table } from 'antd';

// 方式 2: 分别导入（适用于大量组件）
import Button from 'antd/es/button';
import Table from 'antd/es/table';
```

**效果**: 只打包使用的组件，减少 30-50% 体积

---

### 3. Lodash

**❌ 错误用法**:
```typescript
import _ from 'lodash';
import { debounce } from 'lodash';
```

**✅ 正确用法**:
```typescript
// 方式 1: 使用 lodash-es (ESM 版本)
import { debounce, throttle } from 'lodash-es';

// 方式 2: 单独导入函数
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';
```

**效果**: 从 ~70KB 减少到 ~5KB

---

### 4. ECharts

**❌ 错误用法（全量导入 500KB+）**:
```typescript
import * as echarts from 'echarts';
```

**✅ 正确用法（按需导入）**:
```typescript
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, CanvasRenderer]);
```

**效果**: 从 ~500KB 减少到 ~150KB

---

### 5. React Query DevTools

**✅ 条件导入（仅开发环境）**:
```typescript
// App.tsx
{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
```

**效果**: 生产环境完全移除 DevTools 代码（~200KB）

---

### 6. Date 库 (dayjs)

**✅ 正确用法**:
```typescript
// 只导入需要的插件
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
```

**避免导入所有语言包**:
```typescript
// ❌ 不要这样做
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en';
import 'dayjs/locale/ja';

// ✅ 只导入需要的语言包
import 'dayjs/locale/zh-cn';
```

---

### 7. Socket.IO Client

**✅ 正确用法**:
```typescript
import { io } from 'socket.io-client';

// 不要导入不需要的功能
// ❌ import { Manager, Socket } from 'socket.io-client';
```

---

## 通用最佳实践

### 1. 使用 ESM 版本的库

优先选择支持 ESM (ES Modules) 的库，例如:
- `lodash-es` 而不是 `lodash`
- `date-fns` 而不是 `moment`

### 2. 避免默认导入整个库

```typescript
// ❌ 错误
import utils from './utils';

// ✅ 正确
export { formatDate, formatCurrency } from './utils';
import { formatDate } from './utils';
```

### 3. 使用动态导入 (Code Splitting)

对于大型库或非首屏必需的功能:

```typescript
// 懒加载 Excel 导出库
const handleExport = async () => {
  const XLSX = await import('xlsx');
  // 使用 XLSX
};
```

### 4. 检查副作用 (Side Effects)

在 `package.json` 中标记无副作用的文件:

```json
{
  "sideEffects": false
}
```

或者明确指定有副作用的文件:

```json
{
  "sideEffects": ["*.css", "src/polyfills.ts"]
}
```

---

## 验证 Tree Shaking 效果

### 1. 使用构建分析器

```bash
# 生成可视化构建报告
pnpm build:analyze
```

打开 `dist/stats.html` 查看:
- 各个库的实际打包大小
- 是否有重复的依赖
- 未使用的大型模块

### 2. 检查 dist 目录

```bash
# 构建生产版本
pnpm build

# 查看文件大小
ls -lh dist/assets/
```

**预期结果**:
```
index-abc123.js       200 KB  (主入口)
react-vendor-def456.js 150 KB  (React 框架)
antd-vendor-ghi789.js  300 KB  (Ant Design)
charts-vendor-jkl012.js 150 KB (ECharts - 仅在需要时加载)
```

### 3. 使用浏览器 DevTools

1. 打开 Chrome DevTools → Coverage
2. 刷新页面
3. 查看 JavaScript 覆盖率

**目标**: 首屏覆盖率 > 60%

---

## 常见问题

### Q1: 为什么 Tree Shaking 没有生效？

**可能原因**:
1. 使用了 CommonJS 模块（`require()`）而不是 ESM
2. 库本身不支持 Tree Shaking
3. 存在副作用代码（如全局变量、立即执行函数）

**解决方法**:
- 检查 `package.json` 中的 `"type": "module"`
- 使用 `import` 而不是 `require`
- 查看库的 `package.json` 中的 `sideEffects` 字段

### Q2: 如何优化第三方库？

如果第三方库不支持 Tree Shaking:
1. 寻找替代库（如用 `date-fns` 替代 `moment`）
2. 使用动态导入延迟加载
3. 考虑自己实现简单功能

### Q3: CSS 也会 Tree Shaking 吗？

是的，Vite 支持 CSS Tree Shaking:
- 未使用的 CSS 类会被移除
- 确保使用 CSS Modules 或 Scoped CSS

---

## 性能目标

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 初始 JS 包大小 | 3.2 MB | 800 KB | -75% |
| Gzip 后大小 | 950 KB | 220 KB | -77% |
| 首屏加载时间 (3G) | 8.5s | 2.1s | -75% |
| JavaScript 覆盖率 | 35% | 68% | +94% |

---

## 检查清单

在提交代码前，确保:

- [ ] 所有第三方库使用命名导入（named imports）
- [ ] 大型库（ECharts, Monaco Editor）使用懒加载
- [ ] 开发工具（DevTools）仅在开发环境加载
- [ ] 运行 `pnpm build:analyze` 检查打包体积
- [ ] 首屏 JavaScript 覆盖率 > 60%
- [ ] 主 bundle 大小 < 500 KB (gzipped)

---

## 参考资料

- [Vite Tree Shaking](https://vitejs.dev/guide/features.html#tree-shaking)
- [Webpack Tree Shaking](https://webpack.js.org/guides/tree-shaking/)
- [Ant Design 按需加载](https://ant.design/docs/react/getting-started#import-on-demand)
- [ECharts 按需引入](https://echarts.apache.org/handbook/zh/basics/import)
