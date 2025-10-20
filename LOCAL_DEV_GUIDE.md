# 云手机平台 - 本地开发环境指南

## ✅ 当前状态

### 运行中的服务

**基础设施** (Docker 容器)
- ✅ PostgreSQL 14 (localhost:5432)
- ✅ Redis 7 (localhost:6379)
- ✅ MinIO (localhost:9000, console:9001)

**后端微服务** (本地进程)
- ✅ API Gateway (http://localhost:30000)
- ✅ User Service (http://localhost:30001)
- ✅ Device Service (http://localhost:30002)
- ✅ App Service (http://localhost:30003)
- ✅ Billing Service (http://localhost:30005)

### 数据库状态

- ✅ 11 个数据库表已创建
- ✅ 20 个权限
- ✅ 2 个角色（admin, user）
- ✅ 2 个测试账号
- ✅ 4 个套餐计划

---

## 🚀 快速开始

### 启动环境

```bash
cd /home/eric/next-cloudphone
./start-local-dev.sh
```

### 停止环境

```bash
./stop-local-dev.sh
```

---

## 📊 服务访问

### API 端点

| 服务 | 地址 | 健康检查 |
|------|------|----------|
| API Gateway | http://localhost:30000 | http://localhost:30000/api/health |
| User Service | http://localhost:30001 | http://localhost:30001/health |
| Device Service | http://localhost:30002 | http://localhost:30002/health |
| App Service | http://localhost:30003 | http://localhost:30003/health |
| Billing Service | http://localhost:30005 | http://localhost:30005/health |

### 基础设施

| 服务 | 地址 | 凭据 |
|------|------|------|
| PostgreSQL | localhost:5432 | postgres / postgres |
| Redis | localhost:6379 | (无密码) |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| MinIO API | http://localhost:9000 | minioadmin / minioadmin |

---

## 🔐 默认账号

### 应用账号

**管理员**
```
用户名: admin
密码: admin123456
角色: 超级管理员
权限: 所有权限
```

**测试用户**
```
用户名: testuser
密码: test123456
角色: 普通用户
权限: 基础权限
```

### 套餐计划

| 名称 | 类型 | 价格 | 云手机数量 |
|------|------|------|-----------|
| 免费版 | free | ¥0/月 | 1 个 |
| 基础版 | basic | ¥29.9/月 | 5 个 |
| 专业版 | pro | ¥99.9/月 | 20 个 |
| 企业版 | enterprise | ¥499.9/月 | 100 个 |

---

## 🔍 日志查看

### 查看所有服务日志

```bash
tail -f logs/*.log
```

### 查看特定服务日志

```bash
# User Service
tail -f logs/user-service.log

# API Gateway
tail -f logs/api-gateway.log

# Device Service
tail -f logs/device-service.log

# App Service
tail -f logs/app-service.log

# Billing Service
tail -f logs/billing-service.log
```

---

## 🧪 测试 API

### 健康检查

```bash
# API Gateway
curl http://localhost:30000/api/health

# User Service
curl http://localhost:30001/health

# Device Service
curl http://localhost:30002/health

# App Service
curl http://localhost:30003/health

# Billing Service
curl http://localhost:30005/health
```

### 用户登录

```bash
# 管理员登录
curl -X POST http://localhost:30000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123456"
  }'

# 测试用户登录
curl -X POST http://localhost:30000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123456"
  }'
```

### 获取用户列表

```bash
# 先登录获取 token
TOKEN=$(curl -s -X POST http://localhost:30000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123456"}' \
  | jq -r '.access_token')

# 使用 token 获取用户列表
curl http://localhost:30000/api/users \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🛠️ 开发工作流

### 修改代码

所有服务都运行在开发模式（`pnpm run dev`），支持热重载：

1. 修改代码
2. 保存文件
3. 服务自动重启
4. 查看日志确认更改生效

### 重启单个服务

如果需要重启特定服务：

```bash
# 找到服务 PID
cat logs/user-service.pid

# 停止服务
kill $(cat logs/user-service.pid)

# 重新启动
cd backend/user-service
nohup pnpm run dev > ../../logs/user-service.log 2>&1 &
echo $! > ../../logs/user-service.pid
```

### 数据库管理

```bash
# 连接到 PostgreSQL
docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -d cloudphone

# 查看所有表
\dt

# 查看用户数据
SELECT * FROM users;

# 重置数据库
cd database
pnpm run reset
```

---

## 📦 服务架构

```
                    ┌─────────────────┐
                    │  API Gateway    │
                    │   Port: 3000    │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
   │  User   │         │ Device  │         │   App   │
   │ Service │         │ Service │         │ Service │
   │  :3001  │         │  :3002  │         │  :3003  │
   └─────────┘         └─────────┘         └─────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                ┌────────────▼───────────────┐
                │                            │
          ┌─────▼─────┐              ┌──────▼──────┐
          │PostgreSQL │              │    Redis    │
          │   :5432   │              │    :6379    │
          └───────────┘              └─────────────┘
```

---

## ❓ 常见问题

### 端口被占用

```bash
# 查找占用端口的进程
lsof -i :3000

# 或使用
netstat -tlnp | grep 3000

# 停止所有服务
./stop-local-dev.sh
```

### 服务启动失败

```bash
# 查看日志
tail -50 logs/user-service.log

# 检查数据库连接
docker compose -f docker-compose.dev.yml ps

# 重启基础设施
docker compose -f docker-compose.dev.yml restart postgres redis
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 状态
docker compose -f docker-compose.dev.yml exec postgres pg_isready

# 查看 PostgreSQL 日志
docker compose -f docker-compose.dev.yml logs postgres
```

---

## 🔄 下一步

### 添加新功能

1. 修改相应服务的代码
2. 服务自动重载
3. 测试 API
4. 查看日志确认

### 部署到 Docker（等 Docker Hub 恢复）

```bash
# 重新构建所有服务
docker compose -f docker-compose.dev.yml up -d --build
```

### 前端开发

```bash
# 管理后台
cd frontend/admin
pnpm install
pnpm run dev
# 访问 http://localhost:5173

# 用户端
cd frontend/user
pnpm install
pnpm run dev
# 访问 http://localhost:5174
```

---

## 📝 注意事项

1. **Docker Hub 问题**：目前 Docker Hub 有 503 错误，所以使用本地开发模式
2. **热重载**：所有 Node.js 服务支持代码热重载
3. **日志**：所有日志保存在 `logs/` 目录
4. **数据持久化**：PostgreSQL、Redis、MinIO 数据都持久化在 Docker volumes

---

## 🎯 生产部署准备

当 Docker Hub 恢复后：

1. 构建所有服务镜像
2. 推送到镜像仓库
3. 使用 `docker-compose.prod.yml` 部署
4. 配置反向代理（Nginx/Traefik）
5. 启用 HTTPS
6. 配置监控和日志收集

---

**生成时间**: 2025-10-20
**环境**: 开发环境
**状态**: ✅ 运行中
