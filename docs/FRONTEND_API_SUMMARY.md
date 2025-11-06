# 前端API接口需求分析总结

## 概览

本分析基于完整扫描 `frontend/admin` 和 `frontend/user` 的所有服务文件，全面列举了前端应用需要的后端API接口。

---

## 关键统计

### 总体数据
- **总API端点数**: 450+ 个
- **覆盖模块数**: 25 个
- **前端门户数**: 2 个（admin 管理后台 + user 用户门户）
- **认证方式**: JWT Token（除登录、注册、忘记密码外都需要）

### 前端应用分布
- **frontend/admin** (管理后台)
  - 地址: `http://localhost:5173`
  - 主要功能: 设备、用户、应用、账单、通知管理
  - 调用的服务: 32 个服务文件
  
- **frontend/user** (用户门户)
  - 地址: `http://localhost:5174`
  - 主要功能: 设备使用、账单查看、工单提交、帮助查询
  - 调用的服务: 16 个服务文件

---

## API 端点分类汇总

### 核心功能模块 (优先级 P0)

1. **认证与授权** (20 个端点)
   - 登录、注册、注销
   - 密码修改、重置
   - 双因素认证 (2FA)
   - 会话管理

2. **用户管理** (25 个端点)
   - 用户 CRUD 操作
   - 用户统计
   - 密码管理
   - 余额管理
   - 个人信息编辑

3. **设备管理** (45 个端点)
   - 设备 CRUD 操作
   - 设备生命周期（启动、停止、重启）
   - 批量操作
   - ADB 操作（截图、Shell 命令、应用管理）
   - 多提供商支持（云设备、物理设备）

4. **应用管理** (40 个端点)
   - 应用上传、发布
   - 应用审核流程
   - 设备应用安装/卸载
   - 应用统计

5. **计费与订单** (70 个端点)
   - 订单管理
   - 支付处理
   - 使用记录与计量
   - 报表生成
   - 计费规则配置
   - 套餐管理
   - 用户账单与发票

### 管理功能模块 (优先级 P1)

6. **支付管理（Admin）** (20 个端点)
   - 支付统计与分析
   - 支付记录管理
   - 退款审核
   - 异常支付处理
   - Webhook 日志

7. **通知模块** (25 个端点)
   - 通知列表与管理
   - 通知设置
   - WebSocket 实时推送

8. **通知模板** (10 个端点)
   - 模板 CRUD
   - 版本管理
   - 测试与预览

9. **角色与权限** (30 个端点)
   - 角色 CRUD
   - 权限管理
   - 权限分配

10. **菜单与权限缓存** (15 个端点)
    - 菜单权限查询
    - 缓存管理与预热

### 高级功能模块 (优先级 P2)

11. **字段权限与数据范围** (25 个端点)
    - 字段级权限配置
    - 数据范围管理

12. **API 密钥管理** (10 个端点)
    - API 密钥 CRUD
    - 密钥轮换
    - 使用统计

13. **审计日志** (20 个端点)
    - 日志查询与导出
    - 统计分析

14. **事件溯源** (10 个端点)
    - 用户事件历史
    - 事件重放与时间旅行

15. **缓存管理** (6 个端点)
    - 缓存操作与统计

16. **队列管理** (15 个端点)
    - 队列状态管理
    - 任务操作

17. **配额管理** (15 个端点)
    - 配额检查与扣减
    - 告警管理

18. **快照管理** (12 个端点)
    - 设备快照 CRUD
    - 恢复与压缩

19. **生命周期规则** (20 个端点)
    - 规则管理
    - 执行历史追踪

20. **GPU 资源管理** (15 个端点)
    - GPU 设备管理
    - 资源分配与监控

21. **调度器与节点管理** (25 个端点)
    - 节点管理
    - 调度策略
    - 集群统计

22. **提供商管理** (10 个端点)
    - 多云提供商配置
    - 云设备同步

23. **工单管理（User）** (15 个端点)
    - 工单 CRUD
    - 回复与附件管理

24. **帮助系统（User）** (20 个端点)
    - 文章、FAQ、教程
    - 搜索与反馈

---

## 关键技术特性

### 1. 鉴权机制
- **JWT Token** - 用于 API 认证
- **会话管理** - 支持多会话终止
- **权限检查** - 在 API Gateway 层进行

### 2. 分页方式
- **传统分页**: `page`、`pageSize` / `limit`
- **游标分页**: `cursor`、`pageSize` (推荐，高性能)
- **混合支持**: 大多数列表 API 同时支持两种方式

### 3. WebSocket 实时推送
- **连接点**: `localhost:30006` (Notification Service)
- **协议**: Socket.IO
- **用途**: 实时通知推送、设备状态更新

### 4. 文件处理
- **上传接口**: `/apps/upload`、`/tickets/attachments/upload`
- **下载接口**: `/billing/bills/{id}/download` 等
- **Content-Type**: `multipart/form-data`

### 5. 业务流程
- **设备创建**: 使用 Saga 模式追踪进度 (`/devices/saga/{sagaId}`)
- **支付流程**: 多提供商支持（支付宝、微信、信用卡、PayPal）
- **应用审核**: 完整的审核工作流（提交→审核→批准/拒绝）
- **事件溯源**: 用户状态版本控制与时间旅行

---

## 前端服务文件映射

### 前端/admin 服务 (32 个)
```
认证类: auth.ts, twoFactor.ts
用户类: user.ts, role.ts
设备类: device.ts, snapshot.ts, lifecycle.ts, gpu.ts, scheduler.ts, provider.ts
应用类: app.ts
账单类: billing.ts, order.ts, plan.ts, payment-admin.ts
通知类: notification.ts, notificationTemplate.ts
权限类: fieldPermission.ts, dataScope.ts, menu.ts
日志类: audit.ts, auditLog.ts, events.ts, log.ts
系统类: apikey.ts, quota.ts, queue.ts, cache.ts
```

### 前端/user 服务 (16 个)
```
认证类: auth.ts, twoFactor.ts
用户类: user.ts
设备类: device.ts, snapshot.ts
应用类: app.ts
账单类: billing.ts, order.ts, plan.ts
通知类: notification.ts
工单类: ticket.ts
帮助类: help.ts
其他: activity.ts, export.ts, media.ts, referral.ts
```

---

## 集成建议

### 后端实现优先级

**第一阶段（必须）**
- 认证与授权 (认证中心)
- 用户管理 (用户服务)
- 设备管理 (设备服务)
- 应用管理 (应用服务)
- 计费与订单 (计费服务)

**第二阶段（重要）**
- 通知模块 (通知服务)
- 角色与权限 (权限服务)
- 菜单缓存 (共享模块)
- 支付管理 (计费服务)

**第三阶段（可选）**
- 审计日志 (共享模块)
- 事件溯源 (用户服务)
- 队列管理 (共享模块)
- GPU 管理、调度器 (资源服务)

### API Gateway 路由配置

```
/auth/*              → auth-service (认证)
/users/*             → user-service (用户)
/devices/*           → device-service (设备)
/apps/*              → app-service (应用)
/billing/*           → billing-service (计费)
/payments/*          → billing-service (支付)
/notifications/*     → notification-service (通知)
/templates/*         → notification-service (模板)
/roles/*             → user-service (角色权限)
/permissions/*       → user-service (权限)
/menu-permissions/*  → user-service (菜单权限)
/field-permissions/* → user-service (字段权限)
/data-scopes/*       → user-service (数据范围)
/audit-logs/*        → user-service (审计日志)
/events/*            → user-service (事件溯源)
/api-keys/*          → user-service (API密钥)
/quotas/*            → device-service (配额)
/snapshots/*         → device-service (快照)
/cache/*             → shared (缓存)
/queues/*            → shared (队列)
/scheduler/*         → scheduler-service (调度器)
/resources/gpu/*     → device-service (GPU资源)
/help/*              → help-service (帮助系统)
/tickets/*           → ticket-service (工单)
```

---

## 重要注意事项

1. **JWT Secret 一致性**: 所有服务必须使用相同的 JWT_SECRET
2. **CORS 配置**: 需要在 API Gateway 配置跨域支持
3. **数据库连接**: 
   - 用户服务: cloudphone_user
   - 设备服务: cloudphone_device
   - 计费服务: cloudphone
   - 通知服务: cloudphone_notification
4. **RabbitMQ 事件**: 事件驱动架构，多个服务通过 RabbitMQ 通信
5. **Consul 服务发现**: 所有后端服务需要向 Consul 注册

---

## 完整文档

详细的 API 接口文档已生成：
- **路径**: `/docs/FRONTEND_API_INTERFACES.md`
- **内容**: 25 个模块、450+ 个 API 端点的完整说明

