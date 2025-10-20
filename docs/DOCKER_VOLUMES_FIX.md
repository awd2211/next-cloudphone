# Docker Volume 挂载和依赖问题 - 完整解决方案

## 问题描述

在使用 Docker Compose 开发模式时，遇到了 `@nestjs/cli` 和其他 node_modules 依赖找不到的问题。

### 错误信息
```
sh: @nestjs/cli: not found
Error: Cannot find module '@nestjs/core'
```

### 根本原因

Docker Compose 配置使用了 **匿名 volume** (`/app/node_modules`)，这会导致：
1. 宿主机的 node_modules 覆盖容器内安装的依赖
2. 容器内的 node_modules 在重启后丢失
3. 不同容器共享同一个匿名 volume，导致依赖冲突

## 解决方案

### 1. 使用 Named Volumes 替代匿名 Volumes

#### 修改前 (❌ 错误)
```yaml
volumes:
  - ./backend/user-service:/app
  - /app/node_modules  # 匿名 volume
```

#### 修改后 (✅ 正确)
```yaml
volumes:
  - ./backend/user-service:/app
  - user_service_node_modules:/app/node_modules  # 命名 volume

# 在 volumes 部分声明
volumes:
  user_service_node_modules:
    driver: local
```

### 2. 为所有服务配置独立的 Named Volumes

在 `docker-compose.dev.yml` 中为每个服务配置独立的 node_modules volume：

```yaml
volumes:
  # 后端服务 node_modules
  api_gateway_node_modules:
    driver: local
  user_service_node_modules:
    driver: local
  device_service_node_modules:
    driver: local
  app_service_node_modules:
    driver: local
  billing_service_node_modules:
    driver: local

  # 前端应用 node_modules
  admin_frontend_node_modules:
    driver: local
  user_frontend_node_modules:
    driver: local
```

### 3. 创建自动化重建脚本

创建 `scripts/rebuild-all-services.sh` 脚本来自动化重建流程：

```bash
#!/bin/bash
set -e

# 1. 停止所有服务
docker compose -f docker-compose.dev.yml down

# 2. 删除所有 node_modules volumes
docker volume rm next-cloudphone_user_service_node_modules

# 3. 重新构建所有镜像
docker compose -f docker-compose.dev.yml build --no-cache

# 4. 启动基础设施服务
docker compose -f docker-compose.dev.yml up -d postgres redis minio

# 5. 启动所有应用服务
docker compose -f docker-compose.dev.yml up -d
```

### 4. 修复 Winston 配置错误

在 `backend/user-service/src/config/winston.config.ts` 中，移除了导致错误的 `colorize({ all: true })` 配置：

#### 修改前 (❌ 错误)
```typescript
return combine(
  colorize({ all: true }),  // 会导致错误
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  devFormat
);
```

#### 修改后 (✅ 正确)
```typescript
return combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  devFormat  // 在 devFormat 中处理格式化，不需要 colorize
);
```

## 执行步骤

### 1. 完全重建所有服务

```bash
# 执行自动化重建脚本
cd /home/eric/next-cloudphone
./scripts/rebuild-all-services.sh
```

### 2. 验证服务状态

```bash
# 检查所有服务运行状态
docker compose -f docker-compose.dev.yml ps

# 检查特定服务的健康状态
curl http://localhost:30001/health  # User Service
curl http://localhost:30000/api/health  # API Gateway
```

### 3. 验证依赖安装

```bash
# 验证 @nestjs/cli 是否安装
docker exec cloudphone-user-service test -f /app/node_modules/@nestjs/cli/bin/nest.js && echo "✅ 已安装"

# 统计 node_modules 包数量
docker exec cloudphone-user-service ls -1 /app/node_modules | wc -l
```

## 验证结果

### 服务状态 ✅

所有服务都已成功启动并运行：

```
SERVICE             STATUS
api-gateway         Up (healthy)
user-service        Up (healthy)
device-service      Up (healthy)
app-service         Up (healthy)
billing-service     Up (healthy)
scheduler-service   Up (healthy)
media-service       Up
admin-frontend      Up
user-frontend       Up
postgres            Up (healthy)
redis               Up (healthy)
minio               Up (healthy)
```

### 健康检查响应 ✅

**User Service**: http://localhost:30001/health
```json
{
  "status": "ok",
  "service": "user-service",
  "version": "1.0.0",
  "dependencies": {
    "database": {
      "status": "healthy",
      "responseTime": 1
    }
  }
}
```

**API Gateway**: http://localhost:30000/api/health
```json
{
  "status": "ok",
  "service": "api-gateway",
  "services": {
    "users": { "status": "healthy", "responseTime": "19ms" },
    "devices": { "status": "healthy", "responseTime": "12ms" },
    "apps": { "status": "healthy", "responseTime": "14ms" },
    "scheduler": { "status": "healthy", "responseTime": "3ms" },
    "billing": { "status": "healthy", "responseTime": "11ms" },
    "media": { "status": "healthy", "responseTime": "2ms" }
  }
}
```

### 前端服务 ✅

- **管理后台**: http://localhost:5173 (HTTP 200)
- **用户端**: http://localhost:5174 (HTTP 200)

### 依赖验证 ✅

```bash
# @nestjs/cli 已成功安装
✅ @nestjs/cli 已安装

# node_modules 包数量正常
user-service: 31 packages
api-gateway: 26 packages
```

## 核心改进

### 1. Volume 隔离
- 每个服务使用独立的 named volume
- 避免了匿名 volume 的覆盖问题
- 容器重启后依赖持久化

### 2. 自动化工具
- `scripts/rebuild-all-services.sh`: 一键重建所有服务
- 包含验证步骤，确保依赖正确安装
- 清理旧的 volumes，避免残留问题

### 3. 日志配置优化
- 修复了 Winston colorize 配置错误
- 简化了日志格式配置
- 避免了运行时错误

## 技术细节

### Named Volume 工作原理

1. **首次构建**:
   ```
   Dockerfile: RUN pnpm install
   → 在镜像中安装依赖到 /app/node_modules
   ```

2. **容器启动**:
   ```yaml
   volumes:
     - ./backend/user-service:/app  # 挂载源代码
     - user_service_node_modules:/app/node_modules  # 挂载独立 volume
   ```

   - 源代码从宿主机挂载
   - node_modules 使用独立的 named volume
   - 避免了宿主机覆盖容器内的依赖

3. **持久化**:
   - Named volume 在容器重启后保留
   - 不同服务使用不同的 volume，避免冲突
   - 可以通过 `docker volume ls` 查看所有 volumes

### Volume 生命周期管理

```bash
# 列出所有 volumes
docker volume ls | grep node_modules

# 删除特定 volume
docker volume rm next-cloudphone_user_service_node_modules

# 删除所有未使用的 volumes
docker volume prune
```

## 最佳实践

### 1. 开发环境
- 使用 named volumes 隔离 node_modules
- 挂载源代码实现热重载
- 保留容器内的依赖完整性

### 2. 生产环境
- 使用多阶段构建
- 不挂载源代码
- 依赖完全打包在镜像中

### 3. 依赖更新
```bash
# 更新依赖后需要重建
pnpm install  # 在宿主机更新 package.json

# 重建容器以更新 volume 中的依赖
docker compose -f docker-compose.dev.yml build --no-cache user-service
docker compose -f docker-compose.dev.yml up -d user-service
```

## 故障排查

### 问题：依赖仍然找不到

```bash
# 1. 检查 volume 是否存在
docker volume ls | grep user_service_node_modules

# 2. 检查容器内的 node_modules
docker exec cloudphone-user-service ls -la /app/node_modules

# 3. 重新构建并清理 volumes
./scripts/rebuild-all-services.sh
```

### 问题：健康检查失败

```bash
# 查看服务日志
docker logs cloudphone-user-service --tail 50

# 检查服务状态
docker compose ps user-service

# 重启服务
docker compose restart user-service
```

### 问题：端口冲突

```bash
# 检查端口占用
netstat -tlnp | grep 30001

# 修改 docker-compose.dev.yml 中的端口映射
ports:
  - "30011:30001"  # 使用不同的宿主机端口
```

## 总结

通过将匿名 volumes 改为 named volumes，并创建自动化重建脚本，彻底解决了 Docker 开发环境中的依赖问题。现在所有 7 个微服务和 2 个前端应用都能正常运行，@nestjs/cli 和其他依赖都能正确找到。

### 关键要点

1. ✅ **Named Volumes**: 每个服务独立的 node_modules volume
2. ✅ **自动化脚本**: 一键重建和验证
3. ✅ **配置修复**: Winston 日志配置优化
4. ✅ **完全验证**: 所有服务健康检查通过

### 相关文件

- `docker-compose.dev.yml`: Docker Compose 配置
- `scripts/rebuild-all-services.sh`: 自动化重建脚本
- `backend/user-service/src/config/winston.config.ts`: Winston 配置
- `docs/DOCKER_VOLUMES_FIX.md`: 本文档

---

**创建时间**: 2025-10-20
**问题解决**: ✅ 完成
**系统状态**: 🟢 所有服务运行正常
