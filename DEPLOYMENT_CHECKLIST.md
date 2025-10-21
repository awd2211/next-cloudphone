# 架构改造部署检查清单

**版本**: 2.0  
**日期**: 2025-10-21

---

## 📋 部署前检查

### 代码变更确认
- [x] Shared 模块创建完成
- [x] Event Bus 集成到所有服务
- [x] Consul 集成到所有服务
- [x] Device Service 事件消费者
- [x] App Service 事件发布/订阅
- [x] Billing Service 计量事件订阅
- [x] Saga 分布式事务实现
- [x] API Gateway Consul 集成
- [x] 前端环境变量清理
- [x] Docker Compose 更新

### 依赖包安装
```bash
# Shared 模块
cd /home/eric/next-cloudphone/backend/shared
pnpm install
pnpm run build

# Device Service
cd /home/eric/next-cloudphone/backend/device-service
pnpm install

# App Service
cd /home/eric/next-cloudphone/backend/app-service
pnpm install

# Billing Service
cd /home/eric/next-cloudphone/backend/billing-service
pnpm install

# API Gateway
cd /home/eric/next-cloudphone/backend/api-gateway
pnpm install
```

---

## 🚀 部署步骤

### 1. 停止现有服务
```bash
cd /home/eric/next-cloudphone

# Docker 方式
docker compose -f docker-compose.dev.yml down

# 本地方式
pkill -f "nest start"
pkill -f "pnpm run dev"
```

### 2. 清理旧数据（可选）
```bash
# 清理 Docker volumes（⚠️ 会删除所有数据）
docker volume rm next-cloudphone_postgres_data
docker volume rm next-cloudphone_redis_data

# 或保留数据，只删除 node_modules volumes
docker volume rm next-cloudphone_device_service_node_modules
docker volume rm next-cloudphone_app_service_node_modules
docker volume rm next-cloudphone_billing_service_node_modules
```

### 3. 启动基础设施
```bash
docker compose -f docker-compose.dev.yml up -d postgres redis rabbitmq consul minio
```

### 4. 等待基础设施就绪
```bash
# 等待所有服务变为 healthy
watch -n 2 'docker compose -f docker-compose.dev.yml ps | grep -E "postgres|redis|rabbitmq|consul|minio"'

# 应该全部显示 (healthy)
```

### 5. 验证基础设施
```bash
# RabbitMQ
curl -u admin:admin123 http://localhost:15672/api/overview

# Consul
curl http://localhost:8500/v1/status/leader

# 应该都返回成功
```

### 6. 启动微服务
```bash
# 方式A: Docker（推荐）
docker compose -f docker-compose.dev.yml up -d

# 方式B: 本地开发（热重载）
# Terminal 1
cd /home/eric/next-cloudphone/backend/device-service && pnpm run dev

# Terminal 2
cd /home/eric/next-cloudphone/backend/app-service && pnpm run dev

# Terminal 3
cd /home/eric/next-cloudphone/backend/billing-service && pnpm run dev

# Terminal 4
cd /home/eric/next-cloudphone/backend/api-gateway && pnpm run dev
```

### 7. 验证服务注册
```bash
# 等待 30 秒
sleep 30

# 检查 Consul
curl http://localhost:8500/v1/agent/services | python3 -m json.tool

# 应该看到:
# {
#   "api-gateway-xxx": {...},
#   "device-service-xxx": {...},
#   "app-service-xxx": {...},
#   "billing-service-xxx": {...}
# }
```

### 8. 验证 RabbitMQ 队列
```bash
# 访问 Management UI
open http://localhost:15672

# 或命令行
curl -u admin:admin123 http://localhost:15672/api/queues/%2Fcloudphone \
  | python3 -m json.tool \
  | grep '"name":'

# 应该看到多个队列:
# - device-service.app-install
# - app-service.install-status
# - billing-service.device-started
# - billing-service.device-stopped
# etc.
```

### 9. 健康检查
```bash
# 运行测试脚本
/home/eric/next-cloudphone/scripts/test-async-architecture.sh

# 所有检查应该通过
```

---

## ✅ 验证清单

### 基础设施层
- [ ] PostgreSQL healthy - 3个数据库已创建
- [ ] Redis healthy
- [ ] MinIO healthy
- [ ] **RabbitMQ healthy** ✨新增
- [ ] **Consul healthy** ✨新增

### 服务注册
- [ ] device-service 已注册到 Consul
- [ ] app-service 已注册到 Consul
- [ ] billing-service 已注册到 Consul
- [ ] api-gateway 已注册到 Consul

### RabbitMQ 队列
- [ ] Exchange `cloudphone.events` 已创建
- [ ] 至少 7 个队列已创建
- [ ] 每个队列有消费者连接

### 微服务健康
- [ ] API Gateway: http://localhost:30000/api/health → 200
- [ ] Device Service: http://localhost:30002/health → 200
- [ ] App Service: http://localhost:30003/health → 200
- [ ] Billing Service: http://localhost:30005/health → 200

### 前端应用
- [ ] Admin Dashboard: http://localhost:5173 可访问
- [ ] User Portal: http://localhost:5174 可访问

---

## 🔥 热更新测试

### 测试代码修改热重载
```bash
# 1. 修改 Device Service 代码
echo "// test change" >> /home/eric/next-cloudphone/backend/device-service/src/devices/devices.service.ts

# 2. 观察日志，应该看到自动重新编译
docker logs -f cloudphone-device-service
# 或本地: 查看 terminal 输出

# 3. 验证服务仍然健康
curl http://localhost:30002/health
```

---

## 🧪 功能测试用例

### 测试用例 1: 异步应用安装 ✅
**目标**: 验证应用安装从同步改为异步

**步骤**:
1. 调用安装 API
2. 立即返回（<100ms）
3. 状态为 pending
4. 后台异步处理
5. 轮询查询状态变为 installed

**预期结果**: 响应时间 <100ms，安装在后台完成

---

### 测试用例 2: 自动计量计费 ✅
**目标**: 验证设备启动/停止自动触发计量

**步骤**:
1. 启动设备
2. Billing Service 自动创建使用记录
3. 停止设备
4. Billing Service 自动结束计量并计费

**预期结果**: 无需手动调用，全自动

---

### 测试用例 3: Saga 事务 ✅
**目标**: 验证分布式事务一致性

**步骤**:
1. 购买套餐
2. Saga 编排：创建订单 → 分配设备 → 支付
3. 如果设备分配失败，自动回滚订单

**预期结果**: 数据保持一致，不会出现"扣款但未分配设备"

---

### 测试用例 4: 服务发现 ✅
**目标**: 验证 Consul 动态服务发现

**步骤**:
1. 停止 Device Service
2. Consul 标记为 unhealthy
3. API Gateway 请求失败
4. 重启 Device Service
5. 自动重新注册
6. API Gateway 请求成功

**预期结果**: 服务自动故障转移

---

## 📊 监控指标

### Consul 指标
- 注册服务数量: 4+
- 健康服务数量: 4+
- 健康检查成功率: 100%

### RabbitMQ 指标
- Exchange 数量: 1+
- 队列数量: 7+
- 消息吞吐量: >100 msg/s
- 消费者数量: 7+

### 服务指标
- 平均响应时间: <100ms
- 错误率: <0.1%
- 可用性: 99.9%

---

## 🚨 回滚计划

如果部署出现问题，可以快速回滚：

### 方式1: 恢复环境变量
```yaml
# docker-compose.dev.yml

# 禁用 Consul
USE_CONSUL: "false"

# 恢复数据库
DB_DATABASE: cloudphone

# 前端恢复直连
VITE_NOTIFICATION_WS_URL: http://localhost:30006/notifications
VITE_MEDIA_URL: http://localhost:30007
```

### 方式2: Git 回滚
```bash
git stash
# 或
git reset --hard HEAD~10
```

### 方式3: 使用旧版本容器
```bash
# 停止新版本
docker compose -f docker-compose.dev.yml down

# 使用旧镜像重新构建
docker compose -f docker-compose.dev.yml build --no-cache
docker compose -f docker-compose.dev.yml up -d
```

---

## ✨ 成功部署的标志

当您看到以下输出时，说明部署成功：

### 服务日志
```
🚀 Device Service is running on: http://localhost:30002
📚 API Documentation: http://localhost:30002/api/docs
✅ Service registered to Consul
🔗 RabbitMQ: amqp://admin:admin123@rabbitmq:5672/cloudphone
🔗 Consul: http://consul:8500
```

### Consul UI
- 4 个绿色服务图标
- 健康检查全部通过 ✅

### RabbitMQ UI
- Exchange: cloudphone.events
- 7+ 队列，每个有 1 个消费者
- 消息流转正常

---

## 📞 需要帮助？

如果遇到问题：

1. 查看 [故障排查指南](./QUICK_START_NEW_ARCHITECTURE.md#故障排查)
2. 检查服务日志: `docker logs cloudphone-xxx-service`
3. 运行测试脚本: `./scripts/test-async-architecture.sh`
4. 查看 RabbitMQ 队列堆积情况

---

**部署愉快！🎊**

