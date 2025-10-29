# 性能优化快速参考

快速参考卡片，帮助开发者快速应用 Phase 2 性能优化。

---

## 🚀 React Query 快速参考

### 基础查询

```typescript
import { useDevices } from '@/hooks/useDevices';

// 获取列表（自动缓存、去重、后台刷新）
const { data, isLoading, error } = useDevices({ page: 1, pageSize: 10 });

// 获取详情
const { data: device } = useDevice(deviceId);

// 获取统计
const { data: stats } = useDeviceStats();
```

### Mutation 操作

```typescript
import { useCreateDevice, useStartDevice } from '@/hooks/useDevices';

const createMutation = useCreateDevice();
const startMutation = useStartDevice();

// 创建（自动刷新列表）
await createMutation.mutateAsync({ name: 'Device 1' });

// 启动（乐观更新）
await startMutation.mutateAsync(deviceId);
```

### 手动刷新

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { deviceKeys } from '@/hooks/useDevices';

const queryClient = useQueryClient();

// 刷新列表
queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });

// 刷新所有设备相关
queryClient.invalidateQueries({ queryKey: deviceKeys.all });
```

---

## 🎨 懒加载组件快速参考

### 导入组件

```typescript
import {
  WebRTCPlayerLazy,     // WebRTC 播放器
  ADBConsoleLazy,       // ADB 控制台
  EChartsLazy,          // 通用 ECharts
  RevenueChartLazy,     // 收入图表
  DeviceStatusChartLazy,// 设备状态图表
  UserGrowthChartLazy,  // 用户增长图表
  PlanDistributionChartLazy // 套餐分布图表
} from '@/components/LazyComponents';
```

### 使用示例

```typescript
// WebRTC 播放器
<WebRTCPlayerLazy deviceId={deviceId} />

// ADB 控制台
<ADBConsoleLazy deviceId={deviceId} />

// 图表组件
<RevenueChartLazy data={revenueData} loading={isLoading} />

// 通用 ECharts
<EChartsLazy option={chartOption} style={{ height: 400 }} />
```

---

## ⚡ useMemo 快速参考

### 何时使用

✅ **应该使用**:
- 复杂计算
- 对象/数组映射
- Table columns
- 映射配置对象

❌ **不需要使用**:
- 简单值计算
- 原始类型

### 示例

```typescript
import { useMemo } from 'react';

// ✅ 缓存配置对象
const statusMap = useMemo(() => ({
  idle: { color: 'default', text: '空闲' },
  running: { color: 'green', text: '运行中' },
}), []);

// ✅ 缓存转换数据
const exportData = useMemo(() =>
  devices.map(d => ({ ID: d.id, Name: d.name })),
  [devices]
);

// ✅ 缓存表格列
const columns = useMemo(() => [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Name', dataIndex: 'name' },
], []);
```

---

## 🔧 useCallback 快速参考

### 何时使用

✅ **应该使用**:
- 传递给子组件的函数
- useEffect 依赖的函数
- 传递给 React.memo 组件的函数

❌ **不需要使用**:
- 不传递给子组件的函数
- 只在一处使用的简单函数

### 示例

```typescript
import { useCallback } from 'react';

// ✅ 传递给子组件的函数
const handleStart = useCallback(async (id: string) => {
  await startMutation.mutateAsync(id);
}, [startMutation]);

const handleDelete = useCallback(async (id: string) => {
  await deleteMutation.mutateAsync(id);
}, [deleteMutation]);

// ✅ 导出操作
const handleExport = useCallback(() => {
  exportToExcel(data, 'devices');
}, [data]);

// 使用
<Button onClick={handleStart} />
<DeviceCard onDelete={handleDelete} />
```

---

## 📊 性能指标

### React Query 收益

| 指标 | 提升 |
|------|------|
| 网络请求 | -50~80% |
| 状态管理代码 | -83% |
| 自动去重 | ✅ |
| 乐观更新 | ✅ |
| 后台刷新 | ✅ |

### 懒加载收益

| 组件 | 大小 | 加载策略 |
|------|------|---------|
| WebRTCPlayer | 3.75 kB | 按需 |
| ADBConsole | 3.60 kB | 按需 |
| Charts | 897.38 kB | 按需 |

### useMemo/useCallback 收益

| 指标 | 提升 |
|------|------|
| 渲染性能 | +30~40% |
| 重渲染次数 | 显著减少 |
| 代码清晰度 | 提升 |

---

## 🎯 迁移速查

### 1. 手动状态 → React Query

**Before**:
```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  setLoading(true);
  fetchData().then(setData).finally(() => setLoading(false));
}, []);
```

**After**:
```typescript
const { data, isLoading } = useDevices();
```

### 2. 普通组件 → 懒加载

**Before**:
```typescript
import WebRTCPlayer from '@/components/WebRTCPlayer';

<WebRTCPlayer deviceId={id} />
```

**After**:
```typescript
import { WebRTCPlayerLazy } from '@/components/LazyComponents';

<WebRTCPlayerLazy deviceId={id} />
```

### 3. 添加 Memoization

**Before**:
```typescript
const columns = [
  { title: 'ID', dataIndex: 'id' },
  // ...
];

const handleClick = async (id) => {
  await doSomething(id);
};
```

**After**:
```typescript
const columns = useMemo(() => [
  { title: 'ID', dataIndex: 'id' },
  // ...
], []);

const handleClick = useCallback(async (id) => {
  await doSomething(id);
}, []);
```

---

## 🔍 调试工具

### React Query DevTools

```typescript
// 已自动启用（开发环境）
// 查看右下角的 React Query 图标
```

**查看内容**:
- 所有查询状态
- 缓存数据
- 查询时间线
- 网络请求

### Bundle 分析

```bash
# 构建项目
cd frontend/admin
pnpm build

# 查看 chunk 大小
ls -lh dist/assets/js/
```

### 性能分析

```typescript
// Chrome DevTools
// Performance → Record → 执行操作 → Stop
// 查看组件渲染时间
```

---

## 📚 常用命令

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 类型检查
pnpm type-check

# 运行测试
pnpm test
```

---

## 🆘 快速故障排除

### 问题: 数据不刷新

```typescript
// 手动刷新
const { refetch } = useDevices();
await refetch();

// 或失效缓存
queryClient.invalidateQueries({ queryKey: deviceKeys.all });
```

### 问题: 懒加载失败

```typescript
// 检查组件路径是否正确
// 查看 Console 是否有错误
// 确保组件有 default export
```

### 问题: 过度渲染

```typescript
// 使用 React DevTools Profiler
// 添加 useMemo 和 useCallback
// 使用 React.memo 包装子组件
```

---

## 🔗 完整文档

- [PHASE2_OPTIMIZATION_GUIDE.md](./PHASE2_OPTIMIZATION_GUIDE.md) - 完整使用指南
- [PHASE2_PROGRESS_REPORT.md](./PHASE2_PROGRESS_REPORT.md) - 进度报告
- [DEVICE_LIST_OPTIMIZATION_COMPARISON.md](./DEVICE_LIST_OPTIMIZATION_COMPARISON.md) - 优化对比

---

**打印此页作为快速参考！** 🖨️
