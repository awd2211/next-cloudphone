# 环境变量配置指南

## 📋 配置文件位置

```
项目根目录/config/
├── .env.development    # 开发环境
├── .env.production     # 生产环境
└── .env.test          # 测试环境
```

## 🔧 快速配置

### 1. 复制模板
```bash
cp ENV_CONFIG_TEMPLATE.md config/.env.development
```

### 2. 同步到各服务
```bash
bash scripts/sync-env.sh development
```

---

## 📝 完整配置模板

```bash
# ========== 通用配置 ==========
NODE_ENV=development
LOG_LEVEL=debug
APP_VERSION=1.0.0

# ========== 数据库配置 ==========
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_USER_SERVICE=cloudphone_user
DB_DEVICE_SERVICE=cloudphone_device
DB_APP_SERVICE=cloudphone_app
DB_BILLING_SERVICE=cloudphone_billing

# ========== Redis 配置 ==========
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_CACHE_DB=1

# ========== 服务端口 ==========
API_GATEWAY_PORT=30000
USER_SERVICE_PORT=30001
DEVICE_SERVICE_PORT=30002
APP_SERVICE_PORT=30003
BILLING_SERVICE_PORT=30005
NOTIFICATION_SERVICE_PORT=30006

# ========== JWT 配置 ==========
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# ========== CORS ==========
CORS_ORIGINS=http://localhost:5173,http://localhost:5174

# ========== Consul ==========
CONSUL_HOST=localhost
CONSUL_PORT=8500

# ========== Docker & Redroid ==========
DOCKER_HOST=unix:///var/run/docker.sock
REDROID_ENABLE_GPU=false
ADB_PORT_START=5555
ADB_PORT_END=5655

# ========== MinIO ==========
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# ========== 其他 ==========
MAX_FILE_SIZE=104857600
CAPTCHA_EXPIRY=300
```

## 🎯 按服务分类

### API Gateway
- `API_GATEWAY_PORT`
- `JWT_SECRET`
- `CORS_ORIGINS`
- `THROTTLE_*`

### User Service
- `USER_SERVICE_PORT`
- `DB_USER_SERVICE`
- `JWT_SECRET`
- `SMTP_*`

### Device Service
- `DEVICE_SERVICE_PORT`
- `DB_DEVICE_SERVICE`
- `DOCKER_*`
- `REDROID_*`
- `ADB_PORT_*`

### App Service
- `APP_SERVICE_PORT`
- `DB_APP_SERVICE`
- `MINIO_*`

### Billing Service
- `BILLING_SERVICE_PORT`
- `DB_BILLING_SERVICE`
- `ALIPAY_*`
- `WECHAT_*`

