# 迁移到优化架构指南

本指南帮助团队将现有页面迁移到优化后的架构（React Query + 骨架屏 + 常量）。

---

## 📋 迁移清单

### 阶段 1: 准备工作 (预计 1 天)

- [x] 安装依赖 (`@tanstack/react-query`)
- [x] 创建 QueryClient 配置
- [x] 集成 QueryProvider
- [x] 创建骨架屏组件
- [x] 创建常量文件
- [ ] 团队培训和知识分享

### 阶段 2: 核心页面迁移 (预计 2-3 天)

优先迁移高频访问的页面：

- [ ] 设备列表页 (Device/List.tsx)
- [ ] 用户列表页 (User/List.tsx)
- [ ] 仪表盘 (Dashboard/index.tsx)
- [ ] 应用列表页 (App/List.tsx)

### 阶段 3: 次要页面迁移 (预计 3-5 天)

- [ ] 订单管理页面
- [ ] 支付管理页面
- [ ] 账单管理页面
- [ ] 权限管理页面
- [ ] 其他管理页面

### 阶段 4: 验证和优化 (预计 2 天)

- [ ] 性能测试
- [ ] 用户体验验证
- [ ] Bug 修复
- [ ] 代码审查

---

## 🔄 迁移步骤

### 步骤 1: 创建 Query Hooks

#### 1.1 分析现有 API 调用

找出页面中所有的 API 调用：

```tsx
// 旧代码 - Device/List.tsx
const loadDevices = async () => {
  setLoading(true);
  try {
    const response = await getDevices({ page, pageSize });
    setDevices(response.data);
    setTotal(response.total);
  } catch (error) {
    message.error('加载失败');
  } finally {
    setLoading(false);
  }
};
```

#### 1.2 创建对应的 Query Hook

在 `src/hooks/queries/` 创建 Hook 文件：

```tsx
// src/hooks/queries/useDevices.ts
import { useQuery } from '@tanstack/react-query';
import { getDevices } from '@/services/device';
import type { PaginationParams } from '@/types';

export const deviceKeys = {
  all: ['devices'] as const,
  lists: () => [...deviceKeys.all, 'list'] as const,
  list: (params: PaginationParams) => [...deviceKeys.lists(), params] as const,
};

export function useDevices(params: PaginationParams) {
  return useQuery({
    queryKey: deviceKeys.list(params),
    queryFn: () => getDevices(params),
    placeholderData: (previousData) => previousData,
  });
}
```

### 步骤 2: 替换状态管理

#### 2.1 移除本地状态

**之前**:
```tsx
const [devices, setDevices] = useState<Device[]>([]);
const [loading, setLoading] = useState(false);
const [total, setTotal] = useState(0);
```

**之后**:
```tsx
const { data, isLoading, isError, refetch } = useDevices({ page, pageSize });
```

#### 2.2 移除 useEffect

**之前**:
```tsx
useEffect(() => {
  loadDevices();
}, [page, pageSize]);
```

**之后**:
```tsx
// 不需要 useEffect，React Query 自动处理
```

### 步骤 3: 添加骨架屏

#### 3.1 导入骨架屏组件

```tsx
import { TableSkeleton } from '@/components/PageSkeleton';
```

#### 3.2 添加加载状态处理

**之前**:
```tsx
if (loading) {
  return <Spin />;
}
```

**之后**:
```tsx
if (isLoading) {
  return <TableSkeleton rows={10} />;
}
```

### 步骤 4: 使用常量

#### 4.1 替换状态硬编码

**之前**:
```tsx
if (status === 'running') {
  return <Tag color="success">运行中</Tag>;
}
```

**之后**:
```tsx
import { DEVICE_STATUS, DEVICE_STATUS_TEXT, DEVICE_STATUS_COLOR } from '@/constants';

<Tag color={DEVICE_STATUS_COLOR[status]}>
  {DEVICE_STATUS_TEXT[status]}
</Tag>
```

#### 4.2 替换消息字符串

**之前**:
```tsx
message.success('创建成功');
message.error('创建失败');
```

**之后**:
```tsx
import { MESSAGES } from '@/constants';

message.success(MESSAGES.SUCCESS.CREATE);
message.error(MESSAGES.ERROR.CREATE);
```

### 步骤 5: 创建 Mutations

#### 5.1 创建 Mutation Hook

```tsx
// src/hooks/queries/useDevices.ts
export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDeviceDto) => createDevice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      message.success(MESSAGES.SUCCESS.CREATE);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || MESSAGES.ERROR.CREATE);
    },
  });
}
```

#### 5.2 使用 Mutation

**之前**:
```tsx
const handleCreate = async (values) => {
  setLoading(true);
  try {
    await createDevice(values);
    message.success('创建成功');
    loadDevices(); // 重新加载列表
  } catch (error) {
    message.error('创建失败');
  } finally {
    setLoading(false);
  }
};
```

**之后**:
```tsx
const createDevice = useCreateDevice();

const handleCreate = async (values) => {
  await createDevice.mutateAsync(values);
  // 列表自动刷新，无需手动调用
};
```

### 步骤 6: 性能优化

#### 6.1 优化表格列配置

```tsx
const columns = useMemo<ColumnsType<Device>>(() => [
  { title: 'ID', dataIndex: 'id' },
  { title: '名称', dataIndex: 'name' },
  // ...
], []);
```

#### 6.2 优化事件处理器

```tsx
const handleDelete = useCallback((id: string) => {
  Modal.confirm({
    title: '确认删除',
    content: DEVICE_MESSAGES.DELETE_CONFIRM,
    onOk: () => deleteDevice.mutateAsync(id),
  });
}, [deleteDevice]);
```

---

## 📝 完整迁移示例

### 迁移前 (旧架构)

```tsx
// Device/List.tsx - 旧代码
import { useState, useEffect } from 'react';
import { Table, Button, message, Spin } from 'antd';
import { getDevices, deleteDevice } from '@/services/device';

function DeviceList() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const response = await getDevices({ page, pageSize });
      setDevices(response.data);
      setTotal(response.total);
    } catch (error) {
      message.error('加载设备列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, [page, pageSize]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDevice(id);
      message.success('删除成功');
      loadDevices();
    } catch (error) {
      message.error('删除失败');
    }
  };

  if (loading) {
    return <Spin />;
  }

  const columns = [
    { title: 'ID', dataIndex: 'id' },
    { title: '名称', dataIndex: 'name' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status) => {
        const colorMap = {
          idle: 'default',
          running: 'success',
          stopped: 'warning',
          error: 'error',
        };
        const textMap = {
          idle: '空闲',
          running: '运行中',
          stopped: '已停止',
          error: '错误',
        };
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>;
      },
    },
    {
      title: '操作',
      render: (_, record) => (
        <Button danger onClick={() => handleDelete(record.id)}>
          删除
        </Button>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={devices}
      pagination={{
        current: page,
        pageSize: pageSize,
        total: total,
        onChange: (newPage, newPageSize) => {
          setPage(newPage);
          setPageSize(newPageSize);
        },
      }}
    />
  );
}
```

### 迁移后 (新架构)

```tsx
// Device/List.tsx - 新代码
import { useState, useMemo, useCallback } from 'react';
import { Table, Button, Modal } from 'antd';
import { useDevices, useDeleteDevice } from '@/hooks/queries/useDevices';
import { TableSkeleton } from '@/components/PageSkeleton';
import {
  DEVICE_STATUS_TEXT,
  DEVICE_STATUS_COLOR,
  DEVICE_MESSAGES,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
} from '@/constants';
import type { ColumnsType } from 'antd/es/table';
import type { Device } from '@/types';

function DeviceList() {
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // 使用 React Query 获取数据
  const { data, isLoading, isError, refetch } = useDevices({ page, pageSize });
  const deleteDevice = useDeleteDevice();

  // 使用 useMemo 优化列配置
  const columns = useMemo<ColumnsType<Device>>(() => [
    { title: 'ID', dataIndex: 'id' },
    { title: '名称', dataIndex: 'name' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={DEVICE_STATUS_COLOR[status]}>
          {DEVICE_STATUS_TEXT[status]}
        </Tag>
      ),
    },
    {
      title: '操作',
      render: (_, record) => (
        <Button danger onClick={() => handleDelete(record.id)}>
          删除
        </Button>
      ),
    },
  ], []);

  // 使用 useCallback 优化事件处理
  const handleDelete = useCallback((id: string) => {
    Modal.confirm({
      title: '删除设备',
      content: DEVICE_MESSAGES.DELETE_CONFIRM,
      okType: 'danger',
      onOk: async () => {
        await deleteDevice.mutateAsync(id);
      },
    });
  }, [deleteDevice]);

  // 显示骨架屏
  if (isLoading) {
    return <TableSkeleton rows={10} />;
  }

  // 错误处理
  if (isError) {
    return (
      <div>
        <p>数据加载失败</p>
        <Button onClick={() => refetch()}>重试</Button>
      </div>
    );
  }

  return (
    <Table
      columns={columns}
      dataSource={data?.data || []}
      pagination={{
        current: page,
        pageSize: pageSize,
        total: data?.total || 0,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条`,
        onChange: (newPage, newPageSize) => {
          setPage(newPage);
          setPageSize(newPageSize);
        },
      }}
    />
  );
}

export default DeviceList;
```

### 代码对比

| 指标 | 迁移前 | 迁移后 | 改善 |
|------|--------|--------|------|
| 代码行数 | 85 行 | 75 行 | -12% |
| 本地状态 | 5 个 | 2 个 | -60% |
| useEffect | 1 个 | 0 个 | -100% |
| 硬编码字符串 | 8 处 | 0 处 | -100% |
| 性能优化 | 无 | useMemo + useCallback | ✅ |
| 加载体验 | Spin | TableSkeleton | ✅ |
| 自动缓存 | 无 | React Query | ✅ |

---

## 🎯 迁移优先级

### P0 - 立即迁移（本周）

1. **设备列表页** - 最高频访问，性能影响最大
   - 文件: `src/pages/Device/List.tsx`
   - 预计时间: 2 小时
   - 创建: `src/hooks/queries/useDevices.ts`

2. **用户列表页** - 第二高频
   - 文件: `src/pages/User/List.tsx`
   - 预计时间: 2 小时
   - 创建: `src/hooks/queries/useUsers.ts`

3. **仪表盘** - 首页，用户第一印象
   - 文件: `src/pages/Dashboard/index.tsx`
   - 预计时间: 3 小时
   - 创建: `src/hooks/queries/useDashboard.ts`

### P1 - 尽快迁移（本月）

4. 应用列表页
5. 订单列表页
6. 支付管理页面
7. 账单列表页

### P2 - 逐步迁移（下月）

8. 权限管理页面
9. 审计日志页面
10. 工单系统页面
11. 其他次要页面

---

## ⚠️ 注意事项

### 1. Query Keys 命名规范

**遵循层级结构**:
```tsx
export const deviceKeys = {
  all: ['devices'] as const,
  lists: () => [...deviceKeys.all, 'list'] as const,
  list: (params) => [...deviceKeys.lists(), params] as const,
  details: () => [...deviceKeys.all, 'detail'] as const,
  detail: (id) => [...deviceKeys.details(), id] as const,
};
```

### 2. 缓存失效策略

**增删改操作后使相关查询失效**:
```tsx
onSuccess: () => {
  // 使列表查询失效
  queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
  // 使详情查询失效
  queryClient.invalidateQueries({ queryKey: deviceKeys.detail(id) });
}
```

### 3. 错误处理

**统一在 Mutation 中处理错误**:
```tsx
onError: (error: any) => {
  const errorMessage = error.response?.data?.message || MESSAGES.ERROR.CREATE;
  message.error(errorMessage);
}
```

### 4. 类型安全

**使用泛型确保类型安全**:
```tsx
export function useDevices(params: PaginationParams) {
  return useQuery<PaginatedResponse<Device>>({
    queryKey: deviceKeys.list(params),
    queryFn: () => getDevices(params),
  });
}
```

### 5. 性能优化时机

**优化规则**:
- ✅ 列表超过 50 项 → 使用 `memo`
- ✅ 计算开销大 → 使用 `useMemo`
- ✅ 函数传递给子组件 → 使用 `useCallback`
- ❌ 简单组件不需要优化

---

## 🧪 测试清单

迁移完成后进行以下测试：

### 功能测试

- [ ] 列表正常加载
- [ ] 分页功能正常
- [ ] 搜索/筛选功能正常
- [ ] 创建操作成功，列表自动刷新
- [ ] 更新操作成功，列表自动刷新
- [ ] 删除操作成功，列表自动刷新
- [ ] 错误提示正确显示

### 性能测试

- [ ] 首次加载显示骨架屏
- [ ] 30秒内不重复请求（缓存生效）
- [ ] 列表渲染流畅（无卡顿）
- [ ] React DevTools Profiler 验证优化效果

### 用户体验测试

- [ ] 加载状态友好
- [ ] 错误提示清晰
- [ ] 操作反馈及时
- [ ] 界面响应流畅

---

## 📚 相关资源

- [优化指南](./OPTIMIZATION_GUIDE.md)
- [性能最佳实践](./PERFORMANCE_BEST_PRACTICES.md)
- [优化报告](../FRONTEND_ADMIN_OPTIMIZATION_REPORT.md)
- [React Query 文档](https://tanstack.com/query/latest)

---

## 🆘 遇到问题？

### 常见问题

**Q: 数据不刷新？**
A: 检查 Mutation 的 `onSuccess` 中是否正确调用了 `invalidateQueries`

**Q: 类型错误？**
A: 确保 Query Hook 返回类型与 API 响应类型一致

**Q: 缓存时间太长？**
A: 调整 `staleTime` 和 `gcTime` 配置

**Q: 骨架屏闪烁？**
A: 使用 `placeholderData` 保持旧数据

---

**最后更新**: 2025-10-28
**维护者**: Frontend Team
