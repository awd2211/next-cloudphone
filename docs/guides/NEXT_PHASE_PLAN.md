# 下一阶段任务规划

## 当前状态总结

✅ **Device Service 部署成功**
- TypeORM 多实例问题已解决
- EventBusService 完全重写（原生 amqplib）
- Transactional Outbox Pattern 运行中
- Saga 模块已集成
- Redis 配额缓存已启用
- Health endpoint 工作正常
- SecurityModule 已修复并启用 ✅ (2025-10-30 04:44 UTC)

⚠️ **待处理问题**
- 其他4个服务尚未应用架构修复

---

## 阶段 1: 修复 SecurityModule ✅ (已完成 2025-10-30)

### 目标
修复 SecurityModule 与新版 Node.js/Express 的兼容性问题，重新启用安全功能。

### 具体任务

#### 1.1 修复 XSS Protection Middleware ✅
**文件**: `backend/shared/src/middleware/xss-protection.middleware.ts`

**修复方案**:
```typescript
// 使用 Object.defineProperty 覆盖只读属性
Object.defineProperty(req, 'query', {
  value: sanitized,
  writable: true,
  enumerable: true,
  configurable: true,
});
```

#### 1.2 修复 AutoBanMiddleware ✅
**文件**: `backend/shared/src/middleware/rate-limit.middleware.ts`

**问题**: `this.get is not a function` - 覆盖 `res.send` 导致上下文绑定错误

**修复方案**: 使用 Express `finish` 事件代替覆盖 `res.send`
```typescript
async use(req: Request, res: Response, next: NextFunction) {
  const ip = this.getClientIP(req);
  const middleware = this;

  res.on('finish', () => {
    if (res.statusCode >= 400) {
      (async () => {
        try {
          await middleware.recordFailure(ip);
        } catch (err) {
          middleware.logger.error('Auto-ban record failure error:', err);
        }
      })();
    }
  });

  next();
}
```

#### 1.3 测试 SecurityModule ✅
**测试结果**:
- ✅ Health endpoint 返回正确状态 (degraded due to Docker/ADB unavailable)
- ✅ 多次请求无错误 (5次测试全部通过)
- ✅ XSS/CSRF 防护正常工作
- ✅ Rate Limit 中间件正常
- ✅ IP 黑名单功能正常
- ✅ 自动封禁功能正常 (使用 finish 事件)

**详细文档**: `PHASE1_SECURITY_MODULE_FIX_COMPLETE.md`

---

## 阶段 2: 应用架构修复到其他服务（优先级：高）

### 2.1 User Service

**当前状态**: 运行中但使用旧的 EventBusService

**需要的修改**:
1. 已有 `.npmrc` (root level) ✅
2. 更新 `EventBusModule` 导入
3. 重新构建和测试

**步骤**:
```bash
cd backend/user-service

# 1. 确认依赖正确安装
pnpm install

# 2. 检查 shared 模块版本
pnpm list @cloudphone/shared

# 3. 重新构建
pnpm build

# 4. 重启服务
pm2 restart user-service

# 5. 测试 health endpoint
curl http://localhost:30001/health

# 6. 测试 EventBusService
pm2 logs user-service --lines 100 | grep "RabbitMQ"
```

**预期结果**:
- ✅ RabbitMQ 连接成功
- ✅ EventOutbox 运行（如果已配置）
- ✅ Event Sourcing 正常工作
- ✅ Health endpoint 正常

### 2.2 App Service

**需要的修改**:
1. 更新到新的 EventBusService
2. 添加 EventOutbox 支持（可选）
3. 添加 Saga 模块（如果需要事务）

**步骤**:
```bash
cd backend/app-service

# 重复与 user-service 相同的步骤
pnpm install
pnpm build
pm2 restart app-service
curl http://localhost:30003/health
```

### 2.3 Billing Service

**当前状态**: 已有 Saga 实现

**需要的修改**:
1. 更新到新的 EventBusService
2. 验证 Saga 模式兼容性
3. 添加 EventOutbox 支持

**特殊注意事项**:
- Billing service 已有 `purchase-plan-v2.saga.ts`
- 需要验证与新 SagaModule 的兼容性
- 测试支付流程的分布式事务

**步骤**:
```bash
cd backend/billing-service

pnpm install
pnpm build
pm2 restart billing-service

# 测试 Saga 功能
curl -X POST http://localhost:30005/api/v1/billing/plans/purchase \
  -H "Content-Type: application/json" \
  -d '{"planId": "test", "userId": "test"}'

# 检查 Saga 日志
pm2 logs billing-service --lines 100 | grep -i "saga"
```

### 2.4 Notification Service

**当前状态**: 运行中，已有模板系统

**需要的修改**:
1. 更新到新的 EventBusService
2. 验证 RabbitMQ 消费者
3. 测试 DLX (Dead Letter Exchange)

**步骤**:
```bash
cd backend/notification-service

pnpm install
pnpm build
pm2 restart notification-service

# 测试通知发送
curl -X POST http://localhost:30006/api/v1/notifications \
  -H "Content-Type: application/json" \
  -d '{"type": "email", "to": "test@example.com", "template": "welcome"}'

# 检查事件消费
pm2 logs notification-service --lines 100 | grep -i "consumer\|event"
```

---

## 阶段 3: 端到端集成测试（优先级：中）

### 3.1 验证服务间事件通信

**测试场景 1: 设备创建事件流**
```
用户创建设备 → device-service
  ↓ 发布 device.created 事件
  ├→ billing-service (开始计费)
  ├→ notification-service (发送通知)
  └→ user-service (更新配额)
```

**测试步骤**:
```bash
# 1. 监控所有服务日志
pm2 logs --lines 0

# 2. 创建设备
curl -X POST http://localhost:30002/api/v1/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "test-device",
    "type": "redroid",
    "userId": "test-user"
  }'

# 3. 验证事件传播
# 检查 device-service 发布事件
# 检查 billing-service 接收事件
# 检查 notification-service 接收事件
# 检查 user-service 更新配额
```

### 3.2 测试 Transactional Outbox Pattern

**目标**: 验证事件在数据库事务提交后才发布

**测试步骤**:
```bash
# 1. 检查 EventOutbox 表
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_device \
  -c "SELECT COUNT(*) FROM event_outbox WHERE status = 'pending';"

# 2. 创建设备（触发事件）
curl -X POST http://localhost:30002/api/v1/devices ...

# 3. 验证 Outbox 记录
psql ... -c "SELECT * FROM event_outbox ORDER BY created_at DESC LIMIT 5;"

# 4. 等待发布（5秒）
sleep 5

# 5. 验证状态变更
psql ... -c "SELECT status, COUNT(*) FROM event_outbox GROUP BY status;"
```

**预期结果**:
- Outbox 记录创建
- 5秒后状态变为 `published`
- RabbitMQ 接收到事件
- 消费者处理事件

### 3.3 测试 Saga 分布式事务

**测试场景: 用户购买套餐**
```
用户购买 → billing-service.PurchasePlanSaga
  ↓
  1. 验证配额 (user-service)
  2. 创建支付订单 (billing-service)
  3. 处理支付 (payment-service)
  4. 更新配额 (user-service)

  如果失败 → 补偿操作
  - 取消订单
  - 恢复配额
  - 退款（如果已支付）
```

**测试步骤**:
```bash
# 1. 正常流程测试
curl -X POST http://localhost:30005/api/v1/billing/plans/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "planId": "premium",
    "paymentMethod": "stripe"
  }'

# 2. 失败场景测试（模拟支付失败）
curl -X POST http://localhost:30005/api/v1/billing/plans/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "planId": "premium",
    "paymentMethod": "test_fail"
  }'

# 3. 检查 Saga 状态
psql ... -c "SELECT * FROM saga_instances WHERE status = 'compensating';"

# 4. 验证补偿执行
pm2 logs billing-service --lines 100 | grep -i "compensat"
```

---

## 阶段 4: 配置和安全（优先级：中）

### 4.1 统一 JWT Secrets

**当前问题**: 各服务可能使用不同的 JWT_SECRET

**解决方案**:
1. 在 `.env.example` 中添加统一的 JWT_SECRET
2. 更新所有服务的 `.env` 文件
3. 重启所有服务

**步骤**:
```bash
# 1. 生成强 JWT Secret
SECRET=$(openssl rand -base64 64)
echo "JWT_SECRET=$SECRET"

# 2. 更新所有服务的 .env
for service in user-service device-service app-service billing-service notification-service; do
  echo "JWT_SECRET=$SECRET" >> backend/$service/.env
done

# 3. 重启所有服务
pm2 restart all

# 4. 测试跨服务认证
# user-service 生成 token
TOKEN=$(curl -X POST http://localhost:30001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' | jq -r '.token')

# device-service 验证 token
curl http://localhost:30002/api/v1/devices \
  -H "Authorization: Bearer $TOKEN"
```

### 4.2 配置服务到服务认证

**目标**: 启用内部服务间的认证

**文件**: `backend/SERVICE_TO_SERVICE_AUTH_GUIDE.md` (已存在)

**步骤**:
1. 为每个服务生成 service token
2. 配置 `ServiceTokenService`
3. 在内部 API 调用中使用 service token
4. 测试服务间调用

---

## 阶段 5: 监控和可观测性（优先级：低）

### 5.1 配置 Prometheus 指标收集

**当前状态**: MetricsService 已在 device-service 中

**任务**:
1. 为所有服务启用 `/metrics` endpoint
2. 配置 Prometheus 抓取
3. 创建 Grafana 仪表板

### 5.2 集中日志收集

**选项**:
1. ELK Stack (Elasticsearch + Logstash + Kibana)
2. Loki + Grafana
3. CloudWatch / DataDog (云服务)

### 5.3 分布式追踪

**选项**:
1. Jaeger
2. Zipkin
3. OpenTelemetry

---

## 阶段 6: Kubernetes 部署准备（优先级：低）

### 6.1 完善 K8s 配置

**文件位置**: `infrastructure/k8s/`

**已有配置**:
- `namespace.yaml`
- `deployments/*.yaml`
- `ingress/ingress.yaml`

**待完成**:
1. ConfigMaps for shared configuration
2. Secrets for sensitive data
3. Services (ClusterIP/LoadBalancer)
4. HPA (Horizontal Pod Autoscaler)
5. PVC (Persistent Volume Claims)

### 6.2 创建部署脚本

**文件**: `infrastructure/k8s/deploy.sh` (已存在)

**验证和增强**:
```bash
# 测试部署脚本
cd infrastructure/k8s
./deploy.sh

# 验证部署
kubectl get pods -n cloudphone
kubectl get services -n cloudphone
kubectl logs -n cloudphone deployment/device-service
```

---

## 任务优先级总结

### P0 - 立即执行
1. ✅ 修复 SecurityModule 兼容性
2. 🔲 应用架构修复到 user-service
3. 🔲 应用架构修复到 notification-service

### P1 - 本周完成
4. 🔲 应用架构修复到 app-service
5. 🔲 应用架构修复到 billing-service
6. 🔲 验证所有服务 Health endpoints
7. 🔲 测试服务间事件通信

### P2 - 下周完成
8. 🔲 配置统一 JWT secrets
9. 🔲 测试 Transactional Outbox Pattern
10. 🔲 测试 Saga 分布式事务
11. 🔲 配置服务到服务认证

### P3 - 按需完成
12. 🔲 配置 Prometheus 监控
13. 🔲 集中日志收集
14. 🔲 分布式追踪
15. 🔲 K8s 部署准备

---

## 估算时间

| 阶段 | 任务数 | 预估时间 | 依赖 |
|------|--------|----------|------|
| 阶段 1: SecurityModule | 3 | 2-3 小时 | 无 |
| 阶段 2: 其他服务 | 4 | 4-6 小时 | 阶段 1 |
| 阶段 3: 集成测试 | 3 | 3-4 小时 | 阶段 2 |
| 阶段 4: 配置安全 | 2 | 2-3 小时 | 阶段 2 |
| 阶段 5: 监控 | 3 | 4-6 小时 | 阶段 3 |
| 阶段 6: K8s | 2 | 6-8 小时 | 阶段 4,5 |

**总计**: 约 21-30 小时（3-4 个工作日）

---

## 快速开始指南

### 继续下一个任务

```bash
# 选项 1: 修复 SecurityModule
cd /home/eric/next-cloudphone/backend/shared
# 检查 rate-limit.middleware.ts 的 AutoBanMiddleware

# 选项 2: 应用修复到 user-service
cd /home/eric/next-cloudphone/backend/user-service
pnpm install
pnpm build
pm2 restart user-service

# 选项 3: 应用修复到 notification-service
cd /home/eric/next-cloudphone/backend/notification-service
pnpm install
pnpm build
pm2 restart notification-service
```

### 验证当前进度

```bash
# 检查所有服务状态
pm2 list

# 检查 health endpoints
for port in 30001 30002 30003 30005 30006; do
  echo "=== Port $port ==="
  curl -s http://localhost:$port/health | jq '.data.status' 2>/dev/null || echo "Not available"
done

# 检查 RabbitMQ 连接
pm2 logs --nostream --lines 100 | grep "RabbitMQ"

# 检查 EventOutbox
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_device \
  -c "SELECT status, COUNT(*) FROM event_outbox GROUP BY status;"
```

---

**下一步建议**: 从阶段 1 开始，修复 SecurityModule，然后逐步应用架构改进到其他服务。

**文档位置**:
- 技术细节: `ARCHITECTURE_DEPLOYMENT_COMPLETE.md`
- 快速参考: `QUICK_REFERENCE.md`
- Health 修复: `HEALTH_ENDPOINT_FIX.md`
- 此规划: `NEXT_PHASE_PLAN.md`
