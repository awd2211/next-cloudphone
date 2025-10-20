# 环境变量配置指南

本文档详细说明了云手机平台所有服务的环境变量配置。

---

## 📋 目录

1. [快速开始](#快速开始)
2. [通用配置](#通用配置)
3. [后端服务配置](#后端服务配置)
4. [前端应用配置](#前端应用配置)
5. [配置验证](#配置验证)
6. [最佳实践](#最佳实践)
7. [故障排查](#故障排查)

---

## 🚀 快速开始

### 1. 复制示例文件

为每个服务创建 `.env` 文件：

```bash
# 后端服务
cd backend/api-gateway && cp .env.example .env
cd ../user-service && cp .env.example .env
cd ../device-service && cp .env.example .env
cd ../app-service && cp .env.example .env
cd ../billing-service && cp .env.example .env
cd ../scheduler-service && cp .env.example .env

# 前端应用
cd ../../frontend/admin && cp .env.example .env
cd ../user && cp .env.example .env
```

### 2. 修改关键配置

**必须修改的变量**:
- `JWT_SECRET`: 生产环境必须使用强密码 (64+ 字符)
- `DB_PASSWORD`: 数据库密码
- `REDIS_PASSWORD`: Redis 密码 (如果启用)
- 第三方服务密钥 (微信、支付宝、Stripe等)

### 3. 验证配置

```bash
# 使用 Shell 脚本验证
./scripts/validate-env.sh api-gateway

# 或使用 Node.js 工具验证
node scripts/check-env.js api-gateway
```

---

## 🔧 通用配置

### 运行环境

所有服务都需要这些基础配置：

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `NODE_ENV` | string | ✅ | development | 运行环境: development, production, test |
| `PORT` | number | ✅ | - | 服务监听端口 |
| `LOG_LEVEL` | string | ❌ | debug | 日志级别: debug, info, warn, error |
| `LOG_FORMAT` | string | ❌ | dev | 日志格式: dev, json |

### 数据库配置

PostgreSQL 连接配置 (适用于所有使用数据库的服务):

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `DB_HOST` | string | ✅ | localhost | 数据库主机地址 |
| `DB_PORT` | number | ✅ | 5432 | 数据库端口 |
| `DB_USERNAME` | string | ✅ | postgres | 数据库用户名 |
| `DB_PASSWORD` | string | ✅ | - | 数据库密码 |
| `DB_DATABASE` | string | ✅ | cloudphone | 数据库名称 |

### Redis 配置

缓存和会话存储配置:

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `REDIS_HOST` | string | ✅ | localhost | Redis 主机地址 |
| `REDIS_PORT` | number | ✅ | 6379 | Redis 端口 |
| `REDIS_PASSWORD` | string | ❌ | - | Redis 密码 |

### JWT 配置

认证令牌配置 (适用于所有需要认证的服务):

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `JWT_SECRET` | string | ✅ | - | JWT 签名密钥 (生产环境必须 64+ 字符) |
| `JWT_EXPIRES_IN` | string | ✅ | 24h | JWT 过期时间 (如: 1h, 24h, 7d) |

**安全要求**:
- 开发环境: 最少 32 字符
- 生产环境: 推荐 64+ 字符，包含大小写字母、数字、特殊字符
- 禁止使用默认值或包含 "dev", "test" 等字样

---

## 🔌 后端服务配置

### 1. API Gateway (端口 30000)

**特有配置**:

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `USER_SERVICE_URL` | string | ✅ | http://localhost:30001 | 用户服务地址 |
| `DEVICE_SERVICE_URL` | string | ✅ | http://localhost:30002 | 设备服务地址 |
| `APP_SERVICE_URL` | string | ✅ | http://localhost:30003 | 应用服务地址 |
| `SCHEDULER_SERVICE_URL` | string | ✅ | http://localhost:30004 | 调度服务地址 |
| `BILLING_SERVICE_URL` | string | ✅ | http://localhost:30005 | 计费服务地址 |
| `MEDIA_SERVICE_URL` | string | ✅ | http://localhost:30006 | 流媒体服务地址 |
| `CORS_ORIGIN` | string | ❌ | * | 允许的跨域来源 (逗号分隔) |
| `RATE_LIMIT_TTL` | number | ❌ | 60 | 限流时间窗口 (秒) |
| `RATE_LIMIT_MAX` | number | ❌ | 100 | 限流最大请求数 |

### 2. User Service (端口 30001)

**特有配置**:

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `PASSWORD_MIN_LENGTH` | number | ❌ | 6 | 密码最小长度 |
| `MAX_LOGIN_ATTEMPTS` | number | ❌ | 5 | 最大登录失败次数 |
| `ACCOUNT_LOCK_DURATION` | number | ❌ | 900 | 账户锁定时长 (秒) |
| `SESSION_TIMEOUT` | number | ❌ | 86400 | 会话超时时间 (秒) |
| `EMAIL_ENABLED` | boolean | ❌ | false | 是否启用邮件功能 |
| `EMAIL_HOST` | string | ❌ | - | SMTP 服务器地址 |
| `EMAIL_PORT` | number | ❌ | 587 | SMTP 端口 |
| `EMAIL_USER` | string | ❌ | - | SMTP 用户名 |
| `EMAIL_PASSWORD` | string | ❌ | - | SMTP 密码 |

### 3. Device Service (端口 30002)

**特有配置**:

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `DOCKER_HOST` | string | ✅ | unix:///var/run/docker.sock | Docker 守护进程地址 |
| `DOCKER_NETWORK` | string | ❌ | cloudphone_network | Docker 网络名称 |
| `REDROID_IMAGE` | string | ❌ | redroid/redroid:latest | Redroid 镜像名称 |
| `REDROID_BASE_PORT` | number | ❌ | 5555 | ADB 基础端口 |
| `DEFAULT_CPU_LIMIT` | number | ❌ | 2 | 默认 CPU 核心数 |
| `DEFAULT_MEMORY_LIMIT` | number | ❌ | 4096 | 默认内存限制 (MB) |
| `DEFAULT_STORAGE_LIMIT` | number | ❌ | 10240 | 默认存储限制 (MB) |
| `ADB_HOST` | string | ❌ | localhost | ADB 服务器地址 |
| `ADB_PORT` | number | ❌ | 5037 | ADB 服务器端口 |
| `ADB_TIMEOUT` | number | ❌ | 30000 | ADB 命令超时 (毫秒) |
| `DEVICE_HEALTH_CHECK_INTERVAL` | number | ❌ | 30 | 设备健康检查间隔 (秒) |
| `DEVICE_AUTO_RECOVERY` | boolean | ❌ | true | 是否自动恢复故障设备 |

### 4. App Service (端口 30003)

**特有配置**:

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `MINIO_ENDPOINT` | string | ✅ | localhost | MinIO 服务器地址 |
| `MINIO_PORT` | number | ✅ | 9000 | MinIO 端口 |
| `MINIO_ACCESS_KEY` | string | ✅ | minioadmin | MinIO 访问密钥 |
| `MINIO_SECRET_KEY` | string | ✅ | minioadmin | MinIO 私钥 |
| `MINIO_BUCKET` | string | ❌ | cloudphone-apps | MinIO 存储桶名称 |
| `MINIO_USE_SSL` | boolean | ❌ | false | 是否使用 SSL |
| `MAX_APK_SIZE` | number | ❌ | 209715200 | 最大 APK 文件大小 (字节) |
| `UPLOAD_TEMP_DIR` | string | ❌ | /tmp/apk-uploads | 上传临时目录 |
| `INSTALL_TIMEOUT` | number | ❌ | 120000 | 安装超时时间 (毫秒) |
| `MAX_CONCURRENT_INSTALLS` | number | ❌ | 10 | 最大并发安装数 |
| `ENABLE_VIRUS_SCAN` | boolean | ❌ | false | 是否启用病毒扫描 |

### 5. Billing Service (端口 30005)

**特有配置**:

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `BILLING_CURRENCY` | string | ❌ | CNY | 计费货币 |
| `BILLING_CYCLE` | string | ❌ | hourly | 计费周期: hourly, daily, monthly |
| `PRICE_PER_HOUR` | number | ❌ | 1.0 | 每小时价格 |
| `FREE_TRIAL_DURATION` | number | ❌ | 72 | 免费试用时长 (小时) |
| `FREE_TRIAL_CREDITS` | number | ❌ | 100 | 免费试用额度 |
| `ORDER_TIMEOUT` | number | ❌ | 1800 | 订单超时时间 (秒) |
| `ORDER_AUTO_CANCEL` | boolean | ❌ | true | 是否自动取消超时订单 |

**微信支付**:

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `WECHAT_PAY_ENABLED` | boolean | ❌ | false | 是否启用微信支付 |
| `WECHAT_APP_ID` | string | ❌ | - | 微信 AppID |
| `WECHAT_MCH_ID` | string | ❌ | - | 微信商户号 |
| `WECHAT_API_V3_KEY` | string | ❌ | - | 微信 APIv3 密钥 |
| `WECHAT_PRIVATE_KEY` | string | ❌ | - | 微信私钥 (PEM 格式) |

**支付宝**:

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `ALIPAY_ENABLED` | boolean | ❌ | false | 是否启用支付宝 |
| `ALIPAY_APP_ID` | string | ❌ | - | 支付宝 AppID |
| `ALIPAY_PRIVATE_KEY` | string | ❌ | - | 支付宝私钥 (PKCS8 格式) |
| `ALIPAY_PUBLIC_KEY` | string | ❌ | - | 支付宝公钥 |

**Stripe (国际支付)**:

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `STRIPE_ENABLED` | boolean | ❌ | false | 是否启用 Stripe |
| `STRIPE_PUBLIC_KEY` | string | ❌ | - | Stripe 公钥 |
| `STRIPE_SECRET_KEY` | string | ❌ | - | Stripe 私钥 |
| `STRIPE_WEBHOOK_SECRET` | string | ❌ | - | Stripe Webhook 密钥 |

### 6. Scheduler Service (端口 30004)

**Python/FastAPI 服务特有配置**:

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `ENVIRONMENT` | string | ✅ | development | 运行环境 |
| `SCHEDULING_STRATEGY` | string | ❌ | weighted_round_robin | 调度策略 |
| `ENABLE_AUTO_SCALING` | boolean | ❌ | true | 是否启用自动伸缩 |
| `MIN_INSTANCES` | number | ❌ | 1 | 最小实例数 |
| `MAX_INSTANCES` | number | ❌ | 10 | 最大实例数 |
| `CPU_THRESHOLD` | number | ❌ | 80 | CPU 使用率阈值 (%) |
| `MEMORY_THRESHOLD` | number | ❌ | 85 | 内存使用率阈值 (%) |

---

## 🎨 前端应用配置

### 1. 管理后台 (端口 5173)

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `VITE_API_BASE_URL` | string | ✅ | http://localhost:30000/api | 后端 API 地址 |
| `VITE_API_TIMEOUT` | number | ❌ | 10000 | API 请求超时 (毫秒) |
| `VITE_WS_URL` | string | ❌ | ws://localhost:30000 | WebSocket 地址 |
| `VITE_APP_TITLE` | string | ❌ | 云手机管理后台 | 应用标题 |
| `VITE_ENABLE_MOCK` | boolean | ❌ | false | 是否启用 Mock 数据 |
| `VITE_ENABLE_DEBUG` | boolean | ❌ | true | 是否启用调试模式 |
| `VITE_PAGE_SIZE` | number | ❌ | 10 | 默认分页大小 |
| `VITE_UPLOAD_MAX_SIZE` | number | ❌ | 209715200 | 上传文件最大大小 (字节) |

### 2. 用户端 (端口 5174)

| 变量名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `VITE_API_BASE_URL` | string | ✅ | http://localhost:30000/api | 后端 API 地址 |
| `VITE_WEBRTC_SERVER_URL` | string | ❌ | http://localhost:30006 | WebRTC 服务器地址 |
| `VITE_WEBRTC_ICE_SERVERS` | string | ❌ | stun:stun.l.google.com:19302 | STUN/TURN 服务器 |
| `VITE_ENABLE_WECHAT_PAY` | boolean | ❌ | false | 是否启用微信支付 |
| `VITE_ENABLE_ALIPAY` | boolean | ❌ | false | 是否启用支付宝 |
| `VITE_ENABLE_BALANCE_PAY` | boolean | ❌ | true | 是否启用余额支付 |

---

## ✅ 配置验证

### 使用 Shell 脚本验证

```bash
# 验证单个服务
./scripts/validate-env.sh api-gateway

# 验证所有后端服务
for service in api-gateway user-service device-service app-service billing-service scheduler-service; do
  echo "Validating $service..."
  cd backend/$service
  ../../scripts/validate-env.sh $service
  cd ../..
done
```

### 使用 Node.js 工具验证

```bash
# 在服务目录中运行
cd backend/user-service
node ../../scripts/check-env.js user-service

# 或者在启动脚本中集成
# package.json
{
  "scripts": {
    "validate": "node ../../scripts/check-env.js user-service",
    "prestart": "npm run validate",
    "start": "nest start"
  }
}
```

### Docker Compose 集成

在 `docker-compose.yml` 中添加环境变量验证：

```yaml
services:
  user-service:
    image: cloudphone/user-service
    environment:
      - NODE_ENV=${NODE_ENV}
      - JWT_SECRET=${JWT_SECRET}
    healthcheck:
      test: ["CMD", "node", "/app/scripts/check-env.js", "user-service"]
      interval: 30s
```

---

## 📘 最佳实践

### 1. 敏感信息管理

**❌ 不要**:
- 将 `.env` 文件提交到 Git
- 在代码中硬编码密钥
- 在日志中输出敏感信息
- 使用弱密码或默认值

**✅ 应该**:
- 使用 `.env.example` 作为模板
- 使用环境变量管理工具 (如 AWS Secrets Manager, HashiCorp Vault)
- 为不同环境使用不同的配置文件
- 定期轮换密钥

### 2. 环境隔离

```
# 开发环境
.env.development

# 测试环境
.env.test

# 生产环境
.env.production
```

### 3. 配置文件权限

```bash
# 限制配置文件权限
chmod 600 .env

# 确保只有服务账户可以读取
chown cloudphone:cloudphone .env
```

### 4. 生产环境检查清单

- [ ] `JWT_SECRET` 使用强密码 (64+ 字符)
- [ ] 数据库密码已修改
- [ ] Redis 密码已设置 (如果启用)
- [ ] 第三方 API 密钥已配置
- [ ] `NODE_ENV=production`
- [ ] 日志级别设置为 `info` 或 `warn`
- [ ] 调试模式已禁用
- [ ] CORS 仅允许白名单域名
- [ ] 限流已启用
- [ ] HTTPS 已配置

---

## 🔍 故障排查

### 常见问题

#### 1. JWT_SECRET 错误

**症状**: "JwtStrategy requires a secret or key"

**解决方案**:
```bash
# 检查环境变量是否设置
echo $JWT_SECRET

# 确保 .env 文件存在且包含 JWT_SECRET
cat .env | grep JWT_SECRET

# 验证配置
./scripts/validate-env.sh user-service
```

#### 2. 数据库连接失败

**症状**: "Connection refused" 或 "Authentication failed"

**解决方案**:
```bash
# 检查数据库是否运行
docker compose ps postgres

# 测试数据库连接
psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_DATABASE

# 检查环境变量
env | grep DB_
```

#### 3. 服务间通信失败

**症状**: "ECONNREFUSED" 或 "Service unavailable"

**解决方案**:
```bash
# 检查服务地址配置
echo $USER_SERVICE_URL
echo $DEVICE_SERVICE_URL

# 测试服务健康检查
curl http://localhost:30001/health
curl http://localhost:30002/health

# 检查 Docker 网络
docker network inspect cloudphone-network
```

#### 4. 环境变量未生效

**症状**: 使用了默认值而不是配置值

**解决方案**:
```bash
# 确保在正确的目录
pwd

# 检查 .env 文件位置
ls -la .env

# 重启服务
docker compose restart user-service

# 查看服务日志
docker compose logs user-service
```

---

## 📚 参考资源

- [NestJS 配置模块](https://docs.nestjs.com/techniques/configuration)
- [Vite 环境变量](https://vitejs.dev/guide/env-and-mode.html)
- [Docker Compose 环境变量](https://docs.docker.com/compose/environment-variables/)
- [12-Factor App 配置](https://12factor.net/config)

---

**最后更新**: 2025-10-20
**版本**: 1.0.0
