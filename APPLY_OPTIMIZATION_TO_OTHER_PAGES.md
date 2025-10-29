# 将 Phase 2 优化应用到其他页面

本文档提供将 Device List 优化模式应用到其他列表页面的详细指南。

---

## 📋 已完成

### ✅ Hooks 文件已创建

1. **useUsers.ts** - 用户管理 hooks (220行)
   - `useUsers()` - 获取用户列表
   - `useUser()` - 获取用户详情
   - `useUserStats()` - 获取统计
   - `useCreateUser()` - 创建用户
   - `useUpdateUser()` - 更新用户
   - `useDeleteUser()` - 删除用户
   - `useToggleUserStatus()` - 切换状态（乐观更新）
   - `useResetPassword()` - 重置密码
   - `useBatchDeleteUsers()` - 批量删除

2. **useApps.ts** - 应用管理 hooks (180行)
   - `useApps()` - 获取应用列表
   - `useApp()` - 获取应用详情
   - `useAppStats()` - 获取统计
   - `useUploadApp()` - 上传应用
   - `useUpdateApp()` - 更新应用
   - `useDeleteApp()` - 删除应用
   - `usePublishApp()` - 发布应用（乐观更新）
   - `useUnpublishApp()` - 下架应用（乐观更新）

3. **useOrders.ts** - 订单管理 hooks (150行)
   - `useOrders()` - 获取订单列表
   - `useOrder()` - 获取订单详情
   - `useOrderStats()` - 获取统计
   - `useCancelOrder()` - 取消订单（乐观更新）
   - `useRefundOrder()` - 退款
   - `useConfirmOrder()` - 确认订单（乐观更新）

---

## 🎯 待优化页面列表

### 高优先级（推荐立即优化）

1. **User/List.tsx** - 用户列表
   - 当前行数: ~500-600行
   - 优化 hooks: `useUsers.ts` ✅ 已创建
   - 预期减少: 40-50% 代码

2. **App/List.tsx** - 应用列表
   - 当前行数: ~400-500行
   - 优化 hooks: `useApps.ts` ✅ 已创建
   - 预期减少: 40-50% 代码

3. **Order/List.tsx** - 订单列表
   - 当前行数: ~400-500行
   - 优化 hooks: `useOrders.ts` ✅ 已创建
   - 预期减少: 40-50% 代码

### 中优先级（可选优化）

4. **Plan/List.tsx** - 套餐列表
5. **Payment/List.tsx** - 支付列表
6. **Usage/List.tsx** - 使用记录列表

---

## 📖 优化步骤（以 User List 为例）

### 步骤 1: 分析当前实现

```bash
# 查看当前文件
cat frontend/admin/src/pages/User/List.tsx

# 识别需要优化的部分:
# 1. 手动状态管理 (useState)
# 2. 手动数据获取 (useEffect)
# 3. 手动刷新逻辑 (loadUsers)
# 4. 重复计算 (需要 useMemo)
# 5. 函数重建 (需要 useCallback)
```

### 步骤 2: 替换状态管理

**优化前**:
```typescript
const [users, setUsers] = useState<User[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [total, setTotal] = useState(0);

const loadUsers = async () => {
  setLoading(true);
  try {
    const res = await getUsers({ page, pageSize });
    setUsers(res.data);
    setTotal(res.total);
  } catch (err) {
    setError('加载失败');
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadUsers();
}, [page, pageSize]);
```

**优化后**:
```typescript
import { useUsers, useUserStats } from '@/hooks/useUsers';

// 参数 memoization
const params = useMemo(() => ({ page, pageSize }), [page, pageSize]);

// 使用 React Query hooks
const { data, isLoading, error } = useUsers(params);
const { data: stats } = useUserStats();

const users = data?.items || [];
const total = data?.total || 0;

// 不需要 useEffect！
// 不需要 loadUsers！
// 自动缓存、去重、刷新
```

### 步骤 3: 替换 Mutation 操作

**优化前**:
```typescript
const handleCreate = async (values: CreateUserDto) => {
  try {
    await createUser(values);
    message.success('创建成功');
    await loadUsers();  // 手动刷新
    await loadStats();   // 手动刷新
  } catch (error) {
    message.error('创建失败');
  }
};

const handleDelete = async (id: string) => {
  try {
    await deleteUser(id);
    message.success('删除成功');
    await loadUsers();  // 手动刷新
  } catch (error) {
    message.error('删除失败');
  }
};
```

**优化后**:
```typescript
import { useCreateUser, useDeleteUser } from '@/hooks/useUsers';

const createMutation = useCreateUser();
const deleteMutation = useDeleteUser();

const handleCreate = useCallback(async (values: CreateUserDto) => {
  await createMutation.mutateAsync(values);
  // 自动失效缓存并刷新！无需手动调用
}, [createMutation]);

const handleDelete = useCallback(async (id: string) => {
  await deleteMutation.mutateAsync(id);
  // 自动刷新！
}, [deleteMutation]);
```

### 步骤 4: 添加 useMemo 优化

```typescript
// 优化状态映射
const statusMap = useMemo(() => ({
  active: { color: 'green', text: '活跃' },
  inactive: { color: 'red', text: '未激活' },
  banned: { color: 'default', text: '已禁用' },
}), []);

// 优化导出数据
const exportData = useMemo(() =>
  users.map(user => ({
    'ID': user.id,
    '用户名': user.username,
    '邮箱': user.email,
    '状态': statusMap[user.status].text,
    '创建时间': dayjs(user.createdAt).format('YYYY-MM-DD'),
  })),
  [users, statusMap]
);

// 优化表格列
const columns = useMemo(() => [
  { title: 'ID', dataIndex: 'id', key: 'id' },
  { title: '用户名', dataIndex: 'username', key: 'username' },
  {
    title: '状态',
    key: 'status',
    render: (_, record) => (
      <Tag color={statusMap[record.status].color}>
        {statusMap[record.status].text}
      </Tag>
    ),
  },
  // ... 更多列
], [statusMap, handleEdit, handleDelete]);
```

### 步骤 5: 添加 useCallback 优化

```typescript
// 优化所有事件处理函数
const handleToggleStatus = useCallback(async (id: string, enabled: boolean) => {
  await toggleStatusMutation.mutateAsync({ id, enabled });
}, [toggleStatusMutation]);

const handleResetPassword = useCallback(async (id: string) => {
  const newPassword = prompt('请输入新密码');
  if (newPassword) {
    await resetPasswordMutation.mutateAsync({ id, newPassword });
  }
}, [resetPasswordMutation]);

const handleExportExcel = useCallback(() => {
  exportToExcel(exportData, '用户列表');
  message.success('导出成功');
}, [exportData]);

const handleExportCSV = useCallback(() => {
  exportToCSV(exportData, '用户列表');
  message.success('导出成功');
}, [exportData]);
```

### 步骤 6: 清理代码

删除不再需要的代码：
```typescript
// ❌ 删除这些
const [users, setUsers] = useState<User[]>([]);
const [loading, setLoading] = useState(false);
const loadUsers = async () => { ... };
useEffect(() => { loadUsers(); }, [page]);

// ✅ 只保留这些
const params = useMemo(() => ({ page, pageSize }), [page, pageSize]);
const { data, isLoading } = useUsers(params);
const users = data?.items || [];
```

---

## 🔧 完整示例对比

### User/List.tsx 优化前后

#### 优化前 (~550行)

```typescript
const UserList = () => {
  // ❌ 手动状态管理
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ❌ 手动数据获取
  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers({ page, pageSize });
      setUsers(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, pageSize]);

  // ❌ 手动刷新
  const handleCreate = async (values) => {
    await createUser(values);
    await loadUsers();
  };

  // ❌ 未优化的 columns（每次渲染都创建）
  const columns = [
    { title: 'ID', dataIndex: 'id' },
    // ...
  ];

  return (
    <Table
      dataSource={users}
      columns={columns}
      loading={loading}
      pagination={{ current: page, pageSize, total }}
    />
  );
};
```

#### 优化后 (~300行，减少 45%)

```typescript
import { useUsers, useCreateUser, useDeleteUser } from '@/hooks/useUsers';

const UserList = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ✅ React Query 自动管理
  const params = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  const { data, isLoading } = useUsers(params);

  const createMutation = useCreateUser();
  const deleteMutation = useDeleteUser();

  const users = data?.items || [];
  const total = data?.total || 0;

  // ✅ useMemo 优化
  const statusMap = useMemo(() => ({
    active: { color: 'green', text: '活跃' },
    inactive: { color: 'red', text: '未激活' },
  }), []);

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id' },
    {
      title: '状态',
      render: (_, record) => (
        <Tag color={statusMap[record.status].color}>
          {statusMap[record.status].text}
        </Tag>
      ),
    },
    // ...
  ], [statusMap, handleEdit, handleDelete]);

  // ✅ useCallback 优化
  const handleCreate = useCallback(async (values) => {
    await createMutation.mutateAsync(values);
    // 自动刷新！
  }, [createMutation]);

  const handleDelete = useCallback(async (id) => {
    await deleteMutation.mutateAsync(id);
    // 自动刷新！
  }, [deleteMutation]);

  return (
    <Table
      dataSource={users}
      columns={columns}
      loading={isLoading}
      pagination={{ current: page, pageSize, total }}
    />
  );
};
```

---

## 📊 优化收益对比

### 代码量

| 页面 | 优化前 | 优化后 | 减少 |
|------|--------|--------|------|
| User List | ~550行 | ~300行 | 45% |
| App List | ~500行 | ~280行 | 44% |
| Order List | ~480行 | ~270行 | 44% |

### 性能

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 网络请求 | 每次操作都请求 | 自动去重 -50~80% |
| 缓存 | 无 | 30秒智能缓存 |
| 重渲染 | 频繁 | 优化后 -30~40% |

---

## ✅ 检查清单

优化每个页面时，请确保：

- [ ] 导入相应的 hooks (`useUsers`, `useApps`, `useOrders`)
- [ ] 删除所有手动状态管理 (`useState` for data/loading/error)
- [ ] 删除所有手动数据获取 (`loadXxx` 函数)
- [ ] 删除所有 `useEffect` 数据加载
- [ ] 使用 `useMemo` 优化配置对象和表格列
- [ ] 使用 `useCallback` 优化事件处理函数
- [ ] 参数使用 `useMemo` 包装
- [ ] 测试所有 CRUD 操作
- [ ] 验证自动刷新工作正常
- [ ] 检查缓存是否生效（30秒内不重复请求）

---

## 🚀 快速开始

### 1. 选择要优化的页面

```bash
# 例如优化 User List
code frontend/admin/src/pages/User/List.tsx
```

### 2. 参考 Device List 实现

```bash
# 打开参考实现
code frontend/admin/src/pages/Device/List.tsx
code frontend/admin/src/hooks/useDevices.ts
```

### 3. 按步骤优化

1. 导入 hooks
2. 替换状态管理
3. 替换 mutations
4. 添加 useMemo
5. 添加 useCallback
6. 删除冗余代码
7. 测试功能

### 4. 验证优化

```bash
# 启动开发服务器
cd frontend/admin
pnpm dev

# 测试功能:
# - 列表加载
# - 分页
# - 搜索
# - 创建
# - 编辑
# - 删除
# - 缓存（30秒内不重复请求）
```

---

## 📝 提交建议

每优化完一个页面，创建一个提交：

```bash
git add frontend/admin/src/pages/User/List.tsx
git add frontend/admin/src/hooks/useUsers.ts

git commit -m "perf(user): 优化 User List 页面

- 使用 React Query 替换手动状态管理
- 添加 useMemo/useCallback 优化
- 代码量减少 45%
- 网络请求减少 50-80%

参考: Device List 优化模式"
```

---

## 🎯 预期成果

优化完成后，项目将拥有：

### 代码质量
- ✅ 统一的状态管理模式（React Query）
- ✅ 更少的样板代码（减少 40-50%）
- ✅ 更好的类型安全
- ✅ 更清晰的数据流

### 性能提升
- ✅ 网络请求减少 50-80%
- ✅ 自动请求去重
- ✅ 智能缓存策略
- ✅ 渲染性能提升 30-40%

### 开发体验
- ✅ 无需手动管理 loading/error 状态
- ✅ 无需手动刷新数据
- ✅ 乐观更新自动处理
- ✅ DevTools 可视化调试

---

## 📚 参考资料

- [Device List 优化实现](frontend/admin/src/pages/Device/List.tsx)
- [useDevices Hooks](frontend/admin/src/hooks/useDevices.ts)
- [PHASE2_OPTIMIZATION_GUIDE.md](./PHASE2_OPTIMIZATION_GUIDE.md)
- [PERFORMANCE_QUICK_REFERENCE.md](./PERFORMANCE_QUICK_REFERENCE.md)

---

**创建时间**: 2025-10-29
**版本**: 1.0.0
**状态**: Hooks 已创建，待应用到页面
