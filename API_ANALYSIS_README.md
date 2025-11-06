# Frontend Admin API 分析报告

## 文件说明

本次分析生成了以下两个文件：

### 1. FRONTEND_ADMIN_API_ANALYSIS.md (1177 行)
**详细的 API 文档**，包含：
- 23 个服务模块的完整 API 列表
- 每个 API 的：
  - HTTP 方法和路径
  - 功能描述
  - 参数类型
  - 返回值类型
  - 调用位置
- 所有相关 Hooks 的列表
- 使用位置和文件引用
- 技术栈信息
- 缓存策略
- 安全机制
- 性能优化

### 2. FRONTEND_ADMIN_API_SUMMARY.json
**结构化的 API 数据**，包含：
- JSON 格式的完整 API 索引
- 服务分类和端点统计
- Hooks 分类
- 页面分类
- 技术栈信息
- 安全和性能配置

## 核心统计数据

```
项目: Cloud Phone Platform - Admin Frontend
分析时间: 2025-11-03

服务文件: 32 个
React Hooks: 68 个
页面组件: 40+ 个
API 端点: 300+ 个
UI 组件: 100+ 个
```

## 服务模块概览

| 模块 | 文件 | 端点数 | 功能 |
|------|------|--------|------|
| 认证 | auth.ts | 4 | 登录、登出、验证码 |
| 用户 | user.ts | 12 | 用户 CRUD、余额管理 |
| 设备 | device.ts | 30 | 设备管理、ADB 控制 |
| 应用 | app.ts | 19 | 应用上传、审核、安装 |
| 计费 | billing.ts | 35+ | 订单、支付、计量、报表 |
| 配额 | quota.ts | 10 | 配额检查、扣减、恢复 |
| 角色权限 | role.ts | 15+ | RBAC、权限管理 |
| 字段权限 | fieldPermission.ts | 11 | 字段级权限控制 |
| 数据范围 | dataScope.ts | 9 | 数据范围限制 |
| 菜单权限 | menu.ts | 12 | 菜单权限、缓存管理 |
| 快照 | snapshot.ts | 9 | 设备快照管理 |
| 生命周期 | lifecycle.ts | 14 | 设备生命周期规则 |
| 审计日志 | auditLog.ts, log.ts | 8 | 操作日志、审计 |
| 通知 | notification.ts | 7 | 通知管理（REST） |
| 通知模板 | notificationTemplate.ts | 11 | 通知模板管理 |
| 调度器 | scheduler.ts | 21 | 节点管理、任务调度 |
| 事件溯源 | events.ts | 6 | 事件回放、时间旅行 |
| 设备模板 | template.ts | 11 | 设备模板管理 |
| API 密钥 | apiKey.ts | 8 | API 密钥管理 |
| 缓存 | cache.ts | 6 | Redis 缓存管理 |
| 队列 | queue.ts | 12 | 消息队列管理 |
| 工单 | ticket.ts | 9 | 工单 CRUD、回复 |
| 统计 | stats.ts | 10 | 仪表板统计 |
| 提供商 | provider.ts | 9 | 多云提供商配置 |
| GPU | gpu.ts | 12 | GPU 设备和分配管理 |
| 套餐 | plan.ts | 7 | 计费套餐管理 |
| 订单 | order.ts | 8 | 订单管理 |
| 支付管理 | payment-admin.ts | 16 | 支付统计、退款审批 |

**总计: 32 个服务模块，300+ 个 API 端点**

## 技术栈

### 前端框架
- React 18 + TypeScript
- Ant Design Pro（UI 组件库）

### 状态管理和数据获取
- **React Query (TanStack Query)**: 自动缓存、后台同步、请求去重
- 68 个自定义 hooks 封装 API 调用

### HTTP 客户端
- axios（通过 `src/utils/request.ts` 封装）
- 自动添加 JWT token
- 统一错误处理
- 支持上传进度回调

### 分页方式
- **偏移分页**: `page`, `pageSize`/`limit`, `offset`
- **游标分页**: `cursor`, `pageSize`（高性能）

### 缓存策略
- **前端**: React Query 缓存（默认 30-60 秒）
- **后端**: Redis 缓存（菜单权限、用户配置等）
- 支持缓存预热和主动失效

## 权限系统

### 4 层权限架构
1. **菜单权限**: 控制路由访问
2. **功能权限**: RBAC 基于角色的权限
3. **字段权限**: 字段级读写限制
4. **数据范围**: 数据可见性限制

### 权限流程
```
登录 → 获取用户权限
  ↓
加载菜单树 (缓存)
  ↓
页面请求 → 权限验证
  ↓
字段权限检查 → 数据范围过滤
```

## 安全机制

### 认证
- JWT Token 存储在 localStorage
- 自动添加到请求头
- 支持刷新令牌

### 防护
- SQL 注入检测 (`SqlInjectionGuard`)
- XSS 防护（HTML 清理）
- CSRF 保护
- 速率限制
- IP 黑名单
- 自动封禁恶意用户

### 敏感数据
- 密码加密存储 (bcrypt)
- API 密钥仅在创建时返回明文
- 审计日志记录所有操作

## 性能优化

### 前端优化
1. **代码分割**: 页面级、组件级代码分割
2. **图片懒加载**: LazyImage 组件
3. **虚拟滚动**: 处理大列表 (`useAuditLogVirtual`)
4. **无限滚动**: `useInfiniteUsers`, `useInfiniteDevices`, `useInfiniteApps`
5. **请求去重**: React Query 自动处理
6. **乐观更新**: 即时更新 UI，失败时回滚

### 后端优化
1. **游标分页**: O(1) 复杂度
2. **缓存预热**: 活跃用户权限提前加载
3. **批量操作**: 单个请求处理多个资源
4. **异步处理**: 消息队列异步任务

## API 调用示例

### 使用 Hook（推荐）
```typescript
// 查询数据
const { data: users, isLoading } = useUsers({ page: 1, pageSize: 10 });

// 修改数据（自动缓存失效）
const createUser = useCreateUser();
await createUser.mutateAsync(userData);

// 乐观更新
const startDevice = useStartDevice();
await startDevice.mutateAsync(deviceId); // 立即更新 UI
```

### 直接调用服务
```typescript
import * as userService from '@/services/user';

const users = await userService.getUsers({ page: 1, pageSize: 10 });
const newUser = await userService.createUser(userData);
```

## 页面模块分类

### 用户和权限管理
- User/List.tsx - 用户列表
- Role/List.tsx - 角色管理
- Permission/FieldPermission.tsx - 字段权限
- Permission/DataScope.tsx - 数据范围
- Permission/MenuPermission.tsx - 菜单权限
- Profile/index.tsx - 个人资料

### 设备管理
- Device/List.tsx - 设备列表
- Device/Detail.tsx - 设备详情
- PhysicalDevice/List.tsx - 物理设备
- DeviceGroups/Management.tsx - 设备分组
- DeviceLifecycle/Dashboard.tsx - 生命周期管理

### 应用管理
- App/List.tsx - 应用列表
- AppReview/ReviewList.tsx - 审核列表
- AppReview/ReviewDetail.tsx - 审核详情

### 计费和支付
- Billing/InvoiceList.tsx - 发票管理
- Billing/TransactionHistory.tsx - 交易历史
- Billing/BalanceOverview.tsx - 余额概览
- Payment/List.tsx - 支付列表
- Payment/Config.tsx - 支付配置
- Payment/Dashboard.tsx - 支付仪表板
- Payment/RefundManagement.tsx - 退款管理
- Payment/ExceptionPayments.tsx - 异常支付
- Plan/List.tsx - 套餐管理
- BillingRules/List.tsx - 计费规则

### 监控和统计
- Dashboard/index.tsx - 主仪表板
- Stats/Dashboard.tsx - 统计仪表板
- Analytics/Dashboard.tsx - 分析仪表板
- Metering/Dashboard.tsx - 计量仪表板
- Payment/Dashboard.tsx - 支付仪表板
- GPU/Dashboard.tsx - GPU 仪表板
- Scheduler/Dashboard.tsx - 调度器仪表板

### 系统管理
- System/CacheManagement.tsx - 缓存管理
- System/DataScopeManagement.tsx - 数据范围管理
- System/EventSourcingViewer.tsx - 事件溯源
- System/QueueManagement.tsx - 队列管理
- System/ConsulMonitor.tsx - Consul 监控
- System/PrometheusMonitor.tsx - Prometheus 监控

### 其他
- Quota/QuotaList.tsx - 配额管理
- ApiKey/ApiKeyList.tsx - API 密钥
- Snapshot/List.tsx - 快照管理
- Template/List.tsx - 设备模板
- Ticket/TicketList.tsx - 工单列表
- Audit/AuditLogList.tsx - 审计日志
- Logs/Audit.tsx - 操作日志
- NotificationTemplates/List.tsx - 通知模板
- Usage/List.tsx - 使用统计
- Settings/index.tsx - 设置
- Notifications/index.tsx - 通知中心

## 关键业务流程

### 用户创建流程
```
1. useCreateUser() → POST /users
2. 服务器验证数据
3. 自动失效缓存 (userKeys.lists, userKeys.stats)
4. UI 自动更新并显示成功消息
```

### 设备创建流程
```
1. useCreateDevice() → POST /devices
2. 检查用户配额 (@QuotaCheck decorator)
3. 创建 Docker 容器
4. 自动失效设备缓存
5. 发布事件给其他服务
```

### 支付流程
```
1. createOrder() → POST /billing/orders
2. createPayment() → POST /payments
3. 用户完成支付
4. Webhook 通知后端
5. 自动更新余额和配额
```

## 调试技巧

### 查看 API 调用
```
Chrome DevTools → Network 标签
过滤: XHR/Fetch
查看请求/响应头和负载
```

### 查看缓存状态
```
React Query DevTools (开发环境)
- 查看所有缓存键
- 查看缓存数据
- 手动触发刷新
```

### 查看后端日志
```bash
pm2 logs <service-name> --lines 100
```

## 最佳实践

### 1. 总是使用 Hooks
```typescript
// 好
const { data } = useUsers();

// 避免
const [users, setUsers] = useState([]);
useEffect(() => {
  userService.getUsers().then(setUsers);
}, []);
```

### 2. 利用自动缓存失效
```typescript
// 好 - 缓存自动失效
const createUser = useCreateUser();
await createUser.mutateAsync(data);

// 避免 - 手动刷新
await userService.createUser(data);
queryClient.invalidateQueries(['users']);
```

### 3. 使用乐观更新
```typescript
// 设备启动时立即更新 UI
const startDevice = useStartDevice();
```

### 4. 错误处理
```typescript
// 所有 mutations 都有 onError
onError: (error: any) => {
  message.error(error.response?.data?.message);
}
```

## 文件位置

- 完整分析: `/home/eric/next-cloudphone/FRONTEND_ADMIN_API_ANALYSIS.md`
- JSON 索引: `/home/eric/next-cloudphone/FRONTEND_ADMIN_API_SUMMARY.json`
- 本说明: `/home/eric/next-cloudphone/API_ANALYSIS_README.md`

## 使用这些文档

1. **快速查询**: 参考 JSON 索引查找 API 端点
2. **详细了解**: 阅读 ANALYSIS.md 了解完整细节
3. **开发参考**: 查看示例和最佳实践
4. **架构理解**: 学习权限系统、缓存策略、安全机制

