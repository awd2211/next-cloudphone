# 云手机平台 - 开发指南

## 🎯 快速开始

### 方案一：Docker 开发环境（推荐用于全栈测试）

**优点**：完整环境，所有服务一起运行
**缺点**：首次启动慢，资源占用大

```bash
# 1. 启动所有服务
docker compose -f docker-compose.dev.yml up -d

# 2. 查看日志（实时）
docker compose -f docker-compose.dev.yml logs -f [service-name]

# 3. 修改代码后 - 无需重启！
# NestJS 和 Vite 会自动热重载
# 修改代码保存后，在日志中可以看到自动重新编译

# 4. 仅重启单个服务（如果热重载失败）
docker compose -f docker-compose.dev.yml restart user-service
```

### 方案二：本地开发 + Docker 基础设施（推荐用于单服务开发）

**优点**：启动快，调试方便，热重载最快
**缺点**：需要本地安装 Node.js、pnpm 等

```bash
# 1. 仅启动基础设施（数据库、Redis、MinIO）
docker compose -f docker-compose.dev.yml up -d postgres redis minio

# 2. 本地运行你要开发的服务
cd backend/user-service
pnpm install
pnpm run dev

# 3. 本地运行前端
cd frontend/admin
pnpm install
pnpm run dev
```

---

## 🔧 开发环境配置检查

### 当前配置状态

✅ **代码挂载**：已配置
```yaml
volumes:
  - ./backend/user-service:/app  # 代码实时同步
  - user_service_node_modules:/app/node_modules  # 依赖隔离
```

✅ **热重载命令**：已配置
- NestJS: `nest start --watch`
- Vite: `vite`
- Python: FastAPI 自动重载
- Go: 需要安装 air（见下方）

---

## 🚀 优化热重载

### 1. NestJS 服务（已配置）

**当前状态**：✅ 已启用 `--watch` 模式

**工作原理**：
- 修改 `.ts` 文件保存后
- NestJS 自动检测变化
- 自动重新编译
- 自动重启服务（通常 1-3 秒）

**查看热重载日志**：
```bash
docker logs -f cloudphone-user-service
# 保存代码后会看到：
# [webpack] Compiling...
# [webpack] Compiled successfully
```

**如果热重载不工作**：
```bash
# 检查是否使用了 --watch
docker exec cloudphone-user-service ps aux | grep nest

# 重启服务
docker compose -f docker-compose.dev.yml restart user-service
```

### 2. Vite 前端（已配置）

**当前状态**：✅ HMR（热模块替换）已启用

**工作原理**：
- 修改代码保存
- Vite 立即更新（< 1 秒）
- 浏览器自动刷新

**访问地址**：
- 管理后台：http://localhost:5173
- 用户端：http://localhost:5174

### 3. Go 服务（media-service）- 需要优化

**当前状态**：❌ 使用 `go run`，每次都重新编译

**优化方案 - 使用 Air**：

1. 修改 `backend/media-service/Dockerfile`：
```dockerfile
# 开发环境
FROM golang:1.21-alpine AS development

WORKDIR /app

# 安装 Air（热重载工具）
RUN go install github.com/cosmtrek/air@latest

RUN apk add --no-cache wget

COPY go.mod go.sum ./
RUN go mod download

COPY . .

EXPOSE 30007
EXPOSE 50000-50100/udp

# 使用 Air 启动
CMD ["air", "-c", ".air.toml"]
```

2. 创建 `backend/media-service/.air.toml`：
```toml
root = "."
tmp_dir = "tmp"

[build]
  cmd = "go build -o ./tmp/main ."
  bin = "tmp/main"
  include_ext = ["go", "tpl", "tmpl", "html"]
  exclude_dir = ["tmp", "vendor"]
  delay = 1000
```

3. 修改 docker-compose.dev.yml：
```yaml
media-service:
  # ... 其他配置
  command: air -c .air.toml  # 替换 go run main.go
```

### 4. Python 服务（scheduler-service）

**当前状态**：✅ FastAPI 已支持自动重载

**验证**：
```bash
docker logs cloudphone-scheduler-service | grep reload
# 应该看到：INFO: Will watch for changes in these directories
```

---

## 📝 推荐工作流

### 场景 1：开发单个后端服务

```bash
# 1. 启动基础设施 + 你的服务
docker compose -f docker-compose.dev.yml up -d postgres redis minio user-service

# 2. 查看实时日志
docker logs -f cloudphone-user-service

# 3. 修改代码
# 编辑 backend/user-service/src/xxx.ts
# 保存 → 自动重新编译 → 自动重启（1-3秒）

# 4. 测试 API
curl http://localhost:30001/health
```

### 场景 2：开发前端

```bash
# 1. 启动后端服务
docker compose -f docker-compose.dev.yml up -d

# 2. 访问前端（Vite 热重载）
# http://localhost:5173
# 修改代码 → 自动刷新浏览器（< 1秒）
```

### 场景 3：全栈开发（推荐本地运行）

```bash
# 终端 1 - 基础设施
docker compose -f docker-compose.dev.yml up postgres redis minio

# 终端 2 - 后端服务
cd backend/user-service && pnpm run dev

# 终端 3 - 前端
cd frontend/admin && pnpm run dev

# 浏览器访问 http://localhost:5173
```

---

## 🐛 调试技巧

### 1. VSCode 调试（本地运行时）

创建 `.vscode/launch.json`：
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug User Service",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["run", "start:debug"],
      "cwd": "${workspaceFolder}/backend/user-service",
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector",
      "port": 9229
    }
  ]
}
```

### 2. 查看容器内文件变化

```bash
# 进入容器
docker exec -it cloudphone-user-service sh

# 检查文件是否同步
ls -la /app/src/

# 检查 node_modules
ls -la /app/node_modules/@nestjs/
```

### 3. 性能监控

```bash
# 查看资源占用
docker stats

# 只看特定服务
docker stats cloudphone-user-service cloudphone-postgres
```

---

## 🎨 IDE 配置

### VSCode 推荐插件

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "ms-azuretools.vscode-docker",
    "bradlc.vscode-tailwindcss"
  ]
}
```

### 文件监听优化（Linux）

如果热重载不工作，可能是文件监听限制：

```bash
# 增加文件监听限制
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## 📊 性能对比

| 方案 | 首次启动 | 代码修改后 | 调试便利性 | 资源占用 |
|------|---------|-----------|-----------|---------|
| Docker 全栈 | 2-3 分钟 | 1-3 秒（热重载） | ⭐⭐⭐ | 高 (4-8GB) |
| 本地开发 + Docker | 30 秒 | < 1 秒 | ⭐⭐⭐⭐⭐ | 中 (2-4GB) |
| 完全本地 | 10 秒 | < 1 秒 | ⭐⭐⭐⭐⭐ | 低 (1-2GB) |

---

## ⚡ 快捷脚本

创建这些脚本在项目根目录：

### `dev-local.sh` - 本地开发
```bash
#!/bin/bash
# 启动基础设施
docker compose -f docker-compose.dev.yml up -d postgres redis minio

echo "✅ 基础设施已启动"
echo "📝 现在可以本地运行服务："
echo "   cd backend/user-service && pnpm run dev"
echo "   cd frontend/admin && pnpm run dev"
```

### `dev-service.sh` - 开发特定服务
```bash
#!/bin/bash
SERVICE=$1
if [ -z "$SERVICE" ]; then
  echo "用法: ./dev-service.sh user-service"
  exit 1
fi

docker compose -f docker-compose.dev.yml up -d postgres redis minio $SERVICE
docker logs -f cloudphone-$SERVICE
```

### `dev-full.sh` - 完整环境
```bash
#!/bin/bash
docker compose -f docker-compose.dev.yml up -d
echo "✅ 所有服务已启动"
docker compose -f docker-compose.dev.yml ps
```

---

## 🔍 常见问题

### Q: 修改代码后没有自动重载？

**A**: 检查以下几点：
1. 确认使用了 `--watch` 模式
2. 检查文件是否正确挂载：`docker exec cloudphone-user-service ls -la /app/src/`
3. 查看日志是否有错误：`docker logs cloudphone-user-service`
4. 重启服务：`docker compose restart user-service`

### Q: 编译太慢？

**A**:
- 使用本地开发而不是 Docker
- 减少同时运行的服务
- 使用 SSD 硬盘
- 增加 Docker 内存限制

### Q: 依赖安装后热重载失败？

**A**:
```bash
# 删除 node_modules volume 并重建
docker compose down
docker volume rm next-cloudphone_user_service_node_modules
docker compose up -d --build user-service
```

---

## 🎯 推荐配置

**日常开发（单服务）**：
- ✅ 使用本地开发
- ✅ 只启动必要的基础设施
- ✅ 使用 VSCode 调试

**集成测试**：
- ✅ 使用 Docker Compose 全栈
- ✅ 启用热重载
- ✅ 使用日志监控

**生产环境**：
- ✅ 完全 Docker 化
- ✅ 多阶段构建
- ✅ 健康检查
