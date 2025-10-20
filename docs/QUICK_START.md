# 快速开始指南

本文档将帮助你在本地快速搭建云手机平台的开发环境。

## 前置要求

确保你的开发环境已安装以下软件：

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Python**: >= 3.9
- **Go**: >= 1.21
- **Docker**: >= 20.10
- **Docker Compose**: >= 2.0

验证安装：

```bash
node --version
npm --version
python3 --version
go version
docker --version
docker-compose --version
```

## 第一步：克隆项目

```bash
git clone https://github.com/your-org/next-cloudphone.git
cd next-cloudphone
```

## 第二步：启动基础设施

使用 Docker Compose 启动 PostgreSQL、Redis、RabbitMQ、MinIO：

```bash
docker-compose up -d
```

验证服务状态：

```bash
docker-compose ps
```

访问管理界面：
- **RabbitMQ**: http://localhost:15672 (用户名/密码: admin/admin)
- **MinIO Console**: http://localhost:9001 (用户名/密码: minioadmin/minioadmin)

## 第三步：初始化数据库

连接到 PostgreSQL 并创建数据库：

```bash
docker exec -it cloudphone-postgres psql -U postgres

# 在 psql 中执行
CREATE DATABASE cloudphone;
\q
```

## 第四步：启动后端服务

### 4.1 API 网关

```bash
cd backend/api-gateway

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问健康检查: http://localhost:3000/api/health

### 4.2 流媒体服务 (Go)

**安装 Go 依赖:**

```bash
cd backend/media-service

# 下载依赖
go mod download

# 或手动安装
go get github.com/gin-gonic/gin
```

**启动服务:**

```bash
go run main.go
```

访问: http://localhost:3003/health

### 4.3 调度服务 (Python)

**创建并激活虚拟环境:**

```bash
cd backend/scheduler-service

# 激活虚拟环境
source venv/bin/activate  # Linux/Mac
# 或 Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
```

**启动服务:**

```bash
python main.py
```

访问: http://localhost:3004/health

## 第五步：启动前端

### 5.1 管理后台

```bash
cd frontend/admin

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问: http://localhost:3001

### 5.2 用户端

```bash
cd frontend/user

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问: http://localhost:3002

## 验证部署

### 检查所有服务

打开浏览器，依次访问以下地址确认服务正常：

| 服务 | 地址 | 说明 |
|------|------|------|
| API网关 | http://localhost:3000/api/health | 返回 {"status":"ok"} |
| 流媒体服务 | http://localhost:3003/health | 返回 {"status":"ok"} |
| 调度服务 | http://localhost:3004/health | 返回 {"status":"ok"} |
| 管理后台 | http://localhost:3001 | 显示登录页面 |
| 用户端 | http://localhost:3002 | 显示应用首页 |

### 测试用户注册和登录

**注册新用户:**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

**登录获取 Token:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

保存返回的 `token`，后续请求需要使用。

**获取用户信息:**

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 常见问题

### Q1: 数据库连接失败

**错误信息:** `ECONNREFUSED` 或 `connection refused`

**解决方案:**
```bash
# 检查 PostgreSQL 是否运行
docker-compose ps postgres

# 查看日志
docker-compose logs postgres

# 重启服务
docker-compose restart postgres
```

### Q2: 端口冲突

**错误信息:** `Port 3000 is already in use`

**解决方案:**
```bash
# 查找占用端口的进程
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# 杀死进程或修改 .env 文件中的端口号
```

### Q3: npm install 失败

**错误信息:** `EACCES` 或 `permission denied`

**解决方案:**
```bash
# 清除 npm 缓存
npm cache clean --force

# 删除 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### Q4: Python 虚拟环境问题

**错误信息:** `venv not found`

**解决方案:**
```bash
cd backend/scheduler-service

# 重新创建虚拟环境
python3 -m venv venv

# 激活并安装依赖
source venv/bin/activate
pip install -r requirements.txt
```

### Q5: Go 依赖下载慢

**解决方案:**
```bash
# 设置 Go 代理 (中国大陆)
go env -w GOPROXY=https://goproxy.cn,direct

# 重新下载
go mod download
```

## 下一步

现在你已经成功启动了云手机平台的开发环境！接下来可以：

1. 📖 阅读 [架构设计文档](./ARCHITECTURE.md) 了解系统架构
2. 🔧 查看 [API 文档](./API.md) 了解接口规范
3. 💻 开始开发你的第一个功能
4. 🧪 编写单元测试和集成测试

## 开发工作流

### 1. 创建功能分支

```bash
git checkout -b feature/your-feature-name
```

### 2. 开发并测试

修改代码后，确保：
- 代码符合 ESLint/Prettier 规范
- 通过单元测试
- 更新相关文档

### 3. 提交代码

```bash
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

### 4. 创建 Pull Request

在 GitHub/GitLab 上创建 PR，等待 Code Review。

## 停止服务

### 停止前端和后端

在各个服务的终端按 `Ctrl + C` 停止。

### 停止 Docker 服务

```bash
# 停止但保留数据
docker-compose stop

# 停止并删除容器（数据保留在 volume 中）
docker-compose down

# 停止并删除所有数据
docker-compose down -v
```

## 获取帮助

- 📚 查看文档: `docs/` 目录
- 🐛 报告问题: [GitHub Issues](https://github.com/your-org/next-cloudphone/issues)
- 💬 技术讨论: [Discussions](https://github.com/your-org/next-cloudphone/discussions)

---

祝你开发愉快！
