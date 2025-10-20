# 开发环境设置指南

本文档详细说明如何设置云手机平台的本地开发环境。

## 目录

- [前置要求](#前置要求)
- [环境准备](#环境准备)
- [数据库设置](#数据库设置)
- [后端服务配置](#后端服务配置)
- [前端应用配置](#前端应用配置)
- [启动开发环境](#启动开发环境)
- [验证安装](#验证安装)
- [IDE 推荐配置](#ide-推荐配置)
- [常见问题](#常见问题)

## 前置要求

### 必需软件

确保以下软件已安装在您的开发机器上：

| 软件 | 版本要求 | 用途 | 安装验证 |
|------|---------|------|---------|
| Node.js | 18+ | 前端和部分后端服务 | `node -v` |
| pnpm | 8+ | Node.js 包管理器 | `pnpm -v` |
| Python | 3.9+ | 调度服务 | `python3 --version` |
| Go | 1.21+ | 流媒体服务 | `go version` |
| Docker | 20+ | 容器化和本地基础设施 | `docker --version` |
| Docker Compose | 2+ | 多容器应用编排 | `docker-compose --version` |
| Git | 2+ | 版本控制 | `git --version` |
| PostgreSQL Client | 14+ | 数据库交互 (可选) | `psql --version` |

### 系统要求

- **操作系统**: Linux, macOS, 或 Windows (WSL2)
- **内存**: 最低 8GB (推荐 16GB+)
- **磁盘空间**: 至少 20GB 可用空间
- **网络**: 稳定的互联网连接 (用于下载依赖)

## 环境准备

### 1. 克隆代码仓库

```bash
git clone https://github.com/awd2211/next-cloudphone.git
cd next-cloudphone
```

### 2. 安装 pnpm (如果尚未安装)

```bash
# 使用 npm 安装
npm install -g pnpm

# 或使用官方脚本
curl -fsSL https://get.pnpm.io/install.sh | sh -

# 验证安装
pnpm -v
```

### 3. 安装 Python 虚拟环境工具

```bash
# Linux/macOS
python3 -m pip install virtualenv

# 验证安装
python3 -m virtualenv --version
```

### 4. 安装 Go 依赖管理工具 (如果需要)

Go 1.11+ 内置了 Go Modules，无需额外安装。

## 数据库设置

### 方式一：使用 Docker Compose (推荐)

最简单的方式是使用 Docker Compose 启动所有基础设施服务：

```bash
# 启动基础设施 (PostgreSQL, Redis, RabbitMQ, MinIO)
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f postgres
```

服务访问信息：
- PostgreSQL: `localhost:5432` (用户名: postgres, 密码: postgres)
- Redis: `localhost:6379`
- RabbitMQ: `localhost:5672` (管理界面: http://localhost:15672)
- MinIO: `localhost:9000` (控制台: http://localhost:9001)

### 方式二：本地安装

如果您更倾向于本地安装数据库：

#### PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS (Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**创建数据库和用户:**
```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE cloudphone;
CREATE USER cloudphone_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE cloudphone TO cloudphone_user;
\q
```

#### Redis

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis-server
```

**macOS (Homebrew):**
```bash
brew install redis
brew services start redis
```

### 初始化数据库

运行初始化脚本创建表和初始数据：

```bash
# 方式一：使用脚本
chmod +x scripts/setup-database.sh
./scripts/setup-database.sh

# 方式二：手动执行 SQL
psql -h localhost -U postgres -d cloudphone -f scripts/init-database.sql
```

## 后端服务配置

### 1. 配置环境变量

为每个服务创建 `.env` 文件：

```bash
# 复制根目录环境变量模板
cp .env.example .env

# 编辑 .env 文件，填写实际配置
nano .env
```

重要配置项：
```bash
# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_secure_password  # 修改为安全密码

# JWT 密钥 (生产环境必须修改！)
JWT_SECRET=your_super_secret_key_change_this_in_production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 2. API 网关设置

```bash
cd backend/api-gateway

# 安装依赖
pnpm install

# 复制环境变量
cp .env.example .env

# 编辑配置 (如果需要)
nano .env

# 返回项目根目录
cd ../..
```

### 3. 用户服务设置

```bash
cd backend/user-service
pnpm install
cp .env.example .env
cd ../..
```

### 4. 设备服务设置

```bash
cd backend/device-service
pnpm install
cp .env.example .env
cd ../..
```

### 5. 应用服务设置

```bash
cd backend/app-service
pnpm install
cp .env.example .env
cd ../..
```

### 6. 计费服务设置

```bash
cd backend/billing-service
pnpm install
cp .env.example .env
cd ../..
```

### 7. 流媒体服务设置 (Go)

```bash
cd backend/media-service

# 下载 Go 依赖
go mod download

# 复制环境变量
cp .env.example .env

cd ../..
```

### 8. 调度服务设置 (Python)

```bash
cd backend/scheduler-service

# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
# Linux/macOS:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 复制环境变量
cp .env.example .env

# 停用虚拟环境 (暂时)
deactivate

cd ../..
```

## 前端应用配置

### 1. 管理后台设置

```bash
cd frontend/admin

# 安装依赖
pnpm install

# 复制环境变量
cp .env.example .env

# 编辑配置 (如果 API 网关不在 localhost:3000)
nano .env

cd ../..
```

### 2. 用户端设置

```bash
cd frontend/user

# 安装依赖
pnpm install

# 复制环境变量
cp .env.example .env

cd ../..
```

## 启动开发环境

### 方式一：使用一键启动脚本 (推荐)

```bash
# 添加执行权限
chmod +x scripts/start-all.sh

# 启动所有服务
./scripts/start-all.sh
```

脚本会按顺序启动：
1. Docker 基础设施服务
2. 所有后端微服务
3. 前端应用

### 方式二：手动启动各服务

#### 1. 启动基础设施

```bash
docker-compose up -d
```

#### 2. 启动后端服务

在不同的终端窗口中：

**API 网关 (端口 3000):**
```bash
cd backend/api-gateway
pnpm dev
```

**用户服务 (端口 3001):**
```bash
cd backend/user-service
pnpm dev
```

**设备服务 (端口 3002):**
```bash
cd backend/device-service
pnpm dev
```

**应用服务 (端口 3003):**
```bash
cd backend/app-service
pnpm dev
```

**流媒体服务 (端口 3004):**
```bash
cd backend/media-service
go run main.go
```

**调度服务 (端口 3005):**
```bash
cd backend/scheduler-service
source venv/bin/activate  # 激活虚拟环境
python main.py
```

**计费服务 (端口 3006):**
```bash
cd backend/billing-service
pnpm dev
```

#### 3. 启动前端应用

**管理后台 (端口 5173):**
```bash
cd frontend/admin
pnpm dev
```

**用户端 (端口 5174):**
```bash
cd frontend/user
pnpm dev
```

## 验证安装

### 1. 检查基础设施服务

```bash
# 检查所有容器状态
docker-compose ps

# 应该看到 postgres, redis, rabbitmq, minio 都处于 healthy 状态
```

### 2. 检查后端服务健康

运行健康检查脚本：

```bash
chmod +x scripts/check-health.sh
./scripts/check-health.sh
```

或手动检查每个服务：

```bash
# API 网关
curl http://localhost:3000/api/health

# 流媒体服务
curl http://localhost:3004/health

# 调度服务
curl http://localhost:3005/health
```

预期响应：`{"status":"ok"}` 或类似的健康状态信息。

### 3. 访问前端应用

- 管理后台: http://localhost:5173 (开发模式) 或 http://localhost:3001 (生产模式)
- 用户端: http://localhost:5174 (开发模式) 或 http://localhost:3002 (生产模式)

默认测试账号 (如果数据库已初始化)：
- 用户名: `admin`
- 密码: `admin123`

### 4. 访问管理界面

- **RabbitMQ 管理**: http://localhost:15672 (用户名: admin, 密码: admin)
- **MinIO 控制台**: http://localhost:9001 (用户名: minioadmin, 密码: minioadmin)

## IDE 推荐配置

### VS Code

推荐安装以下扩展：

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "golang.go",
    "ms-python.python",
    "ms-python.vscode-pylance",
    "ms-azuretools.vscode-docker",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "editorconfig.editorconfig"
  ]
}
```

工作区设置 (`.vscode/settings.json`)：

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.associations": {
    "*.env.example": "dotenv"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[python]": {
    "editor.defaultFormatter": "ms-python.python"
  },
  "[go]": {
    "editor.defaultFormatter": "golang.go"
  }
}
```

### JetBrains IDEs (WebStorm, GoLand, PyCharm)

1. 启用 Node.js 支持
2. 设置 TypeScript 版本为项目本地版本
3. 启用 ESLint 和 Prettier 集成
4. 配置 Docker 集成

## 常见问题

### 1. 端口冲突

**问题**: 启动服务时提示端口已被占用

**解决方案**:
```bash
# 查看端口占用 (Linux/macOS)
lsof -i :3000

# 查看端口占用 (Windows)
netstat -ano | findstr :3000

# 停止占用端口的进程或修改服务端口
```

修改 `.env` 文件中的端口配置：
```bash
API_GATEWAY_PORT=3100  # 修改为未占用的端口
```

### 2. 数据库连接失败

**问题**: 后端服务无法连接到数据库

**解决方案**:
```bash
# 检查 PostgreSQL 是否运行
docker-compose ps postgres

# 检查数据库连接
psql -h localhost -U postgres -d cloudphone

# 检查环境变量是否正确配置
cat backend/api-gateway/.env | grep DB_
```

### 3. pnpm 安装依赖失败

**问题**: `pnpm install` 失败或超时

**解决方案**:
```bash
# 清理 pnpm 缓存
pnpm store prune

# 使用国内镜像 (可选)
pnpm config set registry https://registry.npmmirror.com

# 重新安装
pnpm install
```

### 4. Go 模块下载慢

**问题**: `go mod download` 很慢或失败

**解决方案**:
```bash
# 设置 Go 代理 (国内)
go env -w GOPROXY=https://goproxy.cn,direct

# 重新下载
go mod download
```

### 5. Python 虚拟环境问题

**问题**: 无法创建或激活虚拟环境

**解决方案**:
```bash
# 确保 python3-venv 已安装 (Ubuntu/Debian)
sudo apt install python3-venv

# 重新创建虚拟环境
rm -rf venv
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate  # Linux/macOS
# 或
venv\Scripts\activate  # Windows
```

### 6. Docker 权限问题

**问题**: 执行 Docker 命令需要 sudo

**解决方案** (Linux):
```bash
# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 注销并重新登录，或执行
newgrp docker

# 验证
docker ps
```

### 7. 内存不足

**问题**: 启动多个服务后系统变慢

**解决方案**:
- 减少 Docker Desktop 的内存限制
- 只启动当前开发需要的服务
- 使用生产模式运行前端 (内存占用更少)

```bash
# 只启动基础设施
docker-compose up -d postgres redis

# 只启动必要的后端服务
cd backend/api-gateway && pnpm dev
```

### 8. 热重载不工作

**问题**: 修改代码后服务没有自动重启

**解决方案**:

**NestJS**:
```bash
# 确保使用 dev 命令而不是 start
pnpm dev
```

**Go**:
```bash
# 安装 air 用于热重载
go install github.com/cosmtrek/air@latest

# 使用 air 运行
air
```

**Python**:
```bash
# 使用 uvicorn 的重载功能
uvicorn main:app --reload --host 0.0.0.0 --port 3005
```

### 9. 前端代理错误

**问题**: 前端无法调用后端 API

**解决方案**:

检查 `vite.config.ts` 中的代理配置：
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
```

确保后端 API 网关已启动：
```bash
curl http://localhost:3000/api/health
```

### 10. TypeScript 编译错误

**问题**: 大量 TypeScript 类型错误

**解决方案**:
```bash
# 清理并重新安装依赖
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 清理 TypeScript 缓存
rm -rf dist tsconfig.tsbuildinfo

# 重新构建
pnpm build
```

## 下一步

环境设置完成后，您可以：

1. 阅读 [开发规范](./DEVELOPMENT_GUIDE.md) 了解编码标准
2. 查看 [API 文档](./API.md) 了解接口详情
3. 参考 [架构文档](./ARCHITECTURE.md) 理解系统设计
4. 开始开发新功能或修复 Bug

## 获取帮助

如果遇到本文档未涵盖的问题：

1. 查看项目 [GitHub Issues](https://github.com/awd2211/next-cloudphone/issues)
2. 搜索相关技术栈的官方文档
3. 提交新的 Issue 描述您的问题

祝开发愉快！ 🚀
