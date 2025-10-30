# 云手机平台架构修复部署指南

本指南帮助您快速部署 2025-01-29 完成的架构修复。

---

## 📋 快速开始

### 方式 1: 一键部署（推荐）

```bash
# 自动部署所有修复
bash scripts/deploy-architecture-fixes.sh

# 验证部署是否成功
bash scripts/verify-architecture-fixes.sh
```

### 方式 2: 手动部署

如果自动脚本遇到问题，可以按照以下步骤手动部署。

---

## 🔧 手动部署步骤

### Step 1: 应用数据库迁移

```bash
# 连接到 PostgreSQL
psql -U postgres

# 切换到 cloudphone_device 数据库
\c cloudphone_device

# 应用 event_outbox 表迁移
\i database/migrations/20250129_add_event_outbox.sql

# 应用 saga_state 索引迁移
\i database/migrations/20250129_add_saga_indexes.sql

# 验证
\d event_outbox
\d+ saga_state

# 退出
\q
```

### Step 2: 重新构建 shared 模块

```bash
cd backend/shared

# 清理
rm -rf dist

# 安装依赖
pnpm install

# 构建
pnpm build

# 验证
ls -la dist/outbox

cd ../..
```

### Step 3: 重新构建 device-service

```bash
cd backend/device-service

# 清理
rm -rf dist

# 安装依赖
pnpm install

# 构建
pnpm build

# 验证
ls -la dist/quota/quota-cache.service.js

cd ../..
```

### Step 4: 更新环境变量

```bash
# 如果 .env 不存在，从模板复制
cp backend/device-service/.env.example backend/device-service/.env

# 编辑 .env，添加以下配置
echo "QUOTA_ALLOW_ON_ERROR=true" >> backend/device-service/.env
```

### Step 5: 重启服务

#### 使用 PM2

```bash
# 重启服务
pm2 restart device-service

# 查看日志
pm2 logs device-service --lines 50

# 查看状态
pm2 status
```

#### 使用 Docker Compose

```bash
# 重启服务
docker compose -f docker-compose.dev.yml restart device-service

# 查看日志
docker compose -f docker-compose.dev.yml logs -f device-service
```

### Step 6: 验证部署

```bash
# 运行验证脚本
bash scripts/verify-architecture-fixes.sh

# 或手动验证
# 1. 检查服务端口
curl http://localhost:30002/health

# 2. 检查 event_outbox 表
psql -U postgres -d cloudphone_device -c "SELECT COUNT(*) FROM event_outbox;"

# 3. 查看 Outbox 状态分布
psql -U postgres -d cloudphone_device -c "SELECT status, COUNT(*) FROM event_outbox GROUP BY status;"
```

---

## 📊 监控与运维

### 实时监控 Outbox

```bash
# 启动实时监控（每 5 秒刷新）
bash scripts/monitor-outbox.sh
```

监控界面显示：
- 事件状态统计（pending/published/failed）
- 最近待发布事件列表
- 失败事件详情（如果有）
- 事件类型分布
- 健康指标（发布率、最老事件年龄等）

### 手动查询 Outbox

```bash
# 查看所有待发布事件
psql -U postgres -d cloudphone_device -c "
SELECT id, event_type, created_at, retry_count
FROM event_outbox
WHERE status = 'pending'
ORDER BY created_at;
"

# 查看失败事件
psql -U postgres -d cloudphone_device -c "
SELECT id, event_type, error_message, last_error_at
FROM event_outbox
WHERE status = 'failed'
ORDER BY last_error_at DESC;
"

# 查看最近发布的事件
psql -U postgres -d cloudphone_device -c "
SELECT id, event_type, published_at
FROM event_outbox
WHERE status = 'published'
ORDER BY published_at DESC
LIMIT 10;
"
```

### 手动触发事件发布

如果发现事件积压，可以手动触发发布：

```bash
# 重启 device-service 会自动触发发布
pm2 restart device-service

# 或者调用 API（如果暴露了管理端点）
# curl -X POST http://localhost:30002/admin/outbox/trigger-publish
```

### 清理旧事件

```bash
# 手动清理 7 天前的已发布事件
psql -U postgres -d cloudphone_device -c "
DELETE FROM event_outbox
WHERE status = 'published'
  AND published_at < NOW() - INTERVAL '7 days';
"

# 或使用内置函数
psql -U postgres -d cloudphone_device -c "SELECT cleanup_old_outbox_events();"
```

---

## 🧪 功能测试

### 测试 1: Outbox 事件发布

```bash
# 1. 创建一个设备（通过 API 或管理界面）
curl -X POST http://localhost:30000/api/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "test-device",
    "userId": "test-user-id",
    "providerType": "REDROID",
    "androidVersion": "11"
  }'

# 2. 检查 event_outbox 表是否有 device.created 事件
psql -U postgres -d cloudphone_device -c "
SELECT id, event_type, status, created_at
FROM event_outbox
WHERE event_type = 'device.created'
ORDER BY created_at DESC
LIMIT 5;
"

# 3. 等待 5-10 秒后，检查事件是否已发布
psql -U postgres -d cloudphone_device -c "
SELECT id, event_type, status, published_at
FROM event_outbox
WHERE event_type = 'device.created'
  AND status = 'published'
ORDER BY published_at DESC
LIMIT 5;
"
```

### 测试 2: 配额缓存

```bash
# 1. 首次创建设备（会调用 user-service，较慢）
# 查看日志，应该看到 "Quota fetched and cached"
pm2 logs device-service | grep "Quota"

# 2. 短时间内再次创建设备（应命中缓存，快速）
# 查看日志，应该看到 "Quota cache hit"
pm2 logs device-service | grep "cache hit"

# 3. 停止 user-service，测试降级
pm2 stop user-service

# 4. 尝试创建设备（应使用缓存或降级配额）
# 查看日志，应该看到 "Using fallback quota" 或 "Using stale quota cache"
pm2 logs device-service | grep "fallback\|stale"

# 5. 恢复 user-service
pm2 start user-service
```

### 测试 3: ADB 录屏会话管理

```bash
# 1. 启动录屏
curl -X POST http://localhost:30000/api/devices/{deviceId}/recording/start \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 2. 检查活跃会话（需要添加对应的 API 端点）
# 或查看日志
pm2 logs device-service | grep "Recording started"

# 3. 尝试重复启动录屏（应被拒绝）
curl -X POST http://localhost:30000/api/devices/{deviceId}/recording/start \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# 应返回 "设备已有活跃的录屏会话" 错误

# 4. 停止录屏
curl -X POST http://localhost:30000/api/devices/{deviceId}/recording/stop \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 5. 检查是否有孤儿进程
ps aux | grep screenrecord
# 应该没有输出
```

---

## ⚠️ 故障排查

### 问题 1: event_outbox 表一直有 pending 事件

**原因**: Outbox 发布器可能未正常运行，或 RabbitMQ 连接失败

**解决**:
```bash
# 1. 检查 device-service 日志
pm2 logs device-service | grep "Outbox\|Publishing"

# 2. 检查 RabbitMQ 连接
docker compose -f docker-compose.dev.yml ps rabbitmq

# 3. 重启 device-service
pm2 restart device-service

# 4. 如果 RabbitMQ 有问题，重启 RabbitMQ
docker compose -f docker-compose.dev.yml restart rabbitmq
```

### 问题 2: 配额检查仍然很慢

**原因**: 缓存未生效，或 Redis 连接失败

**解决**:
```bash
# 1. 检查 Redis 是否运行
redis-cli ping
# 应该返回 PONG

# 2. 检查日志是否有缓存命中
pm2 logs device-service | grep "cache hit"

# 3. 检查 Redis 中的缓存
redis-cli KEYS "device-service:quota:*"

# 4. 如果没有缓存，检查是否有错误
pm2 logs device-service | grep "cache\|quota" -i
```

### 问题 3: ADB 录屏仍有孤儿进程

**原因**: 旧进程未清理，或新代码未生效

**解决**:
```bash
# 1. 手动杀死所有 screenrecord 进程
pkill -SIGINT screenrecord

# 2. 确认代码已更新
grep -n "RecordingSession" backend/device-service/src/adb/adb.service.ts

# 3. 确认服务已重启并加载新代码
pm2 restart device-service --update-env

# 4. 查看日志确认 onModuleInit 执行
pm2 logs device-service | grep "Cleaning up orphaned"
```

### 问题 4: 服务启动失败

**原因**: 依赖未正确安装，或构建失败

**解决**:
```bash
# 1. 检查 shared 模块是否正确构建
ls -la backend/shared/dist/outbox

# 2. 重新安装依赖并构建
cd backend/shared
rm -rf node_modules dist
pnpm install
pnpm build

cd ../device-service
rm -rf node_modules dist
pnpm install
pnpm build

# 3. 查看详细错误日志
pm2 logs device-service --err --lines 100
```

---

## 🔄 回滚方案

如果部署后出现严重问题，可以快速回滚：

### 方式 1: Git 回滚

```bash
# 回滚到修复前的 commit
git log --oneline -10  # 查找修复前的 commit
git revert <commit-hash>

# 重新构建
cd backend/shared && pnpm build
cd ../device-service && pnpm build

# 重启服务
pm2 restart device-service
```

### 方式 2: 禁用 Outbox（紧急）

```typescript
// 临时修改 backend/device-service/src/devices/devices.service.ts
// 注释掉所有 eventOutboxService 调用，恢复旧的 eventBus 发布

// 例如在 create() 方法中：
/*
if (this.eventOutboxService) {
  await this.eventOutboxService.writeEvent(...);
}
*/

// 改为：
if (this.eventBus) {
  await this.eventBus.publishDeviceEvent('created', {...});
}
```

### 方式 3: 删除 Outbox 表（最后手段）

```bash
psql -U postgres -d cloudphone_device -c "DROP TABLE event_outbox CASCADE;"
```

---

## 📈 性能优化建议

### 1. 调整 Outbox 发布频率

如果事件量很大，可以调整发布频率：

```typescript
// backend/shared/src/outbox/event-outbox.service.ts
// 修改 @Cron 装饰器

// 从每 5 秒改为每 2 秒（更快）
@Cron('*/2 * * * * *')
async publishPendingEvents(): Promise<void> { ... }

// 或改为每 10 秒（减少负载）
@Cron('*/10 * * * * *')
async publishPendingEvents(): Promise<void> { ... }
```

### 2. 调整批量大小

```typescript
// backend/shared/src/outbox/event-outbox.service.ts
// 修改 take 参数

// 从 100 改为 200（处理更多）
const pendingEvents = await this.outboxRepository.find({
  where: { status: 'pending' },
  order: { createdAt: 'ASC' },
  take: 200,  // 增加批量大小
});
```

### 3. 调整缓存 TTL

```typescript
// backend/device-service/src/quota/quota-cache.service.ts
// 修改 CACHE_TTL

private readonly CACHE_TTL = 120; // 从 60 秒改为 120 秒（减少 user-service 负载）
```

---

## 📞 支持

如有问题，请：
1. 查看本指南的故障排查部分
2. 查看服务日志：`pm2 logs device-service --lines 100`
3. 查看完成报告：[ARCHITECTURE_FIXES_COMPLETED.md](ARCHITECTURE_FIXES_COMPLETED.md)
4. 提交 GitHub Issue

---

**最后更新**: 2025-01-29
**版本**: v1.0.0
