# 开发环境优化 - 无需每次打包

## ✅ 已配置完成

您的开发环境**已经配置好代码热重载**，无需每次打包到容器！

### 🎯 核心原理

Docker Compose 已配置：
- ✅ **代码挂载**：本地代码直接挂载到容器 `/app`
- ✅ **依赖隔离**：node_modules 使用独立 volume
- ✅ **热重载**：NestJS watch 模式、Vite HMR

**这意味着**：修改代码保存后，1-3秒内自动生效，**无需重新构建镜像**！

---

## 🚀 快速开始（3种模式）

### 推荐方式 1：本地开发（最快）

```bash
# 1. 启动基础设施（PostgreSQL + Redis + MinIO）
./dev-local.sh

# 2. 本地运行你要开发的服务
cd backend/user-service
pnpm install
pnpm run dev

# 修改代码 → 保存 → < 1秒生效 ⚡
```

**为什么最快**：
- 不经过 Docker 网络层
- 直接访问文件系统
- 热重载最快
- 可以直接用 IDE 调试

### 方式 2：Docker 热重载（推荐用于测试）

```bash
# 启动服务（已配置热重载）
./dev-service.sh user-service

# 或手动启动
docker compose -f docker-compose.dev.yml up -d user-service

# 修改代码 → 保存 → 1-3秒自动重载 ✨
# 查看重载日志
docker logs -f cloudphone-user-service
```

**工作原理**：
```
本地修改代码
    ↓
Docker volume 自动同步
    ↓
NestJS 检测文件变化
    ↓
自动重新编译
    ↓
自动重启服务（1-3秒）
```

### 方式 3：完整 Docker 环境

```bash
./dev-full.sh

# 所有服务都支持热重载
# 修改任何代码都会自动生效
```

---

## 📝 实战示例

### 示例 1：修改 User Service

```bash
# 1. 启动服务
./dev-service.sh user-service

# 2. 修改代码
vim backend/user-service/src/users/users.service.ts

# 3. 保存 → 自动看到日志
# [webpack] Compiling...
# [webpack] Compiled successfully
# [Nest] Mapped {/users, GET} route

# 4. 测试
curl http://localhost:30001/users
```

### 示例 2：开发前端

```bash
# 1. 启动前端
./dev-service.sh admin-frontend

# 2. 浏览器访问
open http://localhost:5173

# 3. 修改代码
vim frontend/admin/src/App.tsx

# 4. 保存 → 浏览器自动刷新（< 1秒）
```

---

## 🔧 验证热重载是否工作

```bash
./test-hot-reload.sh
```

**预期输出**：
```
✅ user-service 正在运行
✅ 代码已正确挂载到容器
✅ NestJS watch 模式已启用
✅ 文件变化已同步到容器
```

---

## 💡 关键配置解释

### docker-compose.dev.yml

```yaml
services:
  user-service:
    volumes:
      - ./backend/user-service:/app    # 代码实时同步
      - user_service_node_modules:/app/node_modules  # 依赖隔离
    command: pnpm run dev  # = nest start --watch
```

**为什么这样配置**：
1. `./backend/user-service:/app`：本地代码映射到容器
2. `node_modules volume`：避免本地和容器 node_modules 冲突
3. `pnpm run dev`：启动 watch 模式

---

## 🐛 故障排查

### 问题：修改代码不生效

**排查步骤**：

```bash
# 1. 检查服务是否运行
docker ps | grep user-service

# 2. 检查文件是否同步
docker exec cloudphone-user-service ls -la /app/src/

# 3. 检查是否 watch 模式
docker exec cloudphone-user-service ps aux | grep watch

# 4. 查看日志
docker logs -f cloudphone-user-service
```

**解决方案**：

```bash
# 方案 1：重启服务
docker compose restart user-service

# 方案 2：重建服务
docker compose up -d --force-recreate user-service

# 方案 3：清理重建
docker compose down
docker volume prune
docker compose up -d --build
```

### 问题：依赖安装后不生效

```bash
# 删除 volume 并重建
docker compose down
docker volume rm next-cloudphone_user_service_node_modules
docker compose up -d --build user-service
```

---

## 📊 性能对比

| 开发方式 | 首次启动 | 代码修改后 | 调试 | 推荐度 |
|---------|---------|-----------|------|-------|
| **本地开发** | 10秒 | < 1秒 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Docker 热重载** | 30秒 | 1-3秒 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 重新构建镜像 | 2-5分钟 | 2-5分钟 | ⭐⭐ | ❌ 不推荐 |

---

## 🎯 最佳实践

### 日常开发

```bash
# 推荐工作流
1. ./dev-local.sh                    # 启动基础设施
2. cd backend/user-service           # 进入服务目录
3. pnpm run dev                      # 本地运行
4. 编辑代码 → 保存 → 自动生效        # 开发
```

### 集成测试

```bash
# 使用 Docker 环境
./dev-full.sh
# 所有服务都在运行，互相可以访问
# 代码修改仍然自动热重载
```

### 调试

```bash
# 方式 1：VSCode 本地调试（最佳）
pnpm run start:debug
# 然后在 VSCode 中 F5

# 方式 2：Docker 日志
docker logs -f cloudphone-user-service

# 方式 3：进入容器
docker exec -it cloudphone-user-service sh
```

---

## 📚 相关文档

- [QUICK_START.md](./QUICK_START.md) - 快速开始
- [DEV_GUIDE.md](./DEV_GUIDE.md) - 完整开发指南
- [DOCKER_DEPLOYMENT.md](./docs/DOCKER_DEPLOYMENT.md) - Docker 部署

---

## 🆘 需要帮助？

运行测试脚本：
```bash
./test-hot-reload.sh
```

查看快速参考：
```bash
cat QUICK_START.md
```

查看所有开发脚本：
```bash
ls -la dev-*.sh
```

---

## 🎉 总结

**关键点**：
1. ✅ 您的环境已支持热重载
2. ✅ 修改代码无需重新打包
3. ✅ 使用 `./dev-local.sh` 最快
4. ✅ 使用 `./dev-service.sh` 更方便
5. ✅ Docker 和本地开发都支持

**记住**：
- 保存代码后等 1-3 秒
- 查看日志确认重新编译
- 如果不生效就 restart
- 本地开发最快最方便

祝开发愉快！🚀
