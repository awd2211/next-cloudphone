# ✅ 本地开发模式配置完成

**配置完成时间**: 2025-10-21 14:40  
**模式**: 完整本地开发（Docker仅基础设施）

---

## 🎯 当前配置

### Docker 运行（5个基础设施容器）
- ✅ PostgreSQL - 数据库（3个库）
- ✅ Redis - 缓存
- ✅ RabbitMQ - 消息队列（新）
- ✅ Consul - 服务注册（新）
- ✅ MinIO - 对象存储

### 本地准备运行（10个业务服务）

**NestJS 后端** (6个):
1. API Gateway (30000) ✓
2. User Service (30001) ✓
3. Device Service (30002) ✓
4. App Service (30003) ✓
5. Billing Service (30005) ✓
6. Notification Service (30006) ✓

**其他后端** (2个):
7. Scheduler Service (30004) - Python ✓
8. Media Service (30007) - Go ✓

**前端** (2个):
9. Admin Frontend (5173) ✓
10. User Frontend (5174) ✓

---

## 📝 所有 .env 文件已创建

```
✅ backend/device-service/.env
✅ backend/app-service/.env
✅ backend/billing-service/.env
✅ backend/api-gateway/.env
✅ backend/user-service/.env (已存在)
✅ backend/scheduler-service/.env
✅ frontend/admin/.env
✅ frontend/user/.env
```

---

## 🚀 如何启动

### 方法1: 一键启动（后台运行）
```bash
cd /home/eric/next-cloudphone
./START_ALL_LOCAL.sh
```

**特点**:
- 所有服务后台运行
- 日志输出到 logs/ 目录
- 适合快速启动

**查看日志**:
```bash
tail -f logs/device-service.log
tail -f logs/app-service.log
tail -f logs/admin-frontend.log
```

---

### 方法2: 多 Terminal 启动（推荐开发）
在不同 Terminal 窗口运行，方便查看实时日志：

```bash
# Terminal 1
cd backend/device-service && pnpm run dev

# Terminal 2
cd backend/app-service && pnpm run dev

# Terminal 3
cd backend/billing-service && pnpm run dev

# Terminal 4
cd backend/api-gateway && pnpm run dev

# Terminal 5
cd backend/user-service && pnpm run dev

# Terminal 6
cd backend/scheduler-service
source venv/bin/activate && python main.py

# Terminal 7
cd backend/media-service && go run main.go

# Terminal 8
cd frontend/admin && pnpm run dev

# Terminal 9
cd frontend/user && pnpm run dev
```

**优点**:
- ✅ 实时彩色日志
- ✅ 独立控制每个服务
- ✅ 方便调试

---

## 🔧 开发工作流示例

### 场景1: 修改 Device Service
```bash
# 1. 在 Terminal 1 中运行
cd backend/device-service
pnpm run dev

# 2. 修改代码
vim src/devices/devices.service.ts

# 3. 保存
# → 自动检测变化
# → 1-2秒后重新编译
# → Terminal 显示: "Restarting..."

# 4. 测试
curl http://localhost:30002/devices
```

### 场景2: 调试应用安装流程
```bash
# 1. 在 Device Service Terminal 中可以看到：
[DevicesConsumer] Received app install request: ...
[AdbService] Installing APK: /tmp/xxx.apk

# 2. 在 App Service Terminal 中可以看到：
[AppsService] App install request published: ...
[AppsConsumer] App install completed: ...

# 3. 在 Billing Service Terminal 中可以看到：
[MeteringConsumer] Device started event received: ...
[MeteringService] Usage metering started for device ...
```

实时看到事件在各服务间流转！

---

## 🎨 VS Code 多窗口布局建议

```
┌─────────────────────────────────────────┐
│  代码编辑区                              │
│  (主要工作区)                            │
├──────────────┬──────────────┬───────────┤
│ Terminal 1   │ Terminal 2   │Terminal 3 │
│ Device Svc   │ App Service  │Billing Svc│
├──────────────┼──────────────┼───────────┤
│ Terminal 4   │ Terminal 5   │Terminal 6 │
│ API Gateway  │ Admin UI     │ User UI   │
└──────────────┴──────────────┴───────────┘
```

---

## 📊 资源占用

### Docker（仅基础设施）
- 内存: ~500MB
- CPU: 5-10%
- 容器: 5个

### 本地服务
- 内存: ~1.5GB (所有10个服务)
- CPU: 10-20% (空闲时)
- 进程: ~20个

**总计**: 约 2GB 内存，远低于全 Docker 的 6-8GB

---

## ✅ 确认清单

启动后请确认：

**基础设施**:
- [ ] http://localhost:5432 - PostgreSQL 可连接
- [ ] http://localhost:6379 - Redis 可连接
- [ ] http://localhost:8500 - Consul UI 可访问
- [ ] http://localhost:15672 - RabbitMQ UI 可访问
- [ ] http://localhost:9001 - MinIO Console 可访问

**后端服务**:
- [ ] http://localhost:30000/api/health - API Gateway
- [ ] http://localhost:30002/health - Device Service
- [ ] http://localhost:30003/health - App Service
- [ ] http://localhost:30005/health - Billing Service

**前端应用**:
- [ ] http://localhost:5173 - Admin Dashboard
- [ ] http://localhost:5174 - User Portal

**Consul 服务注册**:
- [ ] 在 http://localhost:8500 看到 4+ 服务注册

**RabbitMQ 队列**:
- [ ] 在 http://localhost:15672 看到 7+ 队列创建

---

## 🎉 完成！

现在您拥有：
- ✅ 完整的本地开发环境
- ✅ 超快的热重载
- ✅ 完整的调试能力
- ✅ 新架构的所有功能（事件驱动+服务发现）

开始开发吧！🚀





