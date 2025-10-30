# API Gateway 路由审计报告

生成时间: 2025-10-30

## 📋 后端服务路由清单

### User Service (14个Controller)

| Controller | 路由 | Gateway状态 |
|-----------|------|------------|
| auth.controller.ts | `/auth` | ✅ 已配置 |
| users.controller.ts | `/users` | ✅ 已配置 |
| roles.controller.ts | `/roles` | ✅ 已配置 |
| permissions.controller.ts | `/permissions` | ✅ 已配置 |
| data-scope.controller.ts | `/data-scopes` | ✅ 已配置 |
| field-permission.controller.ts | `/field-permissions` | ✅ 已配置 |
| menu-permission.controller.ts | `/menu-permissions` | ✅ 已配置 |
| quotas.controller.ts | `/quotas` | ✅ 已配置 |
| **tickets.controller.ts** | **`/tickets`** | **❌ 缺失** |
| **audit-logs.controller.ts** | **`/audit-logs`** | **❌ 缺失** |
| **api-keys.controller.ts** | **`/api-keys`** | **❌ 缺失** |
| **cache.controller.ts** | **`/cache`** | **❌ 缺失** |
| **queue.controller.ts** | **`/queues`** | **❌ 缺失** |
| **events.controller.ts** | **`/events`** | **❌ 缺失** |

### API Gateway 现有路由

从 `proxy.controller.ts` 提取的路由:

#### 已配置的 User Service 路由:
- ✅ `/auth` → user-service
- ✅ `/users` → user-service
- ✅ `/roles` → user-service
- ✅ `/permissions` → user-service
- ✅ `/data-scopes` → user-service
- ✅ `/field-permissions` → user-service
- ✅ `/menu-permissions` → user-service
- ✅ `/quotas` → user-service

#### 已配置的其他服务路由:
- `/notifications` → notification-service
- `/devices` → device-service
- `/apps` → app-service
- `/billing` → billing-service
- `/payments` → billing-service
- `/metering` → billing-service
- `/balance` → billing-service
- `/reports` → billing-service
- `/stats` → billing-service
- `/media` → media-service (Go)
- `/scheduler` → scheduler-service (Python)

---

## ❌ 缺失的路由 (6个)

### 1. Tickets (工单系统) ❌

**后端**: `user-service/src/tickets/tickets.controller.ts`
**路由**: `@Controller('tickets')`
**Gateway**: 未配置

**需要添加**:
```typescript
/**
 * 工单服务路由（精确匹配）
 */
@UseGuards(JwtAuthGuard)
@All("tickets")
async proxyTicketsExact(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy("users", req, res);
}

/**
 * 工单服务路由（通配符）
 */
@UseGuards(JwtAuthGuard)
@All("tickets/*path")
async proxyTickets(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy("users", req, res);
}
```

---

### 2. Audit Logs (审计日志) ❌

**后端**: `user-service/src/audit-logs/audit-logs.controller.ts`
**路由**: `@Controller('audit-logs')`
**Gateway**: 未配置

**需要添加**:
```typescript
/**
 * 审计日志服务路由（精确匹配）
 */
@UseGuards(JwtAuthGuard)
@All("audit-logs")
async proxyAuditLogsExact(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy("users", req, res);
}

/**
 * 审计日志服务路由（通配符）
 */
@UseGuards(JwtAuthGuard)
@All("audit-logs/*path")
async proxyAuditLogs(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy("users", req, res);
}
```

---

### 3. API Keys (API密钥管理) ❌

**后端**: `user-service/src/api-keys/api-keys.controller.ts`
**路由**: `@Controller('api-keys')`
**Gateway**: 未配置

**需要添加**:
```typescript
/**
 * API密钥服务路由（精确匹配）
 */
@UseGuards(JwtAuthGuard)
@All("api-keys")
async proxyApiKeysExact(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy("users", req, res);
}

/**
 * API密钥服务路由（通配符）
 */
@UseGuards(JwtAuthGuard)
@All("api-keys/*path")
async proxyApiKeys(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy("users", req, res);
}
```

---

### 4. Cache (缓存管理) ❌

**后端**: `user-service/src/cache/cache.controller.ts`
**路由**: `@Controller('cache')`
**Gateway**: 未配置

**需要添加**:
```typescript
/**
 * 缓存管理服务路由（精确匹配）
 */
@UseGuards(JwtAuthGuard)
@All("cache")
async proxyCacheExact(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy("users", req, res);
}

/**
 * 缓存管理服务路由（通配符）
 */
@UseGuards(JwtAuthGuard)
@All("cache/*path")
async proxyCache(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy("users", req, res);
}
```

---

### 5. Queues (队列管理) ❌

**后端**: `user-service/src/queues/queue.controller.ts`
**路由**: `@Controller('queues')`
**Gateway**: 未配置

**需要添加**:
```typescript
/**
 * 队列管理服务路由（精确匹配）
 */
@UseGuards(JwtAuthGuard)
@All("queues")
async proxyQueuesExact(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy("users", req, res);
}

/**
 * 队列管理服务路由（通配符）
 */
@UseGuards(JwtAuthGuard)
@All("queues/*path")
async proxyQueues(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy("users", req, res);
}
```

---

### 6. Events (事件溯源查看器) ❌

**后端**: `user-service/src/users/events/events.controller.ts`
**路由**: `@Controller('events')`
**Gateway**: 未配置

**需要添加**:
```typescript
/**
 * 事件溯源服务路由（精确匹配）
 */
@UseGuards(JwtAuthGuard)
@All("events")
async proxyEventsExact(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy("users", req, res);
}

/**
 * 事件溯源服务路由（通配符）
 */
@UseGuards(JwtAuthGuard)
@All("events/*path")
async proxyEvents(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy("users", req, res);
}
```

---

## 📍 建议添加位置

在 `proxy.controller.ts` 中,建议在 `quotas` 路由之后添加这6个缺失的路由:

```typescript
// Line ~256: 在 quotas 路由之后

/**
 * 配额服务路由（通配符）
 */
@UseGuards(JwtAuthGuard)
@All("quotas/*path")
async proxyQuotas(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy("users", req, res);
}

// ========== 添加以下6组路由 ==========

/**
 * 工单服务路由（精确匹配）
 */
@UseGuards(JwtAuthGuard)
@All("tickets")
async proxyTicketsExact(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy("users", req, res);
}

/**
 * 工单服务路由（通配符）
 */
@UseGuards(JwtAuthGuard)
@All("tickets/*path")
async proxyTickets(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy("users", req, res);
}

// ... (其他5组路由)
```

---

## ✅ 完成后的验证

添加路由后,需要:

1. **重新编译 API Gateway**:
   ```bash
   cd backend/api-gateway
   pnpm build
   ```

2. **重启 API Gateway**:
   ```bash
   pm2 restart api-gateway
   ```

3. **测试所有路由**:
   ```bash
   # 获取 JWT token
   TOKEN="your-jwt-token"

   # 测试新路由
   curl -H "Authorization: Bearer $TOKEN" http://localhost:30000/tickets
   curl -H "Authorization: Bearer $TOKEN" http://localhost:30000/audit-logs
   curl -H "Authorization: Bearer $TOKEN" http://localhost:30000/api-keys
   curl -H "Authorization: Bearer $TOKEN" http://localhost:30000/cache
   curl -H "Authorization: Bearer $TOKEN" http://localhost:30000/queues
   curl -H "Authorization: Bearer $TOKEN" http://localhost:30000/events
   ```

---

## 📊 统计

- **User Service 总路由**: 14个
- **Gateway 已配置**: 8个 (57%)
- **Gateway 缺失**: 6个 (43%)
- **需要添加**: 12个路由声明 (6个精确 + 6个通配符)

---

## 🔧 修复优先级

### P0 - 高优先级 (前端已集成)
1. ✅ **Cache** - 前端已有 CacheManagement 页面
2. ✅ **Queues** - 前端已有 QueueManagement 页面
3. ✅ **Events** - 前端已有 EventSourcingViewer 页面
4. ✅ **Audit Logs** - 前端已有 Audit 页面
5. ✅ **API Keys** - 前端已有 ApiKeyList 页面
6. ✅ **Tickets** - 前端已有 TicketList 页面

**这6个路由都是前端已经完成集成的功能,必须立即添加到Gateway!**

---

## 🎯 总结

API Gateway 当前缺少 **6个关键路由**,这些都是前端已经实现的系统管理功能。没有这些路由,前端页面将无法正常工作。

建议立即添加这些路由配置,以确保前端功能完整可用。
