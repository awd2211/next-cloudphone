# useValidatedQuery 使用指南

## 概述

`useValidatedQuery` 是 **React Query + Zod 验证** 的统一封装，结合了两者的优势：

- ✅ **React Query**: 自动缓存、请求去重、后台刷新
- ✅ **Zod**: 运行时类型验证、类型安全
- ✅ **统一错误处理**: 自动的 message 提示
- ✅ **完整类型推导**: TypeScript 支持完美

## 安装

已内置，直接导入使用：

```typescript
import { useValidatedQuery, useValidatedMutation } from '@/hooks/utils';
```

## 基础用法

### 1. 简单查询（替代 useSafeApi）

**旧方式 (useSafeApi):**
```typescript
import { useSafeApi } from '@/hooks/useSafeApi';

const { data, loading, error } = useSafeApi(
  getUsers,
  UsersResponseSchema,
  {
    immediate: true,
    errorMessage: '加载用户失败',
  }
);
```

**新方式 (useValidatedQuery):**
```typescript
import { useValidatedQuery } from '@/hooks/utils';

const { data, isLoading, error } = useValidatedQuery({
  queryKey: ['users'],
  queryFn: getUsers,
  schema: UsersResponseSchema,
  apiErrorMessage: '加载用户失败',
});
```

### 2. 带参数的查询

```typescript
import { useValidatedQuery } from '@/hooks/utils';
import { DeviceListResponseSchema } from '@/schemas/api.schemas';

function useDeviceList(filters: DeviceFilters) {
  return useValidatedQuery({
    queryKey: ['devices', 'list', filters],
    queryFn: () => getDevices(filters),
    schema: DeviceListResponseSchema,
    staleTime: 30 * 1000, // 30秒缓存
    apiErrorMessage: '加载设备列表失败',
  });
}

// 使用
const { data, isLoading } = useDeviceList({ status: 'active' });
```

### 3. 条件查询

```typescript
function useUserQuota(userId: string | undefined) {
  return useValidatedQuery({
    queryKey: ['quotas', userId],
    queryFn: () => getUserQuota(userId!),
    schema: QuotaResponseSchema,
    enabled: !!userId, // 仅在有 userId 时才请求
  });
}
```

### 4. 带 Mutation 的完整示例

```typescript
import { useValidatedQuery, useValidatedMutation, ensureArray } from '@/hooks/utils';
import { useQueryClient } from '@tanstack/react-query';

function useDeviceManagement() {
  const queryClient = useQueryClient();

  // Query: 获取设备列表
  const { data, isLoading } = useValidatedQuery({
    queryKey: ['devices'],
    queryFn: getDevices,
    schema: DeviceListResponseSchema,
  });

  // Mutation: 创建设备
  const createMutation = useValidatedMutation({
    mutationFn: createDevice,
    schema: CreateDeviceResponseSchema,
    successMessage: '设备创建成功',
    errorMessage: '设备创建失败',
    onSuccess: () => {
      // 失效缓存，触发重新获取
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  return {
    devices: ensureArray(data?.data), // 确保返回数组
    isLoading,
    createDevice: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
```

## 高级用法

### 1. 自定义错误处理

```typescript
const { data } = useValidatedQuery({
  queryKey: ['users'],
  queryFn: getUsers,
  schema: UsersResponseSchema,
  onError: (error) => {
    // 自定义错误处理
    if (error.message.includes('403')) {
      message.warning('无权限访问');
    } else {
      message.error('加载失败');
    }

    // 上报错误到监控系统
    reportError(error);
  },
});
```

### 2. Fallback 值

```typescript
const { data } = useValidatedQuery({
  queryKey: ['users'],
  queryFn: getUsers,
  schema: UsersResponseSchema,
  fallbackValue: { data: [], total: 0 }, // 错误时使用此值
});

// data 永远不会是 null
const users = data.data; // 类型安全
```

### 3. 轮询

```typescript
const { data } = useValidatedQuery({
  queryKey: ['device-status', deviceId],
  queryFn: () => getDeviceStatus(deviceId),
  schema: DeviceStatusSchema,
  refetchInterval: 5000, // 每5秒刷新
  refetchIntervalInBackground: false, // 页面不可见时不刷新
});
```

### 4. 乐观更新

```typescript
const updateMutation = useValidatedMutation({
  mutationFn: ({ id, data }) => updateDevice(id, data),
  schema: UpdateDeviceResponseSchema,
  onMutate: async ({ id, data }) => {
    // 取消正在进行的查询
    await queryClient.cancelQueries({ queryKey: ['devices'] });

    // 保存旧数据
    const previous = queryClient.getQueryData(['devices']);

    // 乐观更新
    queryClient.setQueryData(['devices'], (old: any) => ({
      ...old,
      data: old.data.map((d: any) => (d.id === id ? { ...d, ...data } : d)),
    }));

    return { previous };
  },
  onError: (err, variables, context) => {
    // 回滚
    queryClient.setQueryData(['devices'], context?.previous);
  },
  onSettled: () => {
    // 重新获取确保一致性
    queryClient.invalidateQueries({ queryKey: ['devices'] });
  },
});
```

## 对比表

| 功能 | useSafeApi | useValidatedQuery | React Query 原生 |
|------|-----------|------------------|-----------------|
| Zod 验证 | ✅ | ✅ | ❌ |
| 自动缓存 | ❌ | ✅ | ✅ |
| 请求去重 | ❌ | ✅ | ✅ |
| 后台刷新 | ❌ | ✅ | ✅ |
| 乐观更新 | ❌ | ✅ | ✅ |
| 轮询 | ❌ | ✅ | ✅ |
| 错误重试 | ❌ | ✅ | ✅ |
| 类型推导 | ⚠️ 部分 | ✅ 完整 | ✅ 完整 |
| DevTools | ❌ | ✅ | ✅ |

## 迁移指南

### 从 useSafeApi 迁移

**步骤 1: 替换导入**
```typescript
// 旧
import { useSafeApi } from '@/hooks/useSafeApi';

// 新
import { useValidatedQuery } from '@/hooks/utils';
```

**步骤 2: 更新调用**
```typescript
// 旧
const { data, loading, execute } = useSafeApi(
  getUsers,
  UsersResponseSchema,
  { immediate: true }
);

// 新
const { data, isLoading } = useValidatedQuery({
  queryKey: ['users'],
  queryFn: getUsers,
  schema: UsersResponseSchema,
});
```

**步骤 3: 更新属性名**
- `loading` → `isLoading`
- `execute` → 不需要（自动执行）
- 如需手动触发，使用 `refetch()`

### 完整迁移示例

**旧代码:**
```typescript
function useUserList() {
  const { data, loading, error, execute } = useSafeApi(
    async () => getUsers({ page: 1 }),
    UsersResponseSchema,
    {
      immediate: true,
      errorMessage: '加载用户失败',
    }
  );

  return {
    users: data?.data || [],
    loading,
    error,
    refresh: execute,
  };
}
```

**新代码:**
```typescript
function useUserList() {
  const { data, isLoading, error, refetch } = useValidatedQuery({
    queryKey: ['users', { page: 1 }],
    queryFn: () => getUsers({ page: 1 }),
    schema: UsersResponseSchema,
    apiErrorMessage: '加载用户失败',
    staleTime: 30 * 1000, // 新增：30秒缓存
  });

  return {
    users: ensureArray(data?.data),
    isLoading,
    error,
    refresh: refetch,
  };
}
```

## 最佳实践

### 1. Query Key 设计

```typescript
// ✅ 好的设计
['users', 'list', { page: 1, status: 'active' }]
['users', 'detail', userId]
['devices', 'list', filters]

// ❌ 不好的设计
['users'] // 太宽泛
['user-list-page-1'] // 不利于失效
```

### 2. 缓存时间设置

```typescript
// 静态数据：长缓存
staleTime: 10 * 60 * 1000, // 10分钟

// 动态数据：短缓存
staleTime: 30 * 1000, // 30秒

// 实时数据：不缓存
staleTime: 0,

// 垃圾回收时间
gcTime: 5 * 60 * 1000, // 5分钟后清理
```

### 3. 错误处理层级

```typescript
// 全局错误处理（在 QueryClient 配置）
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onError: (error) => {
        console.error('全局错误:', error);
      },
    },
  },
});

// Hook 级别错误处理
useValidatedQuery({
  ...
  onError: (error) => {
    // 特定 hook 的错误处理
  },
});

// 组件级别错误处理
const { error } = useValidatedQuery(...);
if (error) {
  return <ErrorComponent error={error} />;
}
```

## FAQ

### Q: 为什么不直接用 React Query？

A: `useValidatedQuery` 在 React Query 基础上增加了：
- 自动的 Zod 运行时验证
- 统一的错误提示 (message)
- 验证错误和 API 错误的区分

### Q: 性能如何？

A: 几乎没有性能损失：
- Zod 验证只在数据更新时执行
- React Query 的缓存机制减少了 API 调用
- 整体性能优于 useSafeApi

### Q: 可以和原生 React Query 混用吗？

A: 可以！它们完全兼容：
```typescript
// 有验证需求：用 useValidatedQuery
const users = useValidatedQuery({ ... });

// 无验证需求：用 useQuery
const simpleData = useQuery({ ... });
```

### Q: 如何调试验证错误？

A: 开发环境会自动打印详细错误：
```typescript
❌ API响应验证失败: {
  response: { ... },
  errors: [
    { path: ['data', 'name'], message: 'Required' }
  ],
  schema: 'UsersResponseSchema'
}
```

## 总结

### 推荐使用场景

✅ **使用 useValidatedQuery**:
- 需要运行时类型验证
- API 响应格式可能不稳定
- 关键业务数据

✅ **使用原生 useQuery**:
- 简单的数据获取
- 响应格式稳定
- 不需要验证

### 迁移路径

1. **新代码**: 全部使用 `useValidatedQuery`
2. **旧代码**: 逐步从 `useSafeApi` 迁移
3. **最终**: 废弃 `useSafeApi`，统一使用 React Query 生态

---

**开始使用 useValidatedQuery，让你的代码更安全、更高效！** 🚀
