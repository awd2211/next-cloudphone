# 快速开始指南

## 🎯 三种开发模式

### 模式 1：本地开发（最快，推荐） ⚡

**适用场景**：开发单个服务，快速迭代

```bash
# 1. 启动基础设施
./dev-local.sh

# 2. 本地运行服务
cd backend/user-service
pnpm install
pnpm run dev

# 3. 访问 API
curl http://localhost:3001/health
```

**优点**：
- ✅ 启动超快（< 10秒）
- ✅ 热重载最快（< 1秒）
- ✅ 调试方便
- ✅ 资源占用少

### 模式 2：Docker 单服务开发 🐳

**适用场景**：测试服务间交互，需要完整环境

```bash
# 启动基础设施 + user-service
./dev-service.sh user-service

# 修改代码后自动重载（1-3秒）
# Ctrl+C 停止查看日志
```

**优点**：
- ✅ 环境一致
- ✅ 自动热重载
- ✅ 简单配置

### 模式 3：完整 Docker 环境 🏗️

**适用场景**：集成测试，演示

```bash
# 启动所有服务
./dev-full.sh

# 访问
# - 管理后台: http://localhost:5173
# - 用户端: http://localhost:5174
# - API: http://localhost:30000
```

**优点**：
- ✅ 完整环境
- ✅ 所有服务可用
- ✅ 接近生产环境

---

## 📝 日常开发工作流

### 开发后端服务

```bash
# 方式 A - 本地开发（推荐）
./dev-local.sh
cd backend/user-service && pnpm run dev

# 方式 B - Docker 开发
./dev-service.sh user-service
# 修改代码 → 自动重载 ✨
```

### 开发前端

```bash
# 方式 A - 本地开发（推荐）
./dev-local.sh
cd frontend/admin && pnpm run dev
# 浏览器打开 http://localhost:5173

# 方式 B - Docker 开发
./dev-service.sh admin-frontend
```

### 全栈开发

```bash
# 终端 1 - 基础设施
./dev-local.sh

# 终端 2 - 后端
cd backend/user-service && pnpm run dev

# 终端 3 - 前端
cd frontend/admin && pnpm run dev
```

---

## 🔧 常用命令

### Docker 管理

```bash
# 查看所有服务状态
docker compose -f docker-compose.dev.yml ps

# 查看服务日志
docker compose -f docker-compose.dev.yml logs -f user-service

# 重启服务
docker compose -f docker-compose.dev.yml restart user-service

# 停止所有服务
docker compose -f docker-compose.dev.yml down

# 停止并删除数据
docker compose -f docker-compose.dev.yml down -v
```

### 本地开发

```bash
# 安装依赖
cd backend/user-service && pnpm install

# 启动开发服务器
pnpm run dev

# 运行测试
pnpm test

# 构建
pnpm build

# 格式化代码
pnpm format
```

---

## 🐛 故障排查

### 问题 1：热重载不工作

```bash
# 解决方案 1：重启服务
docker compose -f docker-compose.dev.yml restart user-service

# 解决方案 2：检查文件挂载
docker exec cloudphone-user-service ls -la /app/src/

# 解决方案 3：清理并重建
docker compose down
docker volume prune
docker compose up -d --build user-service
```

### 问题 2：端口被占用

```bash
# 查找占用端口的进程
lsof -i :30001

# 或
netstat -tlnp | grep 30001

# 停止 Docker 服务
docker compose down
```

### 问题 3：依赖安装失败

```bash
# 删除 node_modules 并重新安装
cd backend/user-service
rm -rf node_modules
pnpm install

# Docker 环境
docker compose down
docker volume rm next-cloudphone_user_service_node_modules
docker compose up -d --build user-service
```

---

## 📊 服务端口映射

| 服务 | 端口 | 用途 |
|------|------|------|
| 管理后台 | 5173 | 前端界面 |
| 用户端 | 5174 | 前端界面 |
| API Gateway | 30000 | 统一入口 |
| User Service | 30001 | 用户管理 |
| Device Service | 30002 | 设备管理 |
| App Service | 30003 | 应用管理 |
| Scheduler Service | 30004 | 任务调度 |
| Billing Service | 30005 | 计费系统 |
| Notification Service | 30006 | 通知服务 |
| Media Service | 30007 | 流媒体 |
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存 |
| MinIO API | 9000 | 对象存储 |
| MinIO Console | 9001 | 管理界面 |

---

## 💡 开发技巧

### 1. 使用 VSCode 调试

1. 本地运行服务
2. 按 F5 启动调试
3. 设置断点
4. 逐步调试

### 2. 实时查看 API 文档

访问 http://localhost:30000/api/docs

### 3. 使用 Git Hooks

```bash
# 安装 pre-commit
cd backend/user-service
pnpm add -D husky lint-staged

# 配置自动格式化
```

### 4. 性能优化

```bash
# 只启动需要的服务
docker compose up -d postgres redis

# 监控资源使用
docker stats
```

---

## 🚀 生产部署

```bash
# 1. 构建生产镜像
docker compose -f docker-compose.prod.yml build

# 2. 启动生产环境
docker compose -f docker-compose.prod.yml up -d

# 3. 健康检查
docker compose -f docker-compose.prod.yml ps
```

---

## 📚 更多资源

- [完整开发指南](./DEV_GUIDE.md)
- [API 文档](http://localhost:30000/api/docs)
- [Docker 文档](./docs/DOCKER_DEPLOYMENT.md)
- [环境变量配置](./docs/ENVIRONMENT_VARIABLES.md)

---

## 🆘 需要帮助？

```bash
# 测试热重载是否正常
./test-hot-reload.sh

# 查看服务状态
docker compose ps

# 查看服务日志
docker compose logs user-service
```

**常见命令速查**：

```bash
./dev-local.sh          # 本地开发模式
./dev-service.sh xxx    # Docker 单服务开发
./dev-full.sh           # 完整环境
./test-hot-reload.sh    # 测试热重载
```
