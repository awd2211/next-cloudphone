# 角色化通知系统 - 部署和测试指南

**日期**: 2025-11-03
**状态**: Phase 5 已完成，准备部署

---

## 📋 部署前检查清单

在开始部署之前，请确认以下条件：

- [ ] Phase 1-4 所有代码已提交到版本控制
- [ ] 数据库备份已完成
- [ ] PostgreSQL 版本 >= 14
- [ ] notification-service 已停止运行
- [ ] 所有服务的 .env 文件配置正确

---

## 🚀 部署步骤

### Step 1: 运行数据库迁移

按顺序运行以下迁移脚本：

#### 1.1 添加角色字段（如果还没运行）

```bash
cd /home/eric/next-cloudphone/backend/notification-service

# 连接到 PostgreSQL
psql -U postgres -d cloudphone_notification

# 运行迁移
\i migrations/20251103_add_role_fields.sql

# 验证字段添加成功
\d notification_templates
```

**预期输出**：应该看到以下新字段
- `target_roles` (text[])
- `exclude_roles` (text[])
- `priority` (integer)
- `role_specific_data` (jsonb)

#### 1.2 导入角色化模板种子数据

```bash
# 运行模板导入
\i migrations/20251103_role_based_templates_seed.sql
```

**预期输出**：
```
INSERT 0 28  (28个角色化模板)
 status                    | total_templates | role_specific_templates | universal_templates
---------------------------+-----------------+------------------------+---------------------
 角色化模板导入完成         |              28 |                      28 |                   0
```

**导入的模板**：
- Device events: 21个模板（7个事件 × 3个角色）
- Billing events: 6个模板（3个事件 × 2个角色）
- User events: 2个模板（管理员专用）
- App events: 1个模板（管理员专用）

#### 1.3 验证模板导入

```sql
-- 查看所有角色化模板
SELECT
  code,
  type,
  target_roles,
  priority,
  is_active
FROM notification_templates
WHERE target_roles != '{}'
ORDER BY code;

-- 按角色统计模板
SELECT
  unnest(target_roles) as role,
  COUNT(*) as template_count
FROM notification_templates
WHERE target_roles != '{}'
GROUP BY role
ORDER BY role;
```

**预期结果**：
- super_admin: ~16个模板
- tenant_admin: ~11个模板
- admin: ~3个模板

---

### Step 2: 构建服务

按顺序构建以下服务：

#### 2.1 构建 @cloudphone/shared

```bash
cd /home/eric/next-cloudphone/backend/shared
pnpm build

# 验证构建成功
ls -la dist/
```

#### 2.2 构建 device-service

```bash
cd /home/eric/next-cloudphone/backend/device-service
pnpm build

# 验证构建成功
ls -la dist/main.js
```

#### 2.3 构建 notification-service

```bash
cd /home/eric/next-cloudphone/backend/notification-service
pnpm build

# 验证构建成功
ls -la dist/main.js
```

**构建检查**：
```bash
# 检查 TypeScript 编译是否成功
echo "✅ shared 构建成功" && \
echo "✅ device-service 构建成功" && \
echo "✅ notification-service 构建成功"
```

---

### Step 3: 启动服务

使用 PM2 启动服务：

#### 3.1 启动基础设施（如果未运行）

```bash
cd /home/eric/next-cloudphone
docker compose -f docker-compose.dev.yml up -d

# 等待服务就绪（约10秒）
sleep 10

# 检查服务状态
docker compose -f docker-compose.dev.yml ps
```

#### 3.2 启动微服务

```bash
# 启动所有服务（或重启特定服务）
pm2 restart device-service
pm2 restart notification-service
pm2 restart user-service  # 如果已更新

# 查看启动日志
pm2 logs device-service --lines 50
pm2 logs notification-service --lines 50
```

#### 3.3 健康检查

```bash
# 检查服务健康状态
echo "=== Device Service ==="
curl -s http://localhost:30002/health | jq

echo "=== Notification Service ==="
curl -s http://localhost:30006/health | jq

echo "=== User Service ==="
curl -s http://localhost:30001/health | jq
```

**预期响应**：所有服务返回 `{ "status": "ok", ... }`

---

## 🧪 功能测试

### Test 1: 创建设备 - 验证角色化通知

#### 测试目标
验证不同角色的用户创建设备时收到不同的通知内容。

#### 准备工作
```bash
# 1. 创建测试用户（不同角色）
# super_admin: admin@cloudphone.com
# tenant_admin: tenant_admin@test.com
# user: user@test.com

# 2. 获取认证 Token
export SUPER_ADMIN_TOKEN="<从登录响应获取>"
export TENANT_ADMIN_TOKEN="<从登录响应获取>"
export USER_TOKEN="<从登录响应获取>"
```

#### 执行测试

**测试用例 1: Super Admin 创建设备**

```bash
curl -X POST http://localhost:30002/devices \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-device-super-admin",
    "type": "android",
    "providerType": "redroid",
    "cpuCores": 2,
    "memoryMB": 4096,
    "diskSizeGB": 20
  }'
```

**预期通知内容**：
- 标题：`🚀 系统新增设备 - test-device-super-admin`
- 包含：系统统计、技术信息、所有租户数据
- 模板代码：`device.created.super_admin`

**测试用例 2: Tenant Admin 创建设备**

```bash
curl -X POST http://localhost:30002/devices \
  -H "Authorization: Bearer $TENANT_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-device-tenant",
    "type": "android",
    "providerType": "redroid",
    "cpuCores": 2,
    "memoryMB": 2048,
    "diskSizeGB": 10
  }'
```

**预期通知内容**：
- 标题：`✨ 租户新增设备 - test-device-tenant`
- 包含：租户统计、配额使用、租户范围数据
- 模板代码：`device.created.tenant_admin`

**测试用例 3: User 创建设备**

```bash
curl -X POST http://localhost:30002/devices \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-device-user",
    "type": "android",
    "providerType": "redroid",
    "cpuCores": 1,
    "memoryMB": 2048,
    "diskSizeGB": 10
  }'
```

**预期通知内容**：
- 标题：`📱 设备创建成功 - test-device-user`
- 包含：简洁的设备信息
- 模板代码：`device.created` (基础模板)

---

### Test 2: 验证通知数据

#### 方法 1: 查询数据库

```sql
-- 查看最近的通知记录
SELECT
  n.id,
  n.title,
  n.message,
  n.type,
  nt.code as template_code,
  nt.target_roles,
  n.created_at
FROM notifications n
LEFT JOIN notification_templates nt ON n.template_code = nt.code
ORDER BY n.created_at DESC
LIMIT 10;

-- 按角色统计通知
SELECT
  nt.target_roles[1] as role,
  COUNT(*) as notification_count
FROM notifications n
JOIN notification_templates nt ON n.template_code = nt.code
WHERE nt.target_roles != '{}'
  AND n.created_at > NOW() - INTERVAL '1 hour'
GROUP BY role;
```

#### 方法 2: 检查日志

```bash
# 查看 notification-service 日志
pm2 logs notification-service | grep "createRoleBasedNotification"

# 查看 device-service 日志
pm2 logs device-service | grep "getUserInfo"
```

**预期日志内容**：
```
收到设备创建事件: test-device-super-admin (redroid) - Role: super_admin
使用角色模板: device.created.super_admin
通知已发送: super_admin
```

---

### Test 3: 设备生命周期测试

测试完整的设备生命周期，验证所有事件的角色化通知：

```bash
# 1. 创建设备
DEVICE_ID=$(curl -X POST http://localhost:30002/devices \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}' | jq -r '.id')

# 2. 启动设备
curl -X POST "http://localhost:30002/devices/$DEVICE_ID/start" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"

# 等待5秒
sleep 5

# 3. 停止设备
curl -X POST "http://localhost:30002/devices/$DEVICE_ID/stop" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"

# 等待5秒
sleep 5

# 4. 删除设备
curl -X DELETE "http://localhost:30002/devices/$DEVICE_ID" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"
```

**预期通知数量**：4个（created, started, stopped, deleted）

**验证查询**：
```sql
SELECT
  nt.code,
  n.title,
  n.created_at
FROM notifications n
JOIN notification_templates nt ON n.template_code = nt.code
WHERE n.user_id = '<user_id>'
  AND n.created_at > NOW() - INTERVAL '5 minutes'
ORDER BY n.created_at;
```

---

### Test 4: 计费事件测试

#### 测试余额不足通知

```bash
# 模拟低余额事件（需要在 billing-service 中触发）
# 或者直接发布 RabbitMQ 消息进行测试

# 查看通知
psql -U postgres -d cloudphone_notification -c "
SELECT
  title,
  message,
  type,
  template_code
FROM notifications
WHERE template_code LIKE 'billing.low_balance%'
ORDER BY created_at DESC
LIMIT 5;
"
```

---

## 🔍 故障排查

### 问题 1: 模板未正确选择

**症状**：所有角色都收到基础模板通知

**诊断**：
```sql
-- 检查角色模板是否存在
SELECT code, target_roles, priority
FROM notification_templates
WHERE code LIKE '%.super_admin'
  OR code LIKE '%.tenant_admin';

-- 检查用户角色信息
SELECT id, username, roles
FROM users
WHERE id = '<user_id>';
```

**解决方案**：
1. 确认模板已导入：运行 Step 1.2
2. 确认事件包含 userRole：检查 device-service 日志
3. 确认 createRoleBasedNotification 被调用：检查 notification-service 日志

### 问题 2: getUserInfo() 失败

**症状**：所有用户都使用默认角色 'user'

**诊断**：
```bash
# 检查 device-service 日志
pm2 logs device-service | grep "getUserInfo"

# 检查 user-service 健康状态
curl http://localhost:30001/health
```

**解决方案**：
1. 确认 user-service 运行正常
2. 确认 .env 中 USER_SERVICE_URL 配置正确
3. 重启 device-service：`pm2 restart device-service`

### 问题 3: 数据库迁移失败

**症状**：字段不存在错误

**诊断**：
```sql
\d notification_templates
-- 检查是否有 target_roles, priority 等字段
```

**解决方案**：
```bash
# 重新运行迁移
psql -U postgres -d cloudphone_notification -f migrations/20251103_add_role_fields.sql
```

### 问题 4: 服务启动失败

**症状**：PM2 显示服务 stopped 或 errored

**诊断**：
```bash
pm2 logs notification-service --lines 100
pm2 logs device-service --lines 100
```

**常见原因**：
1. TypeScript 编译错误 → 重新构建：`pnpm build`
2. 数据库连接失败 → 检查 .env 配置
3. RabbitMQ 连接失败 → 检查 docker-compose 服务

---

## ✅ 验收标准

所有测试通过后，确认以下标准：

### 功能验收
- [ ] 不同角色创建设备收到不同通知内容
- [ ] Super Admin 通知包含系统统计
- [ ] Tenant Admin 通知包含租户统计
- [ ] User 收到简洁通知
- [ ] 所有设备生命周期事件正常
- [ ] 计费事件通知正常

### 性能验收
- [ ] 设备创建无明显延迟（<2秒）
- [ ] 通知发送延迟 <1秒
- [ ] getUserInfo() 调用成功率 >99%

### 数据验收
- [ ] 28个角色化模板全部导入
- [ ] 所有模板 is_active = true
- [ ] target_roles 字段正确设置
- [ ] priority 字段合理（0-100）

---

## 📊 监控和维护

### 日常监控

```bash
# 每日检查通知发送情况
psql -U postgres -d cloudphone_notification -c "
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_notifications,
  COUNT(CASE WHEN template_code LIKE '%.super_admin' THEN 1 END) as super_admin,
  COUNT(CASE WHEN template_code LIKE '%.tenant_admin' THEN 1 END) as tenant_admin,
  COUNT(CASE WHEN template_code NOT LIKE '%.%' THEN 1 END) as basic
FROM notifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
"
```

### 模板使用统计

```sql
SELECT
  nt.code,
  nt.target_roles,
  COUNT(n.id) as usage_count,
  MAX(n.created_at) as last_used
FROM notification_templates nt
LEFT JOIN notifications n ON n.template_code = nt.code
WHERE nt.target_roles != '{}'
GROUP BY nt.code, nt.target_roles
ORDER BY usage_count DESC;
```

### 性能监控

```bash
# 监控 getUserInfo 性能
pm2 logs device-service | grep "getUserInfo" | tail -100

# 监控通知发送性能
pm2 logs notification-service | grep "createRoleBasedNotification" | tail -100
```

---

## 🎉 完成

恭喜！角色化通知系统已成功部署。

**下一步建议**：
1. 创建更多角色特定模板（根据业务需求）
2. 收集用户反馈，优化模板内容
3. 监控系统性能，调整缓存策略
4. 定期审查和更新模板

**文档链接**：
- 设计文档：`ROLE_BASED_NOTIFICATION_DESIGN.md`
- Phase 4 完成报告：`ROLE_BASED_NOTIFICATION_PHASE4_COMPLETE.md`
- Phase 1-3 完成报告：`ROLE_BASED_NOTIFICATION_PHASE1-3_COMPLETE.md`
