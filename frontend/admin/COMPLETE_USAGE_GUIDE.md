# 完整使用指南

本指南提供云手机平台管理后台优化后的**完整使用说明**，包括所有新功能、工具和最佳实践。

---

## 📚 目录

1. [快速开始](#快速开始)
2. [React Query 使用](#react-query-使用)
3. [骨架屏组件](#骨架屏组件)
4. [常量管理](#常量管理)
5. [错误处理](#错误处理)
6. [性能监控](#性能监控)
7. [优化组件库](#优化组件库)
8. [开发者工具](#开发者工具)
9. [单元测试](#单元测试)
10. [最佳实践](#最佳实践)

---

## 快速开始

### 安装依赖

```bash
cd frontend/admin
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:5173

### 构建生产版本

```bash
pnpm build
```

### 运行测试

```bash
# 安装测试依赖
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

# 运行测试
pnpm test

# 生成覆盖率报告
pnpm test:coverage
```

---

## React Query 使用

### 1. 查询数据

```tsx
import { useDevices } from '@/hooks/queries/useDevices';
import { TableSkeleton } from '@/components/PageSkeleton';

function DeviceList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useDevices({
    page,
    pageSize: 10,
  });

  // 显示骨架屏
  if (isLoading) return <TableSkeleton />;

  // 错误处理
  if (isError) {
    return (
      <div>
        <p>加载失败</p>
        <Button onClick={() => refetch()}>重试</Button>
      </div>
    );
  }

  return <Table dataSource={data?.data} />;
}
```

### 2. 创建/更新/删除

```tsx
import { useCreateDevice, useDeleteDevice } from '@/hooks/queries/useDevices';
import { MESSAGES } from '@/constants';

function DeviceActions() {
  const createDevice = useCreateDevice();
  const deleteDevice = useDeleteDevice();

  const handleCreate = async (values) => {
    try {
      await createDevice.mutateAsync(values);
      // 列表自动刷新
    } catch (error) {
      // 错误已自动处理
    }
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '删除设备',
      content: DEVICE_MESSAGES.DELETE_CONFIRM,
      onOk: () => deleteDevice.mutateAsync(id),
    });
  };

  return (
    <>
      <Button
        onClick={handleCreate}
        loading={createDevice.isPending}
      >
        创建
      </Button>
      <Button
        onClick={() => handleDelete('device-id')}
        loading={deleteDevice.isPending}
        danger
      >
        删除
      </Button>
    </>
  );
}
```

### 3. 自定义 Query

```tsx
// 创建新的 Query Hook
export function useMyData(params) {
  return useQuery({
    queryKey: ['myData', params],
    queryFn: () => fetchMyData(params),
    staleTime: 30000, // 30秒保鲜期
    gcTime: 300000, // 5分钟缓存
  });
}

// 创建 Mutation
export function useMyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => createMyData(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myData'] });
      message.success('操作成功');
    },
  });
}
```

---

## 骨架屏组件

### 可用组件

```tsx
import {
  TableSkeleton,
  DetailSkeleton,
  FormSkeleton,
  DashboardSkeleton,
  CardListSkeleton,
  ContentSkeleton,
  CardSkeleton,
} from '@/components/PageSkeleton';

// 表格骨架 - 用于列表页
<TableSkeleton rows={10} />

// 详情骨架 - 用于详情页
<DetailSkeleton />

// 表单骨架 - 用于表单页
<FormSkeleton fields={6} />

// 仪表盘骨架 - 用于仪表盘
<DashboardSkeleton />

// 卡片列表骨架
<CardListSkeleton count={6} />

// 内容骨架
<ContentSkeleton rows={5} />

// 单个卡片骨架
<CardSkeleton hasAvatar rows={4} />
```

### 完整示例

```tsx
function MyPage() {
  const { data, isLoading } = useMyData();

  if (isLoading) {
    return <TableSkeleton rows={10} />;
  }

  return <MyContent data={data} />;
}
```

---

## 常量管理

### 状态常量

```tsx
import {
  DEVICE_STATUS,
  DEVICE_STATUS_TEXT,
  DEVICE_STATUS_COLOR,
} from '@/constants';

// 使用状态
const status = DEVICE_STATUS.RUNNING;

// 显示状态
<Tag color={DEVICE_STATUS_COLOR[status]}>
  {DEVICE_STATUS_TEXT[status]}
</Tag>
```

### 消息常量

```tsx
import { MESSAGES, DEVICE_MESSAGES } from '@/constants';

// 通用消息
message.success(MESSAGES.SUCCESS.CREATE);
message.error(MESSAGES.ERROR.UPDATE);

// 设备特定消息
message.success(DEVICE_MESSAGES.START_SUCCESS);

// 确认对话框
Modal.confirm({
  title: '删除设备',
  content: DEVICE_MESSAGES.DELETE_CONFIRM,
  onOk: handleDelete,
});
```

### 路由常量

```tsx
import { ROUTES, getRoute } from '@/constants';

// 跳转
navigate(ROUTES.DEVICE_LIST);

// 带参数跳转
const url = getRoute(ROUTES.DEVICE_DETAIL, { id: 'device-123' });
navigate(url);
```

### 时间常量

```tsx
import { SEARCH_DEBOUNCE_DELAY, DEVICE_STATUS_POLL_INTERVAL } from '@/constants';

// 防抖延迟
const debouncedSearch = debounce(search, SEARCH_DEBOUNCE_DELAY);

// 轮询间隔
setInterval(updateStatus, DEVICE_STATUS_POLL_INTERVAL);
```

---

## 错误处理

### ErrorAlert 组件

```tsx
import { ErrorAlert } from '@/components/ErrorAlert';

function MyComponent() {
  const [error, setError] = useState(null);

  return (
    <>
      {error && (
        <ErrorAlert
          error={error}
          onRetry={() => retry()}
          onReport={() => report()}
          showDetails
        />
      )}
    </>
  );
}
```

### useErrorHandler Hook

```tsx
import { useErrorHandler } from '@/hooks/useErrorHandler';

function MyComponent() {
  const { handleError, handlePromiseError } = useErrorHandler();

  const loadData = async () => {
    try {
      const data = await fetchData();
      return data;
    } catch (error) {
      handleError(error, { showModal: true });
    }
  };

  // 或者使用 Promise 包装器
  const data = await handlePromiseError(
    fetchData(),
    { customMessage: '加载数据失败' }
  );
}
```

---

## 性能监控

### usePerformance Hook

```tsx
import { usePerformance } from '@/hooks/usePerformance';

function MyComponent() {
  const metrics = usePerformance({
    componentName: 'MyComponent',
    logToConsole: true,
  });

  return (
    <div>
      <p>渲染次数: {metrics.renderCount}</p>
      <p>平均更新时间: {metrics.averageUpdateTime.toFixed(2)}ms</p>
    </div>
  );
}
```

### PerformanceMonitor 组件

```tsx
import { PerformanceMonitor } from '@/hooks/usePerformance';

function App() {
  return (
    <>
      <YourApp />
      {/* 开发环境显示性能监控器 */}
      <PerformanceMonitor position="bottom-right" />
    </>
  );
}
```

### Web Vitals 监控

```tsx
import { useWebVitals } from '@/hooks/usePerformance';

function Analytics() {
  const vitals = useWebVitals();

  console.log('FCP:', vitals.fcp);
  console.log('LCP:', vitals.lcp);
  console.log('FID:', vitals.fid);
  console.log('CLS:', vitals.cls);
}
```

---

## 优化组件库

### LazyImage - 懒加载图片

```tsx
import { LazyImage } from '@/components/OptimizedComponents';

<LazyImage
  src="https://example.com/image.jpg"
  alt="Description"
  placeholder="/placeholder.png"
  onLoad={() => console.log('Image loaded')}
/>
```

### DebouncedInput - 防抖输入框

```tsx
import { DebouncedInput } from '@/components/OptimizedComponents';

<DebouncedInput
  value={searchKeyword}
  onChange={(value) => setSearchKeyword(value)}
  delay={500}
  placeholder="搜索..."
/>
```

### InfiniteScroll - 无限滚动

```tsx
import { InfiniteScroll } from '@/components/OptimizedComponents';

<InfiniteScroll
  hasMore={hasMore}
  loadMore={loadMore}
  loading={loading}
  loader={<Spin />}
  endMessage={<div>没有更多了</div>}
>
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</InfiniteScroll>
```

### BatchSelect - 批量选择

```tsx
import { BatchSelect } from '@/components/OptimizedComponents';

<BatchSelect
  items={devices}
  selectedIds={selectedIds}
  onSelectionChange={setSelectedIds}
  keyExtractor={(device) => device.id}
  renderItem={(device, selected, onToggle) => (
    <div>
      <input type="checkbox" checked={selected} onChange={onToggle} />
      {device.name}
    </div>
  )}
  renderBatchActions={(count, clear) => (
    <div>
      已选择 {count} 项
      <Button onClick={clear}>清除</Button>
      <Button onClick={handleBatchDelete}>批量删除</Button>
    </div>
  )}
/>
```

---

## 开发者工具

### PerformanceLogger

```tsx
import { PerformanceLogger } from '@/utils/devTools';

// 计时
PerformanceLogger.start('loadData');
await loadData();
PerformanceLogger.end('loadData');

// 测量函数
const { result, duration } = await PerformanceLogger.measure(
  'complexCalculation',
  () => heavyComputation()
);
```

### useWhyDidYouUpdate

```tsx
import { useWhyDidYouUpdate } from '@/utils/devTools';

function MyComponent(props) {
  // 追踪 props 变化
  useWhyDidYouUpdate('MyComponent', props);

  return <div>...</div>;
}
```

### MemoryLeakDetector

```tsx
import { MemoryLeakDetector } from '@/utils/devTools';

// 开始监控
useEffect(() => {
  MemoryLeakDetector.start(5000);
  return () => MemoryLeakDetector.stop();
}, []);
```

### 全局调试工具

在开发环境的浏览器控制台中：

```javascript
// 分析 Bundle 大小
window.__DEV_TOOLS__.analyzeBundleSize();

// 查看 API 统计
window.__DEV_TOOLS__.ApiLogger.printStats();

// 性能日志
window.__DEV_TOOLS__.PerformanceLogger.start('test');
```

---

## 单元测试

### 运行测试

```bash
# 运行所有测试
pnpm test

# 监听模式
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage
```

### 测试组件

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### 测试 Hooks

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useMyHook } from './useMyHook';

describe('useMyHook', () => {
  it('should return data', async () => {
    const { result } = renderHook(() => useMyHook());

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });
});
```

更多测试示例请参考 `src/tests/example.test.tsx`

---

## 最佳实践

### 1. 组件结构

```tsx
// ✅ 推荐的组件结构
import { memo, useMemo, useCallback } from 'react';

interface Props {
  data: Data[];
}

export const MyComponent = memo(({ data }: Props) => {
  // 使用 useMemo 缓存计算
  const filteredData = useMemo(() => {
    return data.filter(item => item.active);
  }, [data]);

  // 使用 useCallback 缓存函数
  const handleClick = useCallback((id: string) => {
    console.log('Clicked:', id);
  }, []);

  return <div>...</div>;
});

MyComponent.displayName = 'MyComponent';
```

### 2. API 调用

```tsx
// ✅ 使用 React Query
const { data, isLoading } = useDevices({ page, pageSize });

// ❌ 避免直接使用 useState + useEffect
const [data, setData] = useState([]);
useEffect(() => {
  loadData();
}, []);
```

### 3. 错误处理

```tsx
// ✅ 统一错误处理
const { handleError } = useErrorHandler();

try {
  await operation();
} catch (error) {
  handleError(error, { showModal: true });
}

// ❌ 避免简单的 console.error
catch (error) {
  console.error(error);
}
```

### 4. 常量使用

```tsx
// ✅ 使用常量
import { DEVICE_STATUS, MESSAGES } from '@/constants';

if (status === DEVICE_STATUS.RUNNING) {
  message.success(MESSAGES.SUCCESS.START);
}

// ❌ 避免硬编码
if (status === 'running') {
  message.success('启动成功');
}
```

### 5. 性能优化

```tsx
// ✅ 优化列表渲染
const columns = useMemo(() => [...], []);
const handleDelete = useCallback((id) => {...}, []);

// ✅ 虚拟滚动大列表
<VirtualList items={largeList} itemHeight={60} />

// ✅ 懒加载图片
<LazyImage src={url} alt="..." />
```

---

## 📁 项目结构

```
frontend/admin/src/
├── components/          # 公共组件
│   ├── PageSkeleton.tsx        # 骨架屏
│   ├── ErrorAlert.tsx          # 错误提示
│   ├── OptimizedComponents.tsx # 优化组件库
│   └── ...
├── hooks/              # 自定义 Hooks
│   ├── queries/               # React Query Hooks
│   │   ├── useDevices.ts
│   │   └── useUsers.ts
│   ├── useErrorHandler.ts     # 错误处理
│   ├── usePerformance.ts      # 性能监控
│   └── ...
├── constants/          # 常量定义
│   ├── pagination.ts
│   ├── status.ts
│   ├── timing.ts
│   ├── routes.ts
│   ├── messages.ts
│   └── index.ts
├── lib/                # 第三方库配置
│   └── react-query.tsx
├── utils/              # 工具函数
│   ├── request.ts
│   ├── api-helpers.ts
│   └── devTools.ts
├── tests/              # 测试文件
│   ├── setup.ts
│   └── example.test.tsx
└── ...
```

---

## 🔗 相关文档

- [优化指南](./OPTIMIZATION_GUIDE.md) - React Query、骨架屏、常量使用
- [性能最佳实践](./PERFORMANCE_BEST_PRACTICES.md) - memo、useMemo、useCallback
- [迁移指南](./MIGRATION_GUIDE.md) - 如何迁移现有页面
- [优化报告](../FRONTEND_ADMIN_OPTIMIZATION_REPORT.md) - 详细优化记录
- [优化清单](./OPTIMIZATION_CHECKLIST.md) - 待办事项追踪

---

## 🆘 常见问题

### Q: React Query 数据不更新？
A: 检查 Mutation 的 `onSuccess` 中是否调用了 `invalidateQueries`

### Q: 骨架屏闪烁？
A: 使用 `placeholderData` 保持旧数据，或增加 `staleTime`

### Q: 类型错误？
A: 确保 Query Hook 的返回类型与 API 响应类型一致

### Q: 性能问题？
A: 使用 `<PerformanceMonitor />` 查看性能指标，根据建议优化

---

**最后更新**: 2025-10-28
**维护者**: Frontend Team
