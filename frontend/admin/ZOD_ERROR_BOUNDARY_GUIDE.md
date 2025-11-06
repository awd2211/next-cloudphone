# Zod + Error Boundary 集成指南

本指南介绍如何在项目中使用 Zod 进行 API 响应验证和 Error Boundary 来防止运行时崩溃。

## 📦 已安装的包

```bash
pnpm add zod@^4.1.12
```

## 🏗️ 项目结构

```
src/
├── schemas/
│   └── api.schemas.ts          # Zod schemas 定义
├── hooks/
│   ├── useSafeApi.ts           # 安全的 API 调用 Hook
│   └── examples/
│       └── useRefundManagement.safe.example.ts
├── components/
│   └── ErrorBoundary/
│       ├── ErrorBoundary.tsx   # Error Boundary 组件
│       └── index.ts
└── ...
```

## 🚀 快速开始

### 1. 使用 useSafeApi Hook

#### 基础用法

```typescript
import { useSafeApi } from '@/hooks/useSafeApi';
import { PaginatedUsersResponseSchema } from '@/schemas/api.schemas';
import { getUsers } from '@/services/user';

function UserList() {
  const { data, loading, execute } = useSafeApi(
    () => getUsers({ page: 1, pageSize: 10 }),
    PaginatedUsersResponseSchema,
    {
      errorMessage: '加载用户列表失败',
      fallbackValue: { data: [], total: 0 }, // 失败时的默认值
    }
  );

  useEffect(() => {
    execute(); // 手动触发加载
  }, []);

  return (
    <Table
      dataSource={data?.data || []} // ✅ 类型安全，永远是数组
      loading={loading}
      // ...
    />
  );
}
```

#### 高级用法：带参数的 API 调用

```typescript
const { execute: loadUsers } = useSafeApi(
  (userId: string) => getUserById(userId),
  UserSchema,
  {
    errorMessage: '加载用户失败',
    successMessage: '加载成功',
  }
);

// 调用时传参
const handleLoadUser = async (id: string) => {
  const user = await loadUsers(id);
  console.log(user); // 类型安全的 User 对象或 null
};
```

### 2. 使用 Error Boundary

#### 页面级 Error Boundary

```typescript
import { PageErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  return (
    <PageErrorBoundary>
      <Routes>
        <Route path="/users" element={<UserList />} />
        {/* ... */}
      </Routes>
    </PageErrorBoundary>
  );
}
```

#### 组件级 Error Boundary

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

function Dashboard() {
  return (
    <div>
      <h1>仪表板</h1>

      {/* 为可能崩溃的组件添加 Error Boundary */}
      <ErrorBoundary fallback={<div>图表加载失败</div>}>
        <ChartComponent />
      </ErrorBoundary>

      <ErrorBoundary>
        <StatisticsPanel />
      </ErrorBoundary>
    </div>
  );
}
```

#### 轻量级 Error Boundary（用于小组件）

```typescript
import { LightErrorBoundary } from '@/components/ErrorBoundary';

function Sidebar() {
  return (
    <LightErrorBoundary fallbackMessage="侧边栏加载失败">
      <Menu items={menuItems} />
    </LightErrorBoundary>
  );
}
```

### 3. 定义 Zod Schema

#### 简单实体 Schema

```typescript
import { z } from 'zod';

// 定义 Schema
export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().positive(),
  stock: z.number().int().nonnegative(),
  category: z.enum(['electronics', 'clothing', 'food']),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
});

// 导出类型
export type Product = z.infer<typeof ProductSchema>;
```

#### 嵌套 Schema

```typescript
export const OrderSchema = z.object({
  id: z.string(),
  user: UserSchema, // 嵌套其他 schema
  items: z.array(
    z.object({
      product: ProductSchema,
      quantity: z.number().int().positive(),
    })
  ),
  total: z.number().positive(),
  status: z.enum(['pending', 'paid', 'shipped', 'completed']),
});

export type Order = z.infer<typeof OrderSchema>;
```

#### 分页响应 Schema

```typescript
export const PaginatedProductsResponseSchema = z.object({
  data: z.array(ProductSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
```

## 🔄 重构现有 Hook

### 步骤 1: 识别需要重构的 Hook

优先级：
- 🔴 高：数组数据 + Table 组件（如 useRefundManagement, useLogsAudit）
- 🟡 中：关键业务数据（如 usePaymentDashboard, useOrderList）
- 🟢 低：简单数据获取（如 useUserProfile）

### 步骤 2: 创建对应的 Schema

```typescript
// 在 src/schemas/api.schemas.ts 中添加
export const RefundSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  amount: z.number(),
  status: z.enum(['pending', 'approved', 'rejected']),
  // ... 其他字段
});

export const RefundsArraySchema = z.array(RefundSchema);
```

### 步骤 3: 重构 Hook

```typescript
// ❌ 旧版本
export const useRefundManagement = () => {
  const [refunds, setRefunds] = useState<PaymentDetail[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const refunds = await getPendingRefunds();
      setRefunds(refunds); // ⚠️ 未验证，可能不是数组
    } catch (error) {
      message.error('加载退款列表失败');
      setRefunds([]); // ⚠️ 容易忘记重置
    } finally {
      setLoading(false);
    }
  }, []);

  return { refunds, loading, loadRefunds };
};

// ✅ 新版本
export const useRefundManagement = () => {
  const { data: refunds, loading, execute: loadRefunds } = useSafeApi(
    getPendingRefunds,
    RefundsArraySchema,
    {
      errorMessage: '加载退款列表失败',
      fallbackValue: [], // ✅ 自动处理失败情况
    }
  );

  return {
    refunds: refunds || [], // ✅ 类型安全，永远是数组
    loading,
    loadRefunds,
  };
};
```

## 📊 性能考虑

### Zod 验证性能

| 数据量 | 验证耗时 | 影响 |
|--------|---------|------|
| < 100条 | 1-5ms | ✅ 可忽略 |
| 100-1000条 | 10-50ms | ✅ 可接受 |
| > 1000条 | 100ms+ | ⚠️ 考虑优化 |

### 优化策略

1. **惰性验证** - 使用 `z.lazy()` 延迟验证

```typescript
const LazyUserSchema = z.lazy(() => UserSchema);
```

2. **部分验证** - 只验证关键字段

```typescript
const SimpleUserSchema = UserSchema.pick({ id: true, username: true });
```

3. **生产环境禁用详细日志**

```typescript
useSafeApi(apiFunc, schema, {
  logValidationErrors: process.env.NODE_ENV === 'development',
});
```

## 🔍 调试技巧

### 1. 查看验证错误详情

开发环境下，验证失败会在控制台打印详细信息：

```
❌ API响应验证失败:
{
  response: { ... },
  errors: [
    {
      code: "invalid_type",
      expected: "array",
      received: "null",
      path: ["data"],
      message: "Expected array, received null"
    }
  ]
}
```

### 2. 测试 Schema

```typescript
import { RefundSchema } from '@/schemas/api.schemas';

// 测试数据
const testData = {
  id: '123',
  amount: 100,
  status: 'pending',
};

// 验证
const result = RefundSchema.safeParse(testData);

if (!result.success) {
  console.error('验证失败:', result.error.errors);
} else {
  console.log('验证成功:', result.data);
}
```

### 3. 使用 TypeScript 类型检查

```typescript
// Zod schema 的类型推导
type Refund = z.infer<typeof RefundSchema>;

// TypeScript 会确保这个对象符合 schema
const refund: Refund = {
  id: '123',
  amount: 100,
  status: 'pending',
  // TypeScript 会提示缺少必需字段
};
```

## 🎯 最佳实践

### 1. Schema 设计原则

```typescript
// ✅ 好的 Schema
const GoodSchema = z.object({
  id: z.string().uuid(),                    // 明确格式
  email: z.string().email(),                // 使用内置验证器
  age: z.number().int().min(0).max(150),    // 合理的范围
  status: z.enum(['active', 'inactive']),   // 枚举类型
  tags: z.array(z.string()).default([]),    // 默认值
  updatedAt: z.string().datetime().optional(), // 可选字段
});

// ❌ 不好的 Schema
const BadSchema = z.object({
  id: z.string(),           // 太宽松
  email: z.string(),        // 未验证格式
  age: z.number(),          // 未限制范围
  status: z.string(),       // 应该用枚举
  tags: z.any(),            // 避免使用 any
});
```

### 2. 错误处理策略

```typescript
// ✅ 为不同场景提供合适的 fallback
useSafeApi(getUsers, UsersArraySchema, {
  fallbackValue: [],               // 数组类型
});

useSafeApi(getUserProfile, UserSchema, {
  fallbackValue: null,             // 对象类型
});

useSafeApi(getStats, StatsSchema, {
  fallbackValue: { count: 0 },     // 带默认值的对象
});
```

### 3. Error Boundary 粒度

```typescript
// ✅ 推荐：细粒度的 Error Boundary
<Dashboard>
  <ErrorBoundary> {/* 只影响图表 */}
    <Charts />
  </ErrorBoundary>

  <ErrorBoundary> {/* 只影响列表 */}
    <DataTable />
  </ErrorBoundary>
</Dashboard>

// ❌ 不推荐：粗粒度的 Error Boundary
<ErrorBoundary> {/* 整个页面都会崩溃 */}
  <Dashboard>
    <Charts />
    <DataTable />
  </Dashboard>
</ErrorBoundary>
```

## 🔗 集成到现有项目

### 方案 A: 渐进式重构（推荐）

1. ✅ 先重构高频崩溃的组件
2. ✅ 在新功能中使用新模式
3. ✅ 逐步替换旧代码

### 方案 B: 全面重构

1. 定义所有 API 的 Zod schemas
2. 创建统一的 API 客户端
3. 批量重构所有 hooks

## 📝 迁移检查清单

- [ ] 安装 Zod: `pnpm add zod`
- [ ] 创建 `src/schemas/api.schemas.ts`
- [ ] 创建 `src/hooks/useSafeApi.ts`
- [ ] 创建 `src/components/ErrorBoundary/`
- [ ] 在 App.tsx 中添加顶层 Error Boundary
- [ ] 重构第一个 hook 作为示例
- [ ] 在团队中分享最佳实践
- [ ] 更新代码审查清单

## 🎓 学习资源

- [Zod 官方文档](https://zod.dev)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

## ❓ 常见问题

### Q: Zod 会影响性能吗？

A: 对于大多数场景（< 1000条数据），影响可忽略。对于超大数据集，可以使用部分验证或采样验证。

### Q: 是否需要为所有 API 添加 Schema？

A: 不需要。优先为：
- 数组数据（Table 组件）
- 关键业务数据（支付、订单）
- 不稳定的第三方 API

### Q: Error Boundary 能捕获异步错误吗？

A: 不能。Error Boundary 只能捕获渲染过程中的同步错误。异步错误需要在 try-catch 中处理。

### Q: 如何与现有的错误监控（Sentry）集成？

A: 在 ErrorBoundary 的 `componentDidCatch` 中调用 Sentry：

```typescript
componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  Sentry.captureException(error, {
    contexts: { react: { componentStack: errorInfo.componentStack } }
  });
}
```

## 🎉 总结

通过引入 Zod 和 Error Boundary：

1. ✅ **运行时类型安全** - 防止 API 返回异常数据导致崩溃
2. ✅ **优雅的错误处理** - 用户看到友好的错误提示，而不是白屏
3. ✅ **更好的开发体验** - 详细的错误日志帮助快速定位问题
4. ✅ **生产环境保护** - 即使出错也不会影响整个应用

开始重构你的第一个 Hook 吧！🚀
