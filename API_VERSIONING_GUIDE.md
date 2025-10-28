# API 版本控制实现指南

## ✅ 实施完成总结

所有 6 个 NestJS 微服务已成功实现 API 版本控制，采用 URI 版本控制模式 (`/api/v1/`)。

---

## 📋 已完成的服务

| 服务 | 端口 | API Base URL | Swagger 文档 | 状态 |
|------|------|--------------|--------------|------|
| **api-gateway** | 30000 | `http://localhost:30000/api/v1` | `/api/v1/docs` | ✅ 完成 |
| **user-service** | 30001 | `http://localhost:30001/api/v1` | `/api/v1/docs` | ✅ 完成 |
| **device-service** | 30002 | `http://localhost:30002/api/v1` | `/api/v1/docs` | ✅ 完成 |
| **app-service** | 30003 | `http://localhost:30003/api/v1` | `/api/v1/docs` | ✅ 完成 |
| **billing-service** | 30005 | `http://localhost:30005/api/v1` | `/api/v1/docs` | ✅ 完成 |
| **notification-service** | 30006 | `http://localhost:30006/api/v1` | `/api/v1/docs` | ✅ 完成 |

---

## 🏗️ 实施模式

### 1. API 版本前缀配置

所有服务在 `main.ts` 中添加了全局前缀，并排除健康检查和监控端点：

```typescript
// ========== API 版本控制 ==========

// 设置全局前缀和版本
app.setGlobalPrefix('api/v1', {
  exclude: [
    'health',           // 健康检查不需要版本
    'health/detailed',
    'health/liveness',
    'health/readiness',
    'health/pool',      // 数据库连接池状态（仅 user/device service）
    'health/circuit-breakers',  // 熔断器状态（仅 user/device service）
    'metrics',          // Prometheus metrics 不需要版本
  ],
});
```

### 2. Swagger 文档更新

所有服务的 Swagger 配置已更新：

```typescript
const config = new DocumentBuilder()
  .setTitle('Service Name API')
  .setDescription('服务描述')
  .setVersion('1.0.0')  // ✅ 更新为语义化版本
  .addTag('tag1', '标签描述')
  .addTag('tag2', '标签描述')
  .addServer('http://localhost:3000X', '本地开发环境')  // ✅ 新增服务器配置
  .addServer('https://api.cloudphone.com', '生产环境')  // ✅ 新增生产环境
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/v1/docs', app, document, {  // ✅ 更新文档路径
  swaggerOptions: {
    persistAuthorization: true,
  },
});
```

### 3. 启动日志优化

所有服务的启动日志已更新，清晰显示版本化的 API 路径：

```typescript
console.log(`🚀 Service Name is running on: http://localhost:${port}`);
console.log(`📚 API Documentation: http://localhost:${port}/api/v1/docs`);
console.log(`🔗 API Base URL: http://localhost:${port}/api/v1`);
```

---

## 🔍 服务特定实现细节

### 1. **user-service** (Port 30001)

**新增 Swagger 标签:**
- `auth` - 认证授权
- `quotas` - 配额管理

**排除路径:**
```typescript
exclude: [
  'health',
  'health/detailed',
  'health/liveness',
  'health/readiness',
  'health/pool',            // 数据库连接池状态
  'health/circuit-breakers', // 熔断器状态
  'metrics',
]
```

**现有标签:**
- `users` - 用户管理
- `roles` - 角色管理
- `permissions` - 权限管理

---

### 2. **device-service** (Port 30002)

**新增 Swagger 标签:**
- `snapshots` - 快照管理
- `lifecycle` - 生命周期管理
- `metrics` - 指标监控

**排除路径:**
```typescript
exclude: [
  'health',
  'health/detailed',
  'health/liveness',
  'health/readiness',
  'health/pool',            // 数据库连接池状态
  'health/circuit-breakers', // 熔断器状态
  'metrics',
]
```

**现有标签:**
- `devices` - 设备管理
- `docker` - Docker 容器管理

---

### 3. **notification-service** (Port 30006)

**新增 Swagger 标签:**
- `websocket` - WebSocket 实时通知
- `email` - 邮件通知

**排除路径:**
```typescript
exclude: [
  'health',
  'health/detailed',
  'health/liveness',
  'health/readiness',
  'metrics',
]
```

**现有标签:**
- `notifications` - 通知管理
- `templates` - 模板管理

---

### 4. **billing-service** (Port 30005)

**新增 Swagger 标签:**
- `invoices` - 发票管理
- `payments` - 支付管理

**排除路径:**
```typescript
exclude: [
  'health',
  'health/detailed',
  'health/liveness',
  'health/readiness',
  'metrics',
]
```

**现有标签:**
- `billing` - 计费管理
- `plans` - 套餐管理
- `orders` - 订单管理
- `usage` - 使用记录

---

### 5. **app-service** (Port 30003)

**新增 Swagger 标签:**
- `marketplace` - 应用市场
- `reviews` - 应用审核

**排除路径:**
```typescript
exclude: [
  'health',
  'health/detailed',
  'health/liveness',
  'health/readiness',
  'metrics',
]
```

**现有标签:**
- `apps` - 应用管理
- `installations` - 应用安装管理

---

### 6. **api-gateway** (Port 30000)

**新增 Swagger 标签:**
- `circuit-breaker` - 熔断器
- `rate-limiting` - 限流

**排除路径:**
```typescript
exclude: [
  'health',
  'health/detailed',
  'health/liveness',
  'health/readiness',
  'metrics',
]
```

**现有标签:**
- `auth` - 认证授权
- `proxy` - 服务代理
- `health` - 健康检查

**特殊说明:** API Gateway 之前使用 `/api` 前缀，现已更新为 `/api/v1`

---

## 🧪 测试验证

### 1. 验证 API 端点

测试所有服务的 API 端点是否正确版本化：

```bash
# User Service
curl http://localhost:30001/api/v1/users
curl http://localhost:30001/health  # 健康检查无版本前缀

# Device Service
curl http://localhost:30002/api/v1/devices
curl http://localhost:30002/health

# Notification Service
curl http://localhost:30006/api/v1/notifications
curl http://localhost:30006/health

# Billing Service
curl http://localhost:30005/api/v1/billing
curl http://localhost:30005/health

# App Service
curl http://localhost:30003/api/v1/apps
curl http://localhost:30003/health

# API Gateway
curl http://localhost:30000/api/v1/proxy
curl http://localhost:30000/health
```

### 2. 验证 Swagger 文档

访问每个服务的 Swagger UI：

```bash
# User Service
http://localhost:30001/api/v1/docs

# Device Service
http://localhost:30002/api/v1/docs

# Notification Service
http://localhost:30006/api/v1/docs

# Billing Service
http://localhost:30005/api/v1/docs

# App Service
http://localhost:30003/api/v1/docs

# API Gateway
http://localhost:30000/api/v1/docs
```

### 3. 验证健康检查端点

健康检查端点应该无需版本前缀即可访问：

```bash
# 测试所有服务的健康检查
for port in 30000 30001 30002 30003 30005 30006; do
  echo "=== Port $port ==="
  curl -s http://localhost:$port/health | jq .
done
```

### 4. 验证 Prometheus Metrics

Metrics 端点应该无需版本前缀即可访问：

```bash
# 测试所有服务的 metrics 端点
for port in 30001 30002 30003 30005 30006; do
  echo "=== Port $port ==="
  curl -s http://localhost:$port/metrics | head -20
done
```

---

## 📊 API 版本控制策略

### URI 版本控制模式

我们采用 **URI 版本控制** 模式，将版本号直接嵌入 URL 路径：

**优点:**
- ✅ 清晰明确，易于理解
- ✅ 支持浏览器直接访问
- ✅ 便于缓存和文档化
- ✅ 可以同时支持多个版本

**示例:**
```
http://localhost:30001/api/v1/users       # v1 版本
http://localhost:30001/api/v2/users       # v2 版本（未来）
```

### 版本命名规则

- **格式:** `/api/v{major}`
- **当前版本:** `v1`
- **未来版本:** `v2`, `v3`, ...

### 何时创建新版本

创建新的 API 版本的情况：

1. **破坏性变更 (Breaking Changes)**
   - 删除或重命名现有端点
   - 修改请求/响应格式
   - 改变认证机制

2. **重大功能变更**
   - 完全重写核心功能
   - 改变业务逻辑

3. **不需要新版本的情况**
   - 添加新端点（向后兼容）
   - 添加新的可选字段
   - 修复 bug
   - 性能优化

---

## 🔄 迁移指南

### 客户端迁移步骤

当从旧 API 迁移到 v1 时：

**1. 更新 API Base URL**

**旧 URL:**
```javascript
// user-service
const baseUrl = 'http://localhost:30001';

// api-gateway
const baseUrl = 'http://localhost:30000/api';
```

**新 URL:**
```javascript
// user-service
const baseUrl = 'http://localhost:30001/api/v1';

// api-gateway
const baseUrl = 'http://localhost:30000/api/v1';
```

**2. 更新前端 API 客户端**

**React/TypeScript 示例:**

```typescript
// services/api.config.ts
export const API_CONFIG = {
  USER_SERVICE: 'http://localhost:30001/api/v1',
  DEVICE_SERVICE: 'http://localhost:30002/api/v1',
  APP_SERVICE: 'http://localhost:30003/api/v1',
  BILLING_SERVICE: 'http://localhost:30005/api/v1',
  NOTIFICATION_SERVICE: 'http://localhost:30006/api/v1',
  API_GATEWAY: 'http://localhost:30000/api/v1',
};

// services/userService.ts
import axios from 'axios';
import { API_CONFIG } from './api.config';

export const userService = {
  getUsers: () => axios.get(`${API_CONFIG.USER_SERVICE}/users`),
  getUser: (id: string) => axios.get(`${API_CONFIG.USER_SERVICE}/users/${id}`),
  // ...
};
```

**3. 更新环境变量**

```.env
# 开发环境
VITE_API_GATEWAY_URL=http://localhost:30000/api/v1
VITE_USER_SERVICE_URL=http://localhost:30001/api/v1
VITE_DEVICE_SERVICE_URL=http://localhost:30002/api/v1
VITE_APP_SERVICE_URL=http://localhost:30003/api/v1
VITE_BILLING_SERVICE_URL=http://localhost:30005/api/v1
VITE_NOTIFICATION_SERVICE_URL=http://localhost:30006/api/v1

# 生产环境
VITE_API_GATEWAY_URL=https://api.cloudphone.com/api/v1
```

---

## 🚀 部署考虑

### Nginx 反向代理配置

生产环境 Nginx 配置示例：

```nginx
# /etc/nginx/sites-available/cloudphone-api

upstream api_gateway {
    server localhost:30000;
}

upstream user_service {
    server localhost:30001;
}

server {
    listen 80;
    server_name api.cloudphone.com;

    # API Gateway (统一入口)
    location /api/v1/ {
        proxy_pass http://api_gateway/api/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 直接访问 User Service（可选）
    location /services/user/api/v1/ {
        proxy_pass http://user_service/api/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 健康检查端点
    location /health {
        proxy_pass http://api_gateway/health;
    }

    # Swagger 文档
    location /api/v1/docs {
        proxy_pass http://api_gateway/api/v1/docs;
    }
}
```

### Kubernetes Ingress 配置

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cloudphone-api-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  rules:
  - host: api.cloudphone.com
    http:
      paths:
      # API Gateway
      - path: /api/v1(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 30000

      # 健康检查
      - path: /health
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 30000
```

---

## 📝 最佳实践

### 1. 版本弃用策略

当引入新版本时，旧版本的弃用流程：

1. **宣布弃用 (Deprecation Notice)**
   - 在响应头中添加弃用警告
   - 更新 Swagger 文档
   - 通知客户端开发者

```typescript
// 示例：添加弃用警告
@ApiDeprecated('This endpoint is deprecated. Use /api/v2/users instead')
@Header('X-API-Deprecation', 'true')
@Header('X-API-Sunset', '2025-12-31')
@Get('users')
async getUsers() {
  // ...
}
```

2. **支持窗口期 (Support Window)**
   - 至少 6 个月的共存期
   - 提供迁移指南
   - 监控旧版本使用情况

3. **完全移除 (Removal)**
   - 提前 3 个月通知
   - 返回 410 Gone 状态码
   - 提供迁移路径

### 2. 版本兼容性

**向后兼容的变更（不需要新版本）:**
- 添加新的可选字段
- 添加新端点
- 添加新的查询参数（可选）
- 修复 bug

**不兼容的变更（需要新版本）:**
- 删除字段
- 重命名字段
- 改变字段类型
- 删除端点
- 修改认证方式

### 3. 文档管理

每个版本都应该有：
- ✅ 独立的 Swagger 文档
- ✅ 变更日志 (CHANGELOG.md)
- ✅ 迁移指南
- ✅ 示例代码

### 4. 监控和分析

跟踪 API 版本使用情况：

```typescript
// 中间件：记录 API 版本使用
@Injectable()
export class ApiVersionLoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const apiVersion = req.path.match(/\/api\/(v\d+)\//)?.[1] || 'unknown';

    // 记录到 Prometheus
    apiVersionCounter.inc({ version: apiVersion, endpoint: req.path });

    next();
  }
}
```

---

## 🐛 故障排除

### 问题 1: 404 错误 - 端点未找到

**症状:**
```
GET /users 404 Not Found
```

**原因:** 缺少 `/api/v1` 前缀

**解决:**
```
GET /api/v1/users 200 OK
```

### 问题 2: 健康检查返回 404

**症状:**
```
GET /health 404 Not Found
```

**原因:** 健康检查路径未在 `exclude` 列表中

**解决:** 确保 `setGlobalPrefix` 包含正确的 exclude 配置

### 问题 3: Swagger 文档无法访问

**症状:**
```
GET /api/docs 404 Not Found
```

**原因:** Swagger 路径未更新为 `/api/v1/docs`

**解决:**
```
GET /api/v1/docs 200 OK
```

### 问题 4: 前端 CORS 错误

**症状:**
```
Access to fetch at 'http://localhost:30001/users' from origin 'http://localhost:5173'
has been blocked by CORS policy
```

**原因:** API URL 未更新为包含 `/api/v1` 前缀

**解决:** 更新前端配置使用正确的 URL：
```javascript
const baseUrl = 'http://localhost:30001/api/v1';
```

---

## 📈 下一步行动

### 立即执行（本周）

1. **测试所有 API 端点**
   ```bash
   ./scripts/test-api-versioning.sh
   ```

2. **更新前端应用**
   - 更新 `frontend/admin/` 的 API 配置
   - 更新 `frontend/user/` 的 API 配置
   - 测试所有集成

3. **更新 API Gateway 路由配置**
   - 确保代理路由包含 `/api/v1` 前缀
   - 测试请求转发

4. **更新文档**
   - 更新 README.md
   - 更新 Postman Collection
   - 更新 API 使用示例

### 中期计划（本月）

1. **监控实施**
   - 添加 API 版本使用追踪
   - 设置 Prometheus 指标
   - 创建 Grafana 仪表板

2. **自动化测试**
   - 添加 E2E 测试覆盖版本化端点
   - 更新集成测试
   - CI/CD 管道集成

3. **客户端 SDK**
   - 生成 TypeScript 客户端
   - 生成 OpenAPI 规范
   - 发布 npm 包

### 长期规划（未来 6 个月）

1. **API v2 规划**
   - 收集反馈
   - 设计改进方案
   - 制定迁移计划

2. **版本管理自动化**
   - API 版本检测
   - 自动弃用警告
   - 版本使用分析

---

## 📚 相关资源

### 内部文档
- [IMPROVEMENT_PROGRESS.md](./IMPROVEMENT_PROGRESS.md) - 总体改进计划
- [JOI_VALIDATION_SUMMARY.md](./JOI_VALIDATION_SUMMARY.md) - 环境变量验证
- [DOCKER_SECURITY_BEST_PRACTICES.md](./DOCKER_SECURITY_BEST_PRACTICES.md) - Docker 安全

### 外部参考
- [Semantic Versioning](https://semver.org/) - 语义化版本规范
- [REST API Versioning Guide](https://restfulapi.net/versioning/)
- [NestJS Global Prefix](https://docs.nestjs.com/faq/global-prefix)

---

**创建时间:** 2025-10-28
**最后更新:** 2025-10-28
**状态:** ✅ 已完成
**版本:** 1.0.0
