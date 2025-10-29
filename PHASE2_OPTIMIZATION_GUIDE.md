# Phase 2 性能优化使用指南

本文档详细说明如何使用 Phase 2 完成的性能优化功能。

---

## 目录

1. [React Query 使用指南](#react-query-使用指南)
2. [懒加载组件使用指南](#懒加载组件使用指南)
3. [性能优化最佳实践](#性能优化最佳实践)
4. [迁移指南](#迁移指南)

---

## React Query 使用指南

### 1. 基础配置

React Query 已在两个前端应用中配置完成：

**Admin 前端**:
```typescript
import { QueryProvider } from '@/lib/react-query';

// 在应用根组件包裹
<QueryProvider>
  <App />
</QueryProvider>
```

**User 前端**: 同样的配置方式

### 2. 使用设备管理 Hooks

我们提供了完整的设备管理 React Query hooks：

```typescript
import {
  useDevices,
  useDevice,
  useDeviceStats,
  useCreateDevice,
  useStartDevice,
  useStopDevice,
  useRebootDevice,
  useDeleteDevice
} from '@/hooks/useDevices';

// 在组件中使用
function DeviceList() {
  // 查询设备列表（自动缓存、去重、后台刷新）
  const { data, isLoading, error } = useDevices({
    page: 1,
    pageSize: 10
  });

  // 获取统计数据
  const { data: stats } = useDeviceStats();

  // 创建设备（自动失效相关缓存）
  const createMutation = useCreateDevice();

  // 启动设备（乐观更新）
  const startMutation = useStartDevice();

  const handleCreate = async (values: CreateDeviceDto) => {
    await createMutation.mutateAsync(values);
    // 自动刷新列表和统计，无需手动调用
  };

  const handleStart = async (deviceId: string) => {
    await startMutation.mutateAsync(deviceId);
    // UI 立即更新，失败时自动回滚
  };

  return (
    <div>
      {isLoading && <Spin />}
      {error && <Alert message="加载失败" />}
      {data?.items.map(device => (
        <DeviceCard key={device.id} device={device} />
      ))}
    </div>
  );
}
```

### 3. Query Keys 管理

使用层级化的 Query Keys 结构：

```typescript
export const deviceKeys = {
  all: ['devices'] as const,
  lists: () => [...deviceKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...deviceKeys.lists(), params] as const,
  details: () => [...deviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...deviceKeys.details(), id] as const,
  stats: () => [...deviceKeys.all, 'stats'] as const,
};

// 使用
const { data } = useQuery({
  queryKey: deviceKeys.list({ page: 1 }),
  queryFn: () => getDevices({ page: 1 })
});

// 失效特定查询
queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });

// 失效所有设备相关查询
queryClient.invalidateQueries({ queryKey: deviceKeys.all });
```

### 4. 乐观更新

启动设备示例：

```typescript
export function useStartDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deviceService.startDevice,

    // 乐观更新：立即更新 UI
    onMutate: async (deviceId) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({
        queryKey: deviceKeys.detail(deviceId)
      });

      // 保存旧数据
      const previousDevice = queryClient.getQueryData<Device>(
        deviceKeys.detail(deviceId)
      );

      // 立即更新 UI（乐观更新）
      if (previousDevice) {
        queryClient.setQueryData<Device>(
          deviceKeys.detail(deviceId),
          { ...previousDevice, status: 'running' }
        );
      }

      return { previousDevice };
    },

    // 成功后刷新数据
    onSuccess: (_, deviceId) => {
      queryClient.invalidateQueries({
        queryKey: deviceKeys.detail(deviceId)
      });
      queryClient.invalidateQueries({
        queryKey: deviceKeys.lists()
      });
      queryClient.invalidateQueries({
        queryKey: deviceKeys.stats()
      });
      message.success('设备启动成功');
    },

    // 失败时回滚
    onError: (error: any, deviceId, context) => {
      if (context?.previousDevice) {
        queryClient.setQueryData(
          deviceKeys.detail(deviceId),
          context.previousDevice
        );
      }
      message.error(`启动失败: ${error.message}`);
    },
  });
}
```

### 5. WebSocket 集成

将 WebSocket 消息与 React Query 缓存集成：

```typescript
useEffect(() => {
  if (lastMessage) {
    const { type, data } = lastMessage;

    if (type === 'device:status') {
      // 直接更新缓存
      queryClient.setQueryData(
        deviceKeys.list(params),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((device: Device) =>
              device.id === data.deviceId
                ? { ...device, status: data.status }
                : device
            ),
          };
        }
      );

      // 失效统计数据
      queryClient.invalidateQueries({
        queryKey: deviceKeys.stats()
      });
    }
  }
}, [lastMessage, params]);
```

---

## 懒加载组件使用指南

### 1. 可用的懒加载组件

所有懒加载组件都在 `@/components/LazyComponents` 中导出：

```typescript
import {
  // 通用 ECharts 组件
  EChartsLazy,

  // WebRTC 和 ADB
  WebRTCPlayerLazy,
  ADBConsoleLazy,

  // 图表组件
  RevenueChartLazy,
  DeviceStatusChartLazy,
  UserGrowthChartLazy,
  PlanDistributionChartLazy,
} from '@/components/LazyComponents';
```

### 2. 使用示例

#### 设备详情页

```typescript
import { WebRTCPlayerLazy, ADBConsoleLazy } from '@/components/LazyComponents';

const DeviceDetail = ({ deviceId }: { deviceId: string }) => {
  return (
    <Tabs>
      <TabPane tab="设备屏幕" key="screen">
        {/* WebRTC 播放器按需加载 */}
        <WebRTCPlayerLazy deviceId={deviceId} />
      </TabPane>

      <TabPane tab="ADB 控制台" key="console">
        {/* ADB 控制台按需加载 */}
        <ADBConsoleLazy deviceId={deviceId} />
      </TabPane>
    </Tabs>
  );
};
```

#### Dashboard 页面

```typescript
import {
  RevenueChartLazy,
  DeviceStatusChartLazy,
  UserGrowthChartLazy,
  PlanDistributionChartLazy
} from '@/components/LazyComponents';

const Dashboard = () => {
  const { data: revenueData } = useRevenueStats();
  const { data: deviceStats } = useDeviceStats();
  const { data: userGrowth } = useUserGrowth();
  const { data: planDistribution } = usePlanDistribution();

  return (
    <div>
      <Row gutter={16}>
        <Col span={16}>
          {/* 图表组件懒加载，带自动 Loading */}
          <RevenueChartLazy data={revenueData} />
        </Col>
        <Col span={8}>
          <DeviceStatusChartLazy data={deviceStats} />
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={16}>
          <UserGrowthChartLazy data={userGrowth} />
        </Col>
        <Col span={8}>
          <PlanDistributionChartLazy data={planDistribution} />
        </Col>
      </Row>
    </div>
  );
};
```

#### 通用 ECharts 使用

```typescript
import { EChartsLazy } from '@/components/LazyComponents';

const CustomChart = () => {
  const option = {
    title: { text: '自定义图表' },
    xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed'] },
    yAxis: { type: 'value' },
    series: [{ data: [120, 200, 150], type: 'line' }]
  };

  return (
    <EChartsLazy
      option={option}
      style={{ height: 400 }}
    />
  );
};
```

### 3. 自定义 Loading Fallback

```typescript
import { withLazyLoad, lazy } from '@/components/LazyComponents';

// 创建自定义懒加载组件
const LazyMyComponent = lazy(() => import('./MyComponent'));

// 使用自定义 Loading
const MyComponentLazy = withLazyLoad(
  LazyMyComponent,
  <div style={{ padding: '50px', textAlign: 'center' }}>
    <Spin size="large" />
    <p>加载我的组件中...</p>
  </div>
);

export default MyComponentLazy;
```

---

## 性能优化最佳实践

### 1. useMemo 优化

用于缓存计算结果，避免重复计算：

```typescript
import { useMemo } from 'react';

const DeviceList = ({ devices }: { devices: Device[] }) => {
  // ✅ 使用 useMemo 缓存映射对象
  const statusMap = useMemo(() => ({
    idle: { color: 'default', text: '空闲' },
    running: { color: 'green', text: '运行中' },
    stopped: { color: 'red', text: '已停止' },
    error: { color: 'error', text: '错误' },
  }), []); // 空依赖，只创建一次

  // ✅ 缓存导出数据转换
  const exportData = useMemo(() =>
    devices.map(device => ({
      '设备ID': device.id,
      '设备名称': device.name,
      '状态': statusMap[device.status].text,
      'CPU': device.cpuCores,
      '内存': `${device.memoryMB}MB`,
    })),
    [devices, statusMap] // 当 devices 变化时重新计算
  );

  // ✅ 缓存表格列配置
  const columns: ColumnsType<Device> = useMemo(() => [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    // ... 更多列
  ], []); // 列配置不变，只创建一次

  return <Table columns={columns} dataSource={devices} />;
};
```

### 2. useCallback 优化

用于缓存函数引用，避免子组件不必要的重渲染：

```typescript
import { useCallback } from 'react';

const DeviceList = () => {
  const { data: devices } = useDevices();
  const startMutation = useStartDevice();
  const stopMutation = useStopDevice();
  const deleteMutation = useDeleteDevice();

  // ✅ 使用 useCallback 缓存函数
  const handleStart = useCallback(async (deviceId: string) => {
    await startMutation.mutateAsync(deviceId);
  }, [startMutation]); // 依赖 startMutation

  const handleStop = useCallback(async (deviceId: string) => {
    await stopMutation.mutateAsync(deviceId);
  }, [stopMutation]);

  const handleDelete = useCallback(async (deviceId: string) => {
    await deleteMutation.mutateAsync(deviceId);
  }, [deleteMutation]);

  // ✅ 导出操作也使用 useCallback
  const handleExportExcel = useCallback(() => {
    exportToExcel(devices, '设备列表');
    message.success('导出成功');
  }, [devices]);

  return (
    <div>
      {devices?.map(device => (
        <DeviceCard
          key={device.id}
          device={device}
          onStart={handleStart}  // 函数引用不变，DeviceCard 不会重渲染
          onStop={handleStop}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
};
```

### 3. 何时使用 useMemo 和 useCallback

**使用 useMemo 的场景**:
- ✅ 复杂的数据转换或计算
- ✅ 映射对象（statusMap, configMap 等）
- ✅ 数组过滤、排序、映射操作
- ✅ Table columns 配置
- ✅ 大型对象创建

**使用 useCallback 的场景**:
- ✅ 传递给子组件的事件处理函数
- ✅ 用作 useEffect 的依赖项的函数
- ✅ 传递给优化过的子组件（使用 React.memo）的函数
- ✅ 防抖/节流函数

**不需要使用的场景**:
- ❌ 简单的原始值计算（性能开销大于收益）
- ❌ 只在一处使用的简单函数
- ❌ 没有传递给子组件的函数

---

## 迁移指南

### 从手动状态管理迁移到 React Query

#### 迁移前（手动管理）

```typescript
// ❌ 旧代码：手动管理状态
const [devices, setDevices] = useState<Device[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [total, setTotal] = useState(0);

const loadDevices = async () => {
  setLoading(true);
  setError(null);
  try {
    const res = await getDevices({ page, pageSize });
    setDevices(res.data);
    setTotal(res.total);
  } catch (err) {
    setError('加载失败');
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadDevices();
}, [page, pageSize]);

// 每次操作后都要手动刷新
const handleCreate = async (values: CreateDeviceDto) => {
  try {
    await createDevice(values);
    message.success('创建成功');
    await loadDevices();  // 手动刷新
    await loadStats();    // 手动刷新
  } catch (err) {
    message.error('创建失败');
  }
};
```

#### 迁移后（React Query）

```typescript
// ✅ 新代码：React Query 自动管理
const params = useMemo(() => ({ page, pageSize }), [page, pageSize]);
const { data, isLoading, error } = useDevices(params);
const createMutation = useCreateDevice();

const devices = data?.items || [];
const total = data?.total || 0;

// 操作后自动失效缓存，无需手动刷新
const handleCreate = useCallback(async (values: CreateDeviceDto) => {
  await createMutation.mutateAsync(values);
  // 自动刷新列表和统计
}, [createMutation]);
```

### 迁移步骤

1. **安装依赖** (已完成)
   ```bash
   pnpm add @tanstack/react-query @tanstack/react-query-devtools
   ```

2. **添加 QueryProvider** (已完成)
   ```typescript
   import { QueryProvider } from '@/lib/react-query';

   <QueryProvider>
     <App />
   </QueryProvider>
   ```

3. **创建 Query Hooks**

   参考 `frontend/admin/src/hooks/useDevices.ts` 创建其他资源的 hooks：

   ```typescript
   // hooks/useUsers.ts
   export const userKeys = {
     all: ['users'] as const,
     lists: () => [...userKeys.all, 'list'] as const,
     list: (params?: PaginationParams) => [...userKeys.lists(), params] as const,
     detail: (id: string) => [...userKeys.all, 'detail', id] as const,
   };

   export function useUsers(params?: PaginationParams) {
     return useQuery({
       queryKey: userKeys.list(params),
       queryFn: () => userService.getUsers(params),
     });
   }

   export function useCreateUser() {
     const queryClient = useQueryClient();
     return useMutation({
       mutationFn: userService.createUser,
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: userKeys.lists() });
         message.success('用户创建成功');
       },
     });
   }
   ```

4. **更新组件**

   将手动状态管理替换为 React Query hooks（参考上面的示例）

5. **测试验证**

   - 检查数据加载正常
   - 验证缓存工作正常（30秒内不重复请求）
   - 测试乐观更新效果
   - 验证错误处理

---

## 性能监控

### 使用 React Query DevTools

开发环境自动显示，查看查询状态和缓存：

```typescript
// 已在 QueryProvider 中配置
{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
```

### 监控指标

在浏览器 Network 面板观察：

- **请求去重**: 相同的请求只发送一次
- **缓存命中**: 30秒内不重复请求
- **后台刷新**: 窗口聚焦时自动刷新数据
- **乐观更新**: 操作后 UI 立即响应

### Bundle 分析

```bash
# 构建并分析 bundle 大小
cd frontend/admin
pnpm build

# 查看 dist/assets/js/ 中的 chunk 大小
ls -lh dist/assets/js/
```

---

## 常见问题

### Q1: 如何禁用某个查询的自动刷新？

```typescript
const { data } = useDevices(params, {
  refetchOnWindowFocus: false,  // 禁用窗口聚焦刷新
  refetchOnReconnect: false,    // 禁用重连刷新
  staleTime: Infinity,          // 数据永不过期
});
```

### Q2: 如何手动触发刷新？

```typescript
const { refetch } = useDevices(params);

// 手动触发刷新
await refetch();
```

### Q3: 如何清除特定缓存？

```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// 清除特定查询
queryClient.removeQueries({ queryKey: deviceKeys.list(params) });

// 清除所有设备相关查询
queryClient.removeQueries({ queryKey: deviceKeys.all });
```

### Q4: 懒加载组件加载失败怎么办？

组件已内置错误处理，会显示 "加载失败" 提示。可以添加重试逻辑：

```typescript
const LazyComponent = lazy(() =>
  import('./Component')
    .catch(err => {
      console.error('Failed to load component:', err);
      // 可以添加重试逻辑
      return import('./Component');
    })
);
```

---

## 参考资料

- [React Query 官方文档](https://tanstack.com/query/latest)
- [React.lazy 官方文档](https://react.dev/reference/react/lazy)
- [PHASE2_PROGRESS_REPORT.md](./PHASE2_PROGRESS_REPORT.md) - Phase 2 完整报告
- [DEVICE_LIST_OPTIMIZATION_COMPARISON.md](./DEVICE_LIST_OPTIMIZATION_COMPARISON.md) - 优化对比

---

**最后更新**: 2025-10-29
**版本**: 1.0.0
