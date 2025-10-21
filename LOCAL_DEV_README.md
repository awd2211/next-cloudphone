# 🚀 本地开发模式使用指南

**模式**: 完整本地开发  
**Docker**: 仅基础设施  
**日期**: 2025-10-21

---

## 📋 架构说明

### Docker 运行（基础设施）
- PostgreSQL (5432) - 3个数据库
- Redis (6379)
- RabbitMQ (5672, 15672) - 消息队列 ✨
- Consul (8500) - 服务注册 ✨
- MinIO (9000, 9001) - 对象存储

### 本地运行（所有业务服务）

**后端微服务 (NestJS/TS)**:
- API Gateway (30000)
- User Service (30001)
- Device Service (30002)
- App Service (30003)
- Billing Service (30005)
- Notification Service (30006)

**其他后端**:
- Scheduler Service (30004) - Python/FastAPI
- Media Service (30007) - Go/Gin

**前端应用**:
- Admin Frontend (5173) - React/Vite
- User Frontend (5174) - React/Vite

---

## ⚡ 快速启动

### 一键启动所有服务
```bash
cd /home/eric/next-cloudphone
./START_ALL_LOCAL.sh
```

等待约 30-60 秒，所有服务启动完成。

### 一键停止所有服务
```bash
./STOP_ALL_LOCAL.sh
```

---

## 📝 手动启动（分步骤）

### Step 1: 启动基础设施
```bash
docker compose -f docker-compose.dev.yml up -d postgres redis rabbitmq consul minio

# 验证
docker ps | grep cloudphone
# 应该看到 5 个容器全部 healthy
```

### Step 2: 启动后端微服务

在不同的 Terminal 窗口中运行（方便查看日志）：

**Terminal 1 - Device Service**:
```bash
cd /home/eric/next-cloudphone/backend/device-service
pnpm run dev
```

**Terminal 2 - App Service**:
```bash
cd /home/eric/next-cloudphone/backend/app-service
pnpm run dev
```

**Terminal 3 - Billing Service**:
```bash
cd /home/eric/next-cloudphone/backend/billing-service
pnpm run dev
```

**Terminal 4 - API Gateway**:
```bash
cd /home/eric/next-cloudphone/backend/api-gateway
pnpm run dev
```

**Terminal 5 - User Service**:
```bash
cd /home/eric/next-cloudphone/backend/user-service
pnpm run dev
```

**Terminal 6 - Notification Service**:
```bash
cd /home/eric/next-cloudphone/backend/notification-service
pnpm run dev
```

### Step 3: 启动 Scheduler Service (Python)
**Terminal 7**:
```bash
cd /home/eric/next-cloudphone/backend/scheduler-service

# 首次运行，创建虚拟环境
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 启动
python main.py
```

### Step 4: 启动 Media Service (Go)
**Terminal 8**:
```bash
cd /home/eric/next-cloudphone/backend/media-service
go run main.go
```

### Step 5: 启动前端
**Terminal 9 - Admin Frontend**:
```bash
cd /home/eric/next-cloudphone/frontend/admin
pnpm run dev
```

**Terminal 10 - User Frontend**:
```bash
cd /home/eric/next-cloudphone/frontend/user
pnpm run dev
```

---

## 🐛 调试优势

### 1. 实时日志
每个服务在独立的 Terminal，日志清晰可见，带颜色高亮。

### 2. 热重载
修改代码 → 自动检测 → 1-2秒重新编译 → 无需手动重启

### 3. 断点调试
VS Code 中可以直接 F5 启动调试，设置断点。

### 4. 快速重启
Ctrl+C 停止 → 上箭头 + Enter 重启 → 5秒搞定

### 5. 查看变量
直接在 Terminal 看到所有 console.log 输出。

---

## 🔍 验证服务

### 检查服务注册（Consul）
```bash
# 浏览器访问
open http://localhost:8500

# 或命令行
curl http://localhost:8500/v1/agent/services | python3 -m json.tool
```

### 检查消息队列（RabbitMQ）
```bash
# 浏览器访问
open http://localhost:15672
# 用户名: admin
# 密码: admin123

# 查看队列
curl -u admin:admin123 http://localhost:15672/api/queues/%2Fcloudphone
```

### 检查服务健康
```bash
curl http://localhost:30000/api/health  # API Gateway
curl http://localhost:30002/health      # Device Service
curl http://localhost:30003/health      # App Service
curl http://localhost:30005/health      # Billing Service
```

---

## 📁 配置文件位置

所有 .env 文件已创建：
```
backend/device-service/.env
backend/app-service/.env
backend/billing-service/.env
backend/api-gateway/.env
backend/user-service/.env
backend/scheduler-service/.env
frontend/admin/.env
frontend/user/.env
```

---

## 🎯 开发工作流

### 修改代码
```bash
# 1. 修改代码（任何服务）
vim backend/device-service/src/devices/devices.service.ts

# 2. 保存
# → NestJS 自动检测到变化
# → 自动重新编译
# → 1-2秒后重启
# → Terminal 显示: File change detected. Starting compilation...
```

### 查看日志
```bash
# 实时查看
# → 直接在对应的 Terminal 查看

# 或查看日志文件
tail -f logs/device-service.log
tail -f logs/app-service.log
```

### 测试API
```bash
# 所有服务的 Swagger 文档可用
http://localhost:30000/api/docs
http://localhost:30002/api/docs
http://localhost:30003/api/docs
```

---

## ⚡ 性能对比

| 操作 | Docker 模式 | 本地模式 |
|------|------------|---------|
| 启动时间 | 2-3分钟 | 10-30秒 |
| 热重载 | 10-30秒 | 1-2秒 |
| 内存占用 | 4-8GB | 1-2GB |
| 日志查看 | docker logs | 直接看 Terminal |
| 断点调试 | 需配置 | 直接F5 |

---

## 🎓 VS Code 调试配置

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Device Service",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/backend/device-service",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug App Service",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/backend/app-service",
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Billing Service",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/backend/billing-service",
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API Gateway",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/backend/api-gateway",
      "console": "integratedTerminal"
    }
  ]
}
```

然后：
1. 在代码中设置断点
2. F5 或点击"运行和调试"
3. 选择要调试的服务
4. 单步调试、查看变量！

---

## 🔧 常见问题

### Q: pnpm install 很慢？
A: 使用国内镜像：
```bash
pnpm config set registry https://registry.npmmirror.com
```

### Q: 端口被占用？
A: 查找并停止占用进程：
```bash
lsof -i :30002
kill -9 <PID>
```

### Q: @cloudphone/shared 找不到？
A: 重新安装 workspace 依赖：
```bash
cd /home/eric/next-cloudphone
pnpm install
cd backend/shared && pnpm run build
```

---

## 🎉 优势总结

### 开发体验
- ⚡ 超快热重载（1-2秒）
- 🐛 可以打断点调试
- 📊 彩色日志，清晰可见
- 🔍 完整错误堆栈

### 资源占用
- 💻 内存占用低（1-2GB vs 4-8GB）
- 🚀 启动快（10-30秒 vs 2-3分钟）

### 调试能力
- ✅ VS Code 调试器
- ✅ 实时查看变量
- ✅ 单步执行
- ✅ 条件断点

---

**开始享受本地开发的乐趣吧！** 🎊





