# E2E Integration Tests

端到端集成测试套件，用于验证云手机平台各微服务之间的完整交互流程。

## 📋 概述

E2E 测试覆盖了以下核心功能模块：

- **用户认证** (`user-auth.e2e.spec.ts`)
  - 用户注册、登录、密码管理
  - JWT 令牌认证
  - 用户资料管理

- **设备生命周期** (`device-lifecycle.e2e.spec.ts`)
  - 设备创建、启动、停止、重启
  - 设备快照管理（创建、恢复、删除）
  - 设备指标监控
  - 配额限制测试

- **余额管理** (`billing.e2e.spec.ts`)
  - 余额充值、消费
  - 余额冻结/解冻
  - 交易历史查询
  - 订阅套餐管理
  - 使用量计费
  - 发票生成

## 🛠️ 技术栈

- **测试框架**: Jest + ts-jest
- **HTTP 客户端**: Axios
- **环境管理**: dotenv
- **TypeScript**: 用于类型安全的测试代码

## 📁 项目结构

```
e2e-tests/
├── api/                           # E2E 测试文件
│   ├── user-auth.e2e.spec.ts     # 用户认证测试
│   ├── device-lifecycle.e2e.spec.ts  # 设备生命周期测试
│   └── billing.e2e.spec.ts       # 余额管理测试
├── helpers/                       # 测试辅助工具
│   ├── api-client.ts             # HTTP 客户端封装
│   ├── test-helpers.ts           # 测试工具函数
│   └── wait-for-services.js      # 服务健康检查
├── fixtures/                      # 测试数据
├── .env.test                      # 测试环境配置
├── jest.config.js                 # Jest 配置
├── tsconfig.json                  # TypeScript 配置
├── package.json                   # 项目依赖
└── README.md                      # 本文档
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd e2e-tests
pnpm install
```

### 2. 启动所有服务

确保所有后端服务和基础设施正在运行：

```bash
# 启动基础设施（PostgreSQL, Redis, RabbitMQ 等）
docker compose -f docker-compose.dev.yml up -d

# 启动所有后端服务（使用 PM2）
cd /home/eric/next-cloudphone
pnpm dev

# 或者使用脚本
./scripts/start-all-services.sh
```

### 3. 验证服务健康

```bash
# 检查所有服务健康状态
./scripts/check-health.sh

# 或手动检查
curl http://localhost:30001/health  # User Service
curl http://localhost:30002/health  # Device Service
curl http://localhost:30005/health  # Billing Service
```

### 4. 运行测试

```bash
# 运行所有 E2E 测试
cd e2e-tests
pnpm test

# 运行特定测试套件
pnpm test:user      # 用户认证测试
pnpm test:device    # 设备生命周期测试
pnpm test:billing   # 余额管理测试

# 使用便捷脚本
./run-e2e-tests.sh
```

## ⚙️ 环境配置

### .env.test 配置说明

```bash
# 服务端点
API_GATEWAY_URL=http://localhost:30000
USER_SERVICE_URL=http://localhost:30001
DEVICE_SERVICE_URL=http://localhost:30002
APP_SERVICE_URL=http://localhost:30003
BILLING_SERVICE_URL=http://localhost:30005

# 数据库配置（用于清理）
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres

# 测试用户凭证
TEST_USER_EMAIL=e2e.test@cloudphone.com
TEST_USER_PASSWORD=E2ETestPassword123!
TEST_ADMIN_EMAIL=e2e.admin@cloudphone.com
TEST_ADMIN_PASSWORD=E2EAdminPassword123!

# 测试配置
E2E_CLEANUP_AFTER_TESTS=true   # 测试后自动清理数据
E2E_WAIT_FOR_SERVICES=true     # 测试前等待服务就绪
E2E_TIMEOUT=30000              # 测试超时时间（毫秒）
```

## 📊 测试覆盖范围

### 用户认证测试 (26 测试用例)

| 测试组 | 测试数 | 覆盖功能 |
|--------|--------|---------|
| 用户注册 | 5 | 成功注册、重复用户名/邮箱、弱密码、无效邮箱 |
| 用户登录 | 4 | 成功登录、错误密码、不存在用户、缺少凭证 |
| Token 认证 | 4 | 有效 token、无 token、无效 token、过期 token |
| 资料管理 | 4 | 获取资料、更新资料、修改密码、密码验证 |

### 设备生命周期测试 (30+ 测试用例)

| 测试组 | 测试数 | 覆盖功能 |
|--------|--------|---------|
| 设备创建 | 5 | 成功创建、默认值、缺少字段、无效资源、端口分配 |
| 设备查询 | 4 | ID 查询、列表查询、不存在设备、状态过滤 |
| 设备操作 | 5 | 启动、停止、重启、更新配置 |
| 快照管理 | 4 | 创建、列表、恢复、删除快照 |
| 指标监控 | 2 | 实时指标、历史数据 |
| 设备删除 | 3 | 成功删除、运行中删除、不存在设备 |
| 配额管理 | 1 | 配额限制测试 |

### 余额管理测试 (35+ 测试用例)

| 测试组 | 测试数 | 覆盖功能 |
|--------|--------|---------|
| 余额查询 | 2 | 获取余额、初始值验证 |
| 余额充值 | 4 | 成功充值、负数金额、零金额、交易记录 |
| 余额消费 | 4 | 成功消费、超额消费、负数金额、交易记录 |
| 冻结/解冻 | 4 | 冻结、解冻、超额冻结、超额解冻 |
| 交易历史 | 4 | 查询历史、类型过滤、分页、排序 |
| 订阅套餐 | 2 | 列出套餐、套餐详情 |
| 使用计费 | 3 | 记录使用、统计查询、扣费验证 |
| 发票管理 | 2 | 生成发票、发票列表 |
| 余额告警 | 1 | 低余额检测 |

**总计**: 90+ 个 E2E 测试用例

## 🧪 测试辅助工具

### ApiClient 类

提供统一的 HTTP 请求接口，支持自动 Token 管理：

```typescript
import { userService, deviceService, billingService } from './helpers/api-client';

// GET 请求
const user = await userService.get<User>('/users/profile');

// POST 请求
const device = await deviceService.post('/devices', { name: 'test-device' });

// 设置认证 Token
userService.setToken('your-jwt-token');

// 清除 Token
userService.clearToken();
```

### 测试辅助函数

```typescript
import {
  createTestUser,
  createTestDevice,
  deleteTestUser,
  deleteTestDevice,
  waitFor,
  sleep,
} from './helpers/test-helpers';

// 创建测试用户（自动注册和登录）
const user = await createTestUser();

// 创建测试设备
const device = await createTestDevice({ name: 'my-device' });

// 等待条件满足
await waitFor(
  async () => {
    const d = await deviceService.get(`/devices/${device.id}`);
    return d.status === 'running';
  },
  { timeout: 30000, interval: 2000 }
);

// 延迟执行
await sleep(1000);

// 清理资源
await deleteTestDevice(device.id);
await deleteTestUser(user.id);
```

## 🔧 Jest 配置

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/api'],
  testMatch: ['**/*.e2e.spec.ts'],
  testTimeout: 30000,        // 30 秒超时
  verbose: true,
  forceExit: true,           // 测试完成后强制退出
  runInBand: true,           // 串行运行测试
};
```

## 📝 编写新的 E2E 测试

### 基本模板

```typescript
import { userService } from '../helpers/api-client';
import { createTestUser, deleteTestUser } from '../helpers/test-helpers';

describe('My Feature E2E Tests', () => {
  let testUserId: string;

  beforeAll(async () => {
    const user = await createTestUser();
    testUserId = user.id!;
  });

  afterAll(async () => {
    if (testUserId) {
      await deleteTestUser(testUserId);
    }
  });

  it('should do something', async () => {
    const response = await userService.get('/my-endpoint');
    expect(response).toBeDefined();
  });
});
```

### 最佳实践

1. **使用 beforeAll/afterAll 进行资源管理**
   - 在测试套件开始时创建资源
   - 在测试套件结束时清理资源

2. **使用唯一标识符**
   - 使用时间戳避免测试数据冲突
   ```typescript
   const timestamp = Date.now();
   const username = `e2e_user_${timestamp}`;
   ```

3. **等待异步操作完成**
   - 使用 `waitFor` 等待状态变化
   - 使用 `sleep` 给系统处理时间

4. **合理的超时设置**
   - 设备操作需要较长时间：30 秒
   - 简单 API 调用：10 秒

5. **清理测试数据**
   - 始终在 afterAll/afterEach 中清理
   - 使用 try-catch 防止清理失败

## 🐛 故障排查

### 测试失败常见原因

#### 1. 服务未启动或不健康

```bash
# 检查服务状态
./scripts/check-health.sh

# 检查服务日志
pm2 logs user-service
pm2 logs device-service
pm2 logs billing-service
```

#### 2. 数据库连接错误

```bash
# 检查 PostgreSQL 是否运行
docker compose -f docker-compose.dev.yml ps postgres

# 检查数据库连接
docker compose -f docker-compose.dev.yml exec postgres \
  psql -U postgres -c "SELECT 1"
```

#### 3. Token 认证失败

- 确保 JWT_SECRET 在所有服务中一致
- 检查 token 是否正确设置：`userService.setToken(token)`

#### 4. 端口冲突

```bash
# 检查端口占用
lsof -i :30001
lsof -i :30002
lsof -i :30005
```

#### 5. 超时错误

- 增加 testTimeout 配置
- 检查服务响应时间是否正常

### 调试技巧

```typescript
// 启用详细日志
console.log('Request:', requestData);
console.log('Response:', response);

// 检查服务响应
const response = await userService.get('/health');
console.log('Service health:', response);

// 查看完整错误信息
try {
  await deviceService.post('/devices', data);
} catch (error: any) {
  console.error('Full error:', error.response?.data || error.message);
  throw error;
}
```

## 📈 持续集成

### GitHub Actions 集成示例

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Start services
        run: |
          pnpm build
          pnpm dev &
          sleep 30

      - name: Run E2E tests
        run: |
          cd e2e-tests
          pnpm test
```

## 🔐 安全注意事项

1. **测试凭证**: 使用专用测试凭证，不要使用生产凭证
2. **数据隔离**: 测试数据应与生产数据完全隔离
3. **敏感信息**: .env.test 不应提交到版本控制（已加入 .gitignore）
4. **清理策略**: 确保测试数据在测试后被完全清理

## 📚 相关文档

- [测试总结文档](../TESTING_SUMMARY.md) - 单元测试和 E2E 测试总览
- [后端服务文档](../backend/README.md) - 微服务架构说明
- [API 文档](../docs/API.md) - REST API 端点文档
- [部署文档](../docs/DEPLOYMENT.md) - 生产环境部署指南

## 🤝 贡献指南

添加新的 E2E 测试时：

1. 在 `api/` 目录下创建新的测试文件
2. 遵循现有的命名规范：`*.e2e.spec.ts`
3. 使用测试辅助工具简化代码
4. 添加适当的注释说明测试意图
5. 确保测试独立且可重复运行
6. 更新本 README 文档

## 📊 测试报告

运行测试后，可以生成详细的测试报告：

```bash
# 生成覆盖率报告
pnpm test -- --coverage

# 生成 HTML 报告
pnpm test -- --coverage --coverageReporters=html

# 查看报告
open coverage/index.html
```

---

**最后更新**: 2025-10-23
**维护者**: Cloud Phone Platform Team
