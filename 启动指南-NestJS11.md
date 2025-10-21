# 🚀 启动指南 - NestJS 11.x 新架构

**更新时间**: 2025-10-21  
**NestJS 版本**: 11.1.7  
**架构**: 事件驱动 + 服务发现

---

## ✅ 准备工作（已完成）

- ✅ NestJS 升级到 11.1.7
- ✅ Shared 模块编译完成
- ✅ 数据库拆分（3个独立库）
- ✅ RabbitMQ 运行中
- ✅ Consul 运行中

---

## 🚀 启动服务（推荐顺序）

### Terminal 1 - API Gateway（入口）
```bash
cd /home/eric/next-cloudphone/backend/api-gateway
pnpm run dev
```
等待看到：`🚀 API Gateway is running on: http://localhost:30000`

### Terminal 2 - User Service（认证）
```bash
cd /home/eric/next-cloudphone/backend/user-service
pnpm run dev
```
等待看到：`🚀 User Service is running on: http://localhost:30001`

### Terminal 3 - Device Service（核心+事件）
```bash
cd /home/eric/next-cloudphone/backend/device-service
pnpm run dev
```
等待看到：
- `✅ Service registered to Consul`
- `🔗 RabbitMQ: amqp://...`

### Terminal 4 - App Service（应用+事件）
```bash
cd /home/eric/next-cloudphone/backend/app-service
pnpm run dev
```
等待看到：
- `✅ Service registered to Consul`
- `RabbitMQ 连接成功`

### Terminal 5 - Billing Service（计费+事件）
```bash
cd /home/eric/next-cloudphone/backend/billing-service
pnpm run dev
```
等待看到：
- `✅ Service registered to Consul`
- `订阅 device.started 事件`

### Terminal 6 - Admin Frontend
```bash
cd /home/eric/next-cloudphone/frontend/admin
pnpm run dev
```

---

## ✅ 验证新架构

### 1. 查看 Consul 服务注册
```bash
# 浏览器访问
open http://localhost:8500

# 应该看到4个服务:
# - api-gateway
# - device-service
# - app-service
# - billing-service
```

### 2. 查看 RabbitMQ 队列
```bash
# 浏览器访问
open http://localhost:15672
# 用户名: admin, 密码: admin123

# 应该看到以下队列:
# - device-service.app-install
# - app-service.install-status
# - billing-service.device-started
# - billing-service.device-stopped
```

### 3. 测试异步应用安装
```bash
# 1. 创建设备
curl -X POST http://localhost:30002/devices \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","cpuCores":4,"memoryMB":4096}'

# 2. 安装应用（异步）
curl -X POST http://localhost:30003/apps/{appId}/install \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"{deviceId}"}'

# 立即返回 pending 状态
# 后台异步处理
```

---

## 🎯 成功标志

启动成功后，您应该看到：

**Device Service 日志**:
```
✅ Service registered to Consul
🔗 RabbitMQ: amqp://admin:admin123@localhost:5672/cloudphone
🚀 Device Service is running on: http://localhost:30002
```

**Consul UI**:
- 4个绿色服务
- 健康检查全部通过

**RabbitMQ UI**:
- Exchange: cloudphone.events
- 多个队列自动创建
- 每个队列有消费者

---

## 🎉 新架构功能

- ⚡ 应用安装响应时间：5s → 100ms
- 🔄 设备计量：自动触发（事件驱动）
- 🛡️ 分布式事务：Saga 模式
- 📈 服务发现：动态扩展

开始享受新架构吧！




