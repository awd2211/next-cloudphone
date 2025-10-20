# Docker 本地开发环境

使用 Docker Compose 快速启动完整的本地开发环境。

## 前置要求

### 必需软件

1. **Docker Desktop** (推荐) 或 Docker Engine
   - macOS / Windows: [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - Linux: [Docker Engine](https://docs.docker.com/engine/install/)
   - 最低版本: 20.10+

2. **Docker Compose**
   - Docker Desktop 已内置
   - Linux 需单独安装: `sudo apt install docker-compose-plugin`
   - 最低版本: 2.0+

3. **Node.js & pnpm**（用于数据库初始化）
   - Node.js 18+
   - pnpm: `npm install -g pnpm`

### 系统要求

- **CPU**: 4 核心以上
- **内存**: 8GB 以上（推荐 16GB）
- **硬盘**: 20GB 可用空间
- **网络**: 需要访问 Docker Hub 和 npm registry

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/awd2211/next-cloudphone.git
cd next-cloudphone
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 根据需要修改配置
vi .env
```

### 3. 启动开发环境

```bash
# 给启动脚本执行权限
chmod +x start-dev.sh stop-dev.sh

# 启动所有服务
./start-dev.sh
```

脚本会引导你完成：
- 选择启动模式（快速启动/完全重建/仅基础设施）
- 自动等待数据库就绪
- 询问是否初始化数据库

### 4. 访问服务

启动成功后，可以访问：

| 服务 | 地址 | 说明 |
|------|------|------|
| API 网关 | http://localhost:30000 | 统一入口 |
| 管理后台 | http://localhost:5173 | React 前端 |
| 用户端 | http://localhost:5174 | React 前端 |
| MinIO Console | http://localhost:9001 | 对象存储管理 |
| PostgreSQL | localhost:5432 | 数据库 |
| Redis | localhost:6379 | 缓存 |

### 5. 停止服务

```bash
./stop-dev.sh
```

选项：
- 停止容器（保留数据）
- 删除容器（保留数据卷）
- 完全清理（删除所有数据）

## 服务架构

```
┌─────────────────────────────────────────┐
│          Nginx / API Gateway            │
│            localhost:30000              │
└────────┬──────────────────────┬─────────┘
         │                      │
    ┌────▼─────┐          ┌────▼─────┐
    │ Frontend │          │ Backend  │
    │  React   │          │Services  │
    │5173/5174 │          │30001-30006│
    └──────────┘          └────┬─────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
    ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
    │PostgreSQL│         │  Redis  │          │  MinIO  │
    │   5432   │         │  6379   │          │9000/9001│
    └──────────┘         └─────────┘          └─────────┘
```

## 包含的服务

### 基础设施

1. **PostgreSQL 14**
   - 主数据库
   - 端口: 5432
   - 用户: postgres/postgres
   - 数据卷: postgres_data

2. **Redis 7**
   - 缓存和会话存储
   - 端口: 6379
   - 数据卷: redis_data

3. **MinIO**
   - 对象存储（兼容 S3）
   - API: 9000
   - Console: 9001
   - 凭证: minioadmin/minioadmin
   - 数据卷: minio_data

### 后端微服务

1. **API Gateway** (NestJS) - 端口 30000
   - 统一入口和路由
   - JWT 认证
   - 请求限流
   - 健康检查

2. **User Service** (NestJS) - 端口 30001
   - 用户管理
   - 角色权限
   - 认证授权

3. **Device Service** (NestJS) - 端口 30002
   - 云手机设备管理
   - Docker 容器管理
   - Redroid 集成

4. **App Service** (NestJS) - 端口 30003
   - APK 应用管理
   - MinIO 集成
   - 应用安装/卸载

5. **Scheduler Service** (Python) - 端口 30004
   - 设备调度
   - 负载均衡
   - 自动扩缩容

6. **Billing Service** (NestJS) - 端口 30005
   - 订单管理
   - 套餐管理
   - 使用记录

7. **Media Service** (Go) - 端口 30006
   - WebRTC 流媒体
   - 视频传输
   - 远程控制

### 前端应用

1. **Admin Frontend** (React) - 端口 5173
   - 管理后台
   - Ant Design Pro

2. **User Frontend** (React) - 端口 5174
   - 用户端
   - Ant Design

## 常用命令

### Docker Compose 命令

```bash
# 查看所有容器状态
docker-compose -f docker-compose.dev.yml ps

# 查看服务日志
docker-compose -f docker-compose.dev.yml logs -f [服务名]

# 查看特定服务日志
docker-compose -f docker-compose.dev.yml logs -f api-gateway

# 重启单个服务
docker-compose -f docker-compose.dev.yml restart user-service

# 进入容器
docker-compose -f docker-compose.dev.yml exec api-gateway sh

# 查看资源使用
docker stats
```

### 数据库管理

```bash
# 连接 PostgreSQL
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d cloudphone

# 连接 Redis
docker-compose -f docker-compose.dev.yml exec redis redis-cli

# 初始化数据库
cd database && pnpm run init

# 重置数据库
cd database && pnpm run reset
```

### 服务调试

```bash
# 单独启动基础设施
docker-compose -f docker-compose.dev.yml up -d postgres redis minio

# 本地启动某个服务（例如 API Gateway）
cd backend/api-gateway
pnpm install
pnpm run dev

# 重新构建单个服务
docker-compose -f docker-compose.dev.yml up -d --build api-gateway
```

## 开发模式特性

### 热重载

所有服务都配置了热重载：

- **NestJS 服务**: 使用 `pnpm run dev` (nodemon)
- **Go 服务**: 代码挂载，修改后需手动重启
- **Python 服务**: FastAPI 自动重载
- **React 前端**: Vite HMR

### 代码挂载

本地代码直接挂载到容器：

```yaml
volumes:
  - ./backend/api-gateway:/app
  - /app/node_modules  # 防止本地 node_modules 覆盖
```

修改代码后自动生效，无需重新构建。

### 数据持久化

数据存储在 Docker volumes 中：

```bash
# 查看数据卷
docker volume ls | grep cloudphone

# 删除所有数据
docker-compose -f docker-compose.dev.yml down -v
```

## 故障排查

### 端口冲突

如果端口被占用：

```bash
# 查看端口占用
lsof -i :3000

# 修改端口（编辑 docker-compose.dev.yml）
ports:
  - "3001:3000"  # 改为 3001
```

### 内存不足

Docker Desktop 内存限制：

1. 打开 Docker Desktop
2. Settings → Resources → Memory
3. 调整为 8GB 或更高

### 容器启动失败

```bash
# 查看详细日志
docker-compose -f docker-compose.dev.yml logs [服务名]

# 重新构建
docker-compose -f docker-compose.dev.yml up -d --build --force-recreate

# 清理并重启
docker-compose -f docker-compose.dev.yml down
docker system prune -a
./start-dev.sh
```

### 数据库连接失败

```bash
# 检查数据库是否就绪
docker-compose -f docker-compose.dev.yml exec postgres pg_isready

# 手动创建数据库
docker-compose -f docker-compose.dev.yml exec postgres createdb -U postgres cloudphone

# 重新初始化
cd database && pnpm run reset
```

## 生产环境部署

开发环境配置**不适合**生产环境。生产环境请使用：

- `docker-compose.prod.yml` - 生产环境配置
- Kubernetes + Helm - 推荐用于大规模部署
- 参考 `infrastructure/k8s/` 目录

## 性能优化建议

### 开发环境

1. 使用 SSD 硬盘
2. 分配足够的 CPU 和内存给 Docker
3. 仅启动需要的服务
4. 使用 `./start-dev.sh` 选项 3（仅基础设施）

### Docker 配置

```json
// Docker Desktop Settings
{
  "cpus": 4,
  "memory": 8192,
  "swap": 2048,
  "disk": 61035
}
```

## 默认账号信息

### 管理员账号

```
用户名: admin
邮箱: admin@cloudphone.com
密码: admin123456
```

### 测试账号

```
用户名: testuser
邮箱: test@cloudphone.com
密码: test123456
```

### MinIO 控制台

```
访问: http://localhost:9001
用户名: minioadmin
密码: minioadmin
```

## 下一步

- [数据库初始化](database/README.md)
- [API 文档](docs/API.md)
- [前端开发](frontend/README.md)
- [部署指南](docs/DEPLOYMENT.md)

## 获取帮助

- GitHub Issues: https://github.com/awd2211/next-cloudphone/issues
- 查看日志: `docker-compose -f docker-compose.dev.yml logs`
