# 🚀 新架构快速启动指南

**更新日期**: 2025-10-21  
**架构版本**: 2.0 (事件驱动 + 服务发现)

---

## ⚡ 5分钟快速启动

### Step 1: 停止旧服务（如果在运行）
```bash
cd /home/eric/next-cloudphone
docker compose -f docker-compose.dev.yml down
```

### Step 2: 启动新架构
```bash
# 一键启动所有服务
docker compose -f docker-compose.dev.yml up -d

# 查看启动进度
docker compose -f docker-compose.dev.yml ps
```

### Step 3: 等待服务就绪（约2分钟）
```bash
# 等待所有服务变为 healthy
watch -n 2 "docker compose -f docker-compose.dev.yml ps | grep -E 'healthy|unhealthy'"
```

### Step 4: 验证服务注册
```bash
# 访问 Consul UI
open http://localhost:8500

# 应该看到 4 个服务:
# - api-gateway
# - device-service
# - app-service
# - billing-service
```

### Step 5: 验证 RabbitMQ
```bash
# 访问 RabbitMQ Management
open http://localhost:15672
# 用户名: admin, 密码: admin123

# 查看 Exchanges 标签
# 应该有: cloudphone.events (topic)

# 查看 Queues 标签  
# 应该有多个队列创建
```

---

## 📝 验证清单

### ✅ 基础设施层
- [ ] PostgreSQL 运行中 (3个数据库: cloudphone_core, cloudphone_billing, cloudphone_analytics)
- [ ] Redis 运行中
- [ ] MinIO 运行中
- [ ] **RabbitMQ 运行中**（新）
- [ ] **Consul 运行中**（新）

### ✅ 微服务层
- [ ] API Gateway 健康
- [ ] User Service 健康
- [ ] Device Service 健康（已注册到 Consul）
- [ ] App Service 健康（已注册到 Consul）
- [ ] Billing Service 健康（已注册到 Consul）
- [ ] Media Service 运行
- [ ] Scheduler Service 运行

### ✅ 前端层
- [ ] Admin Dashboard 可访问
- [ ] User Portal 可访问

### ✅ 事件系统
- [ ] RabbitMQ Exchange 创建
- [ ] 队列自动创建
- [ ] 服务已订阅队列

---

## 🧪 功能测试

### 测试异步应用安装

```bash
# 使用测试脚本
/home/eric/next-cloudphone/scripts/test-async-architecture.sh
```

或手动测试：

```bash
# 1. 获取 Token（登录）
TOKEN=$(curl -s -X POST http://localhost:30000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123456"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])")

# 2. 创建设备
DEVICE=$(curl -s -X POST http://localhost:30002/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": "user-id",
    "cpuCores": 4,
    "memoryMB": 4096
  }')

DEVICE_ID=$(echo $DEVICE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")
echo "Device ID: $DEVICE_ID"

# 3. 启动设备（触发计量开始）
curl -X POST "http://localhost:30002/devices/$DEVICE_ID/start" \
  -H "Authorization: Bearer $TOKEN"

echo "✅ 设备已启动，Billing Service 应该自动开始计量"

# 4. 查看 Billing Service 日志
docker logs cloudphone-billing-service --tail 10 | grep "Device started"

# 5. 查询使用记录
curl "http://localhost:30005/metering/devices/$DEVICE_ID" \
  -H "Authorization: Bearer $TOKEN"

# 6. 停止设备（触发计量结束）
curl -X POST "http://localhost:30002/devices/$DEVICE_ID/stop" \
  -H "Authorization: Bearer $TOKEN"

echo "✅ 设备已停止，Billing Service 应该自动结束计量并计费"

# 7. 再次查询使用记录
curl "http://localhost:30005/metering/devices/$DEVICE_ID" \
  -H "Authorization: Bearer $TOKEN"
# 应该看到 cost 已计算
```

---

## 🐞 故障排查

### 问题 1: 服务未注册到 Consul

**症状**: Consul UI 中看不到服务

**排查**:
```bash
# 检查服务日志
docker logs cloudphone-device-service | grep -i consul

# 应该看到:
# ✅ Service registered to Consul

# 如果看到错误:
# ⚠️ Failed to register to Consul: connection refused
```

**解决**:
```bash
# 检查 Consul 是否运行
docker ps | grep consul

# 检查环境变量
docker exec cloudphone-device-service env | grep CONSUL

# 重启服务
docker compose -f docker-compose.dev.yml restart device-service
```

---

### 问题 2: RabbitMQ 队列未创建

**症状**: RabbitMQ UI 中看不到队列

**原因**: 队列在首次订阅时创建，服务可能未启动

**排查**:
```bash
# 检查服务是否运行
docker compose -f docker-compose.dev.yml ps | grep device-service

# 检查 RabbitMQ 连接
docker logs cloudphone-device-service | grep -i rabbit

# 应该看到连接成功的日志
```

**解决**:
```bash
# 重启服务
docker compose -f docker-compose.dev.yml restart device-service
```

---

### 问题 3: 事件未被处理

**症状**: 应用安装状态一直是 pending

**排查**:
```bash
# 1. 检查事件是否发布
docker logs cloudphone-app-service | grep "Event published"

# 2. 检查队列中的消息
curl -u admin:admin123 \
  http://localhost:15672/api/queues/%2Fcloudphone/device-service.app-install \
  | python3 -m json.tool | grep messages

# 3. 检查消费者是否连接
curl -u admin:admin123 \
  http://localhost:15672/api/consumers/%2Fcloudphone \
  | python3 -m json.tool

# 4. 查看 Device Service 日志
docker logs cloudphone-device-service | grep "Received app install request"
```

**解决**:
- 确保 Device Service 正常运行
- 检查 ADB 服务是否可用
- 查看详细错误日志

---

### 问题 4: 数据库连接失败

**症状**: 服务启动失败，报 database not found

**原因**: 新数据库未创建或服务配置错误

**解决**:
```bash
# 检查数据库是否存在
docker exec cloudphone-postgres psql -U postgres -c "\l" | grep cloudphone

# 应该看到:
# cloudphone_core
# cloudphone_billing  
# cloudphone_analytics

# 如果不存在，执行迁移脚本
cat /home/eric/next-cloudphone/database/migrations/002_split_databases.sql \
  | docker exec -i cloudphone-postgres psql -U postgres

# 或让 TypeORM 自动创建（推荐）
# 确保环境变量: synchronize=true
```

---

## 🎯 关键命令速查

### Docker Commands
```bash
# 启动所有服务
docker compose -f docker-compose.dev.yml up -d

# 查看服务状态
docker compose -f docker-compose.dev.yml ps

# 查看日志
docker compose -f docker-compose.dev.yml logs -f [service-name]

# 重启单个服务
docker compose -f docker-compose.dev.yml restart [service-name]

# 停止所有服务
docker compose -f docker-compose.dev.yml down
```

### Consul Commands
```bash
# 列出所有服务
curl http://localhost:8500/v1/agent/services | python3 -m json.tool

# 获取服务实例
curl http://localhost:8500/v1/health/service/device-service | python3 -m json.tool

# 注销服务（手动）
curl -X PUT http://localhost:8500/v1/agent/service/deregister/device-service-xxx
```

### RabbitMQ Commands
```bash
# 列出所有队列
curl -u admin:admin123 http://localhost:15672/api/queues/%2Fcloudphone | python3 -m json.tool

# 列出所有 Exchange
curl -u admin:admin123 http://localhost:15672/api/exchanges/%2Fcloudphone | python3 -m json.tool

# 查看队列详情
curl -u admin:admin123 \
  http://localhost:15672/api/queues/%2Fcloudphone/device-service.app-install \
  | python3 -m json.tool

# 消费消息（调试用）
curl -u admin:admin123 -X POST \
  http://localhost:15672/api/queues/%2Fcloudphone/device-service.app-install/get \
  -H "Content-Type: application/json" \
  -d '{"count":1,"ackmode":"ack_requeue_false","encoding":"auto"}'
```

---

## 🎓 最佳实践

### 1. 服务启动顺序
```
基础设施 → 微服务 → 前端

1. postgres, redis, rabbitmq, consul, minio
2. device-service, app-service, billing-service
3. api-gateway
4. admin-frontend, user-frontend
```

### 2. 开发模式
建议使用本地启动（热重载）而不是 Docker：
```bash
# Terminal 1: Device Service
cd backend/device-service && pnpm run dev

# Terminal 2: App Service  
cd backend/app-service && pnpm run dev

# Terminal 3: Billing Service
cd backend/billing-service && pnpm run dev
```

### 3. 日志查看
```bash
# Docker 日志
docker logs -f cloudphone-device-service

# 本地日志
tail -f logs/device-service.log
```

---

## ✅ 成功标志

启动成功后，您应该看到：

**Consul UI (http://localhost:8500)**:
- 4个绿色服务图标
- 健康检查全部通过

**RabbitMQ UI (http://localhost:15672)**:
- Exchange `cloudphone.events` 存在
- 至少 7 个队列创建
- 每个队列有 1 个消费者

**服务日志**:
```
✅ Service registered to Consul
🚀 Device Service is running on: http://localhost:30002
📚 API Documentation: http://localhost:30002/api/docs
🔗 RabbitMQ: amqp://admin:admin123@rabbitmq:5672/cloudphone
🔗 Consul: http://consul:8500
```

---

## 🎉 恭喜！

您的云手机平台已成功升级到事件驱动微服务架构！

现在可以：
- ✅ 独立扩展每个服务
- ✅ 快速响应用户请求
- ✅ 自动容错和恢复
- ✅ 保证数据最终一致性

开始使用新架构吧！ 🎊

