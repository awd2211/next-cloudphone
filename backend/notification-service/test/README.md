# Notification Service - Integration Tests

这个目录包含了 notification-service 的集成测试，使用真实的 PostgreSQL、Redis 和 RabbitMQ 进行测试。

## 目录结构

```
test/
├── helpers/                      # 测试辅助工具
│   ├── test-database.helper.ts  # 数据库连接和清理工具
│   ├── test-redis.helper.ts     # Redis 连接和清理工具
│   ├── test-rabbitmq.helper.ts  # RabbitMQ 连接和消息工具
│   └── test-data.factory.ts     # 测试数据工厂
├── integration/                  # 集成测试文件
│   ├── notifications.integration.spec.ts  # Notifications 服务集成测试
│   ├── rabbitmq.integration.spec.ts       # RabbitMQ 消费者集成测试
│   └── redis.integration.spec.ts          # Redis 缓存集成测试
├── setup-integration.ts          # 集成测试全局配置
└── README.md                     # 本文档
```

## 为什么需要集成测试？

### 单元测试的局限性
当前的单元测试（`*.spec.ts`）存在以下问题：
- ❌ **过度 Mock**：几乎所有依赖都被 mock，只测试了"mock 被调用"，而不是真实逻辑
- ❌ **无法发现真实问题**：不能测试数据库查询错误、RabbitMQ 消息丢失、Redis 缓存失效等真实场景
- ❌ **缺少并发测试**：无法测试多个请求同时到达时的行为
- ❌ **缺少边界条件测试**：无法测试大数据量、网络超时、服务不可用等极端情况

### 集成测试的优势
集成测试使用真实的基础设施：
- ✅ **真实数据库操作**：测试 SQL 查询、事务、并发写入
- ✅ **真实消息队列**：测试事件发布、消费、重试、DLX
- ✅ **真实缓存**：测试 Redis 读写、过期、并发
- ✅ **端到端流程**：测试从事件发布到通知创建的完整流程
- ✅ **性能测试**：测试大数据量下的性能表现

## 快速开始

### 1. 前置要求

- Docker 和 Docker Compose（用于启动测试基础设施）
- Node.js 18+
- pnpm

### 2. 启动测试基础设施

```bash
# 启动 PostgreSQL、Redis、RabbitMQ 测试容器
docker-compose -f docker-compose.test.yml up -d

# 检查服务状态
docker-compose -f docker-compose.test.yml ps
```

测试基础设施使用独立的端口，不会影响开发环境：
- PostgreSQL: `localhost:5433`
- Redis: `localhost:6380`
- RabbitMQ: `localhost:5673` (AMQP), `localhost:15673` (管理界面)

### 3. 运行集成测试

#### 方式一：使用自动化脚本（推荐）
```bash
# 自动启动基础设施 → 运行测试 → 清理
npm run test:integration:run

# 保留基础设施不清理（方便调试）
./scripts/run-integration-tests.sh --no-cleanup
```

#### 方式二：手动运行
```bash
# 启动基础设施
docker-compose -f docker-compose.test.yml up -d

# 等待服务就绪（10-30秒）
sleep 30

# 运行测试
npm run test:integration

# 清理（可选）
docker-compose -f docker-compose.test.yml down
```

### 4. 其他测试命令

```bash
# 监听模式（自动重新运行测试）
npm run test:integration:watch

# 生成覆盖率报告
npm run test:integration:cov

# 运行特定测试文件
npm run test:integration -- notifications.integration.spec.ts

# 运行特定测试用例
npm run test:integration -- -t "should create notification and save to real database"
```

## 测试覆盖内容

### 1. Notifications 服务测试 (`notifications.integration.spec.ts`)

测试真实的数据库操作：
- ✅ 创建通知并保存到数据库
- ✅ 并发创建多个通知
- ✅ 分页查询和排序
- ✅ 按状态过滤查询
- ✅ 标记通知为已读
- ✅ 批量标记所有通知为已读
- ✅ 删除过期通知
- ✅ 事务回滚测试
- ✅ 复杂数据对象持久化

**测试示例**：
```typescript
it('should handle concurrent notification creation', async () => {
  // 并发创建10个通知
  const results = await Promise.all(
    dtos.map(dto => service.create(dto))
  );

  // 验证所有通知都创建成功且ID唯一
  expect(results).toHaveLength(10);
  const ids = results.map(r => r.id);
  expect(new Set(ids).size).toBe(10);

  // 验证数据库中确实有10条记录
  const count = await repository.count({ where: { userId } });
  expect(count).toBe(10);
});
```

### 2. RabbitMQ 消费者测试 (`rabbitmq.integration.spec.ts`)

测试真实的消息队列操作：
- ✅ 消费 device.created 事件并创建通知
- ✅ 消费 user.registered 事件
- ✅ 消费 billing.low_balance 事件
- ✅ 并发处理多个事件
- ✅ 端到端事件流（发布 → 消费 → 数据库）
- ✅ 高吞吐量测试（50个并发事件）
- ✅ 错误处理和重试机制
- ✅ 畸形数据处理
- ✅ 数据库连接失败处理

**测试示例**：
```typescript
it('should publish event to RabbitMQ and consume it successfully', async () => {
  // 发布事件到 RabbitMQ
  await publishTestEvent(channel, 'cloudphone.events', 'device.created', event);

  // 等待消息被消费
  await waitForMessageProcessing(2000);

  // 验证数据库中创建了通知
  const notifications = await repository.find({ where: { userId: 'e2e-user' } });
  expect(notifications.length).toBeGreaterThan(0);
});
```

### 3. Redis 缓存测试 (`redis.integration.spec.ts`)

测试真实的缓存操作：
- ✅ 设置和获取缓存值
- ✅ TTL 过期测试
- ✅ 删除缓存键
- ✅ 批量删除（按模式匹配）
- ✅ 清空整个缓存
- ✅ 并发读写测试（100个并发操作）
- ✅ 大数据处理（10000条记录、1MB字符串）
- ✅ 错误处理（连接失败、无效JSON）
- ✅ 性能测试（1000次操作）

**测试示例**：
```typescript
it('should handle concurrent set operations', async () => {
  // 并发设置100个键值对
  await Promise.all(
    operations.map(op => cacheService.set(op.key, op.value))
  );

  // 验证所有值都正确存储
  const results = await Promise.all(
    operations.map(op => cacheService.get(op.key))
  );

  results.forEach((result, i) => {
    expect(result).toBe(`value-${i}`);
  });
});
```

## 测试数据管理

### 测试数据工厂 (`TestDataFactory`)

使用工厂模式生成测试数据：
```typescript
// 创建通知DTO
const dto = TestDataFactory.createNotificationDto({
  userId: 'custom-user',
  title: 'Custom Title',
});

// 批量创建
const dtos = TestDataFactory.createMultipleNotifications(10, { userId });

// 创建事件
const event = TestDataFactory.createDeviceCreatedEvent({
  payload: { deviceName: 'Custom Device' }
});
```

### 数据库清理

每个测试用例前自动清理数据库：
```typescript
beforeEach(async () => {
  await cleanDatabase(dataSource);  // 清空所有表
  jest.clearAllMocks();             // 清除 mock 调用记录
});
```

## 调试技巧

### 1. 保留测试基础设施

运行测试时保留基础设施，方便查看数据：
```bash
./scripts/run-integration-tests.sh --no-cleanup
```

然后可以连接到测试数据库：
```bash
# PostgreSQL
docker exec -it notification-service-postgres-test psql -U test_user -d cloudphone_notification_test

# Redis
docker exec -it notification-service-redis-test redis-cli

# RabbitMQ 管理界面
open http://localhost:15673  # 用户名: test_admin, 密码: test_password
```

### 2. 查看服务日志

```bash
# PostgreSQL 日志
docker logs notification-service-postgres-test

# Redis 日志
docker logs notification-service-redis-test

# RabbitMQ 日志
docker logs notification-service-rabbitmq-test
```

### 3. 运行单个测试

```bash
# 只运行特定文件
npm run test:integration -- notifications.integration.spec.ts

# 只运行匹配的测试用例
npm run test:integration -- -t "concurrent"
```

### 4. 增加测试超时时间

如果测试超时，可以在测试文件中增加超时：
```typescript
jest.setTimeout(60000);  // 60秒
```

## 性能基准

根据当前测试，性能基准如下：

| 操作 | 数量 | 时间 | 备注 |
|-----|-----|------|------|
| 创建通知 | 10 并发 | < 500ms | 包含数据库写入 |
| 创建通知 | 100 并发 | < 3s | 包含数据库写入 |
| Redis 操作 | 1000 次 | < 5s | set/get 操作 |
| RabbitMQ 消息 | 50 并发 | < 5s | 发布 + 消费 + 数据库 |

## 常见问题

### Q: 测试失败："Connection refused"
**A**: 测试基础设施未启动或未就绪，运行：
```bash
docker-compose -f docker-compose.test.yml up -d
# 等待30秒让服务启动完成
sleep 30
```

### Q: 测试超时
**A**: 可能是：
1. 服务未就绪 - 增加等待时间
2. 网络慢 - 检查 Docker 网络
3. 测试逻辑问题 - 使用 `--detectOpenHandles` 查找未关闭的连接

### Q: 数据库连接错误
**A**: 检查 `.env.test` 配置是否正确，端口是否被占用

### Q: RabbitMQ 连接失败
**A**: RabbitMQ 启动较慢（30-60秒），确保等待足够时间

## 最佳实践

1. **每个测试独立**：不依赖其他测试的数据
2. **清理测试数据**：`beforeEach` 中清理数据库
3. **使用工厂模式**：统一生成测试数据
4. **测试边界条件**：空值、超大值、并发
5. **测试错误场景**：网络失败、服务不可用
6. **验证副作用**：不仅检查返回值，还要查询数据库验证
7. **适当的超时**：集成测试需要更长的超时时间
8. **并行运行**：使用 `--maxWorkers` 控制并发数

## 持续集成

在 CI/CD 管道中运行集成测试：

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:integration:run
```

## 贡献指南

添加新的集成测试时：
1. 在 `test/integration/` 创建新的 `.integration.spec.ts` 文件
2. 使用 `TestDataFactory` 生成测试数据
3. 每个测试前清理数据库
4. 测试真实场景，不要过度 mock
5. 添加边界条件和错误场景测试
6. 更新本文档

## 参考资料

- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TypeORM Testing](https://typeorm.io/#/testing)
- [RabbitMQ Testing](https://www.rabbitmq.com/getstarted.html)
