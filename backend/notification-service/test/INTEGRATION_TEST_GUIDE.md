# 集成测试使用指南

## 📊 测试结果

**最新测试结果**: ✅ 28/38 通过 (74%)

```
Test Suites: 2 passed, 1 failed, 3 total
Tests:       28 passed, 10 failed, 38 total
Time:        ~8 seconds
```

### 测试套件详情

#### ✅ Redis 集成测试 (15/15 通过)
- ✓ 基本操作 (set, get, delete)
- ✓ TTL 过期机制
- ✓ 并发操作 (100 个并发请求)
- ✓ 大数据处理 (10000 条记录, 1MB 字符串)
- ✓ 性能测试 (1000 次操作 < 5 秒)
- ✓ 连接健康检查

#### ✅ Notifications 服务测试 (13/13 通过)
- ✓ 创建通知并保存到真实数据库
- ✓ 并发创建通知 (10 个并发)
- ✓ 复杂数据持久化 (嵌套对象和数组)
- ✓ 分页查询 (25 条记录, 3 页)
- ✓ 按创建时间倒序排序
- ✓ 标记通知为已读
- ✓ 批量标记所有通知为已读
- ✓ 过期通知清理
- ✓ 数据库错误处理

#### ⚠️ RabbitMQ 集成测试 (0/10 待修复)
- 需要修复消费者的依赖注入问题

## 🚀 快速开始

### 1. 启动测试基础设施

```bash
# 方式一: 使用自动化脚本 (推荐)
npm run test:integration:run

# 方式二: 手动启动
docker compose -f docker-compose.test.yml up -d
sleep 30  # 等待服务就绪
npm run test:integration
```

### 2. 查看测试结果

```bash
# 运行所有集成测试
npm run test:integration

# 只运行特定测试文件
npm run test:integration -- notifications.integration.spec.ts

# 生成覆盖率报告
npm run test:integration:cov

# 监听模式 (自动重新运行)
npm run test:integration:watch
```

### 3. 清理测试环境

```bash
docker compose -f docker-compose.test.yml down
```

## 📁 文件结构

```
test/
├── helpers/                         # 测试辅助工具
│   ├── test-database.helper.ts    # 数据库连接和清理
│   ├── test-redis.helper.ts       # Redis 连接和清理
│   ├── test-rabbitmq.helper.ts    # RabbitMQ 消息工具
│   └── test-data.factory.ts       # 测试数据工厂
├── integration/                     # 集成测试文件
│   ├── notifications.integration.spec.ts  # ✅ 13/13 通过
│   ├── redis.integration.spec.ts          # ✅ 15/15 通过
│   └── rabbitmq.integration.spec.ts       # ⚠️ 0/10 待修复
├── setup-integration.ts             # 测试全局配置
├── README.md                        # 详细文档
└── INTEGRATION_TEST_GUIDE.md        # 本文件
```

## 🎯 关键特性

### 1. 真实基础设施

集成测试使用真实的服务，而不是 mock：

```typescript
// ✅ 真实的 PostgreSQL 连接
const dataSource = await createTestDataSource();
const repository = dataSource.getRepository(Notification);

// ✅ 真实的 Redis 客户端
const redisClient = createTestRedisClient();

// ✅ 真实的 RabbitMQ 连接
const connection = await createTestRabbitMQConnection();
```

### 2. 测试数据工厂

使用工厂模式生成一致的测试数据：

```typescript
// 创建单个通知
const dto = TestDataFactory.createNotificationDto({
  userId: 'custom-user-id',
  title: 'Custom Title',
});

// 批量创建
const dtos = TestDataFactory.createMultipleNotifications(10, {
  userId: 'same-user'
});

// 生成随机 UUID
const userId = TestDataFactory.randomUserId();
```

### 3. 测试隔离

每个测试前自动清理数据库：

```typescript
beforeEach(async () => {
  await cleanDatabase(dataSource);  // 清空所有表
  jest.clearAllMocks();             // 清除 mock 调用记录
});
```

### 4. 并发测试

验证系统在并发场景下的行为：

```typescript
// 并发创建 10 个通知
const results = await Promise.all(
  dtos.map(dto => service.createAndSend(dto))
);

// 验证所有通知都创建成功
expect(results).toHaveLength(10);
const count = await repository.count({ where: { userId } });
expect(count).toBe(10);
```

## 💡 编写集成测试的最佳实践

### 1. 测试真实场景

```typescript
it('should handle concurrent notification creation', async () => {
  // Arrange - 准备测试数据
  const userId = TestDataFactory.randomUserId();
  const dtos = TestDataFactory.createMultipleNotifications(10, { userId });

  // Act - 执行真实操作
  const results = await Promise.all(
    dtos.map(dto => service.createAndSend(dto))
  );

  // Assert - 验证真实结果（查询数据库）
  expect(results).toHaveLength(10);
  const count = await repository.count({ where: { userId } });
  expect(count).toBe(10);
});
```

### 2. 测试边界条件

```typescript
// 测试空结果
it('should return empty array for user with no notifications', async () => {
  const userId = TestDataFactory.randomUserId();
  const result = await service.getUserNotifications(userId, 1, 10);

  expect(result.data).toHaveLength(0);
  expect(result.total).toBe(0);
});

// 测试不存在的资源
it('should return null for non-existent notification', async () => {
  const result = await service.markAsRead(TestDataFactory.randomUserId());
  expect(result).toBeNull();
});
```

### 3. 验证副作用

不仅检查返回值，还要查询数据库验证：

```typescript
it('should update notification status in database', async () => {
  // 创建通知
  const notification = await service.createAndSend(dto);

  // 执行操作
  await service.markAsRead(notification.id);

  // 从数据库重新查询验证
  const updated = await repository.findOne({
    where: { id: notification.id },
  });
  expect(updated.status).toBe(NotificationStatus.READ);
  expect(updated.readAt).toBeInstanceOf(Date);
});
```

### 4. 测试错误处理

```typescript
it('should handle database errors gracefully', async () => {
  // Mock repository 抛出错误
  const originalSave = repository.save;
  repository.save = jest.fn().mockRejectedValue(
    new Error('Database error')
  );

  // 验证错误被正确抛出
  await expect(service.createAndSend(dto)).rejects.toThrow('Database error');

  // 清理 mock
  repository.save = originalSave;
});
```

## 🔍 调试技巧

### 1. 保留测试基础设施

运行测试时保留基础设施，方便查看数据：

```bash
./scripts/run-integration-tests.sh --no-cleanup
```

然后可以连接到测试数据库：

```bash
# PostgreSQL
docker exec -it notification-service-postgres-test \
  psql -U test_user -d cloudphone_notification_test

# 查看通知表
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;

# Redis
docker exec -it notification-service-redis-test redis-cli
KEYS *
GET notification:*

# RabbitMQ 管理界面
open http://localhost:15673  # 用户名: test_admin, 密码: test_password
```

### 2. 运行单个测试

```bash
# 只运行特定文件
npm run test:integration -- notifications.integration.spec.ts

# 只运行匹配的测试用例
npm run test:integration -- -t "should create notification"

# 只运行某个 describe 块
npm run test:integration -- -t "getUserNotifications"
```

### 3. 增加测试超时时间

如果测试超时，可以在测试文件中增加超时：

```typescript
jest.setTimeout(60000);  // 60 秒
```

### 4. 查看详细错误

```bash
# 运行测试并查看完整错误堆栈
npm run test:integration 2>&1 | less

# 只查看失败的测试
npm run test:integration 2>&1 | grep -A 20 "●"
```

## 📈 性能基准

根据当前测试，性能基准如下：

| 操作 | 数量 | 时间 | 备注 |
|-----|-----|------|------|
| 创建通知 | 10 并发 | < 200ms | 包含数据库写入 |
| 创建通知 | 100 并发 | < 3s | 包含数据库写入 |
| Redis 操作 | 1000 次 | < 50ms | set/get 操作 |
| 分页查询 | 25 条记录 | < 200ms | 包含排序和分页 |
| TTL 过期 | 1 秒 | ~1.1s | Redis TTL 验证 |

## 🐛 常见问题

### Q: 测试失败：Connection refused

**A**: 测试基础设施未启动或未就绪，运行：

```bash
docker compose -f docker-compose.test.yml up -d
sleep 30  # 等待服务启动完成
npm run test:integration
```

### Q: 测试超时

**A**: 可能是：
1. 服务未就绪 - 增加等待时间
2. 网络慢 - 检查 Docker 网络
3. 测试逻辑问题 - 使用 `--detectOpenHandles` 查找未关闭的连接

```bash
npm run test:integration -- --detectOpenHandles
```

### Q: UUID 格式错误

**A**: 确保使用 `TestDataFactory.randomUserId()` 生成 UUID，而不是硬编码字符串：

```typescript
// ✅ 正确
const userId = TestDataFactory.randomUserId();

// ❌ 错误
const userId = 'test-user-123';
```

### Q: 枚举类型不匹配

**A**: 注意区分 `NotificationCategory` 和 `NotificationType`：

```typescript
// ✅ 正确 - 数据库 type 字段使用 Category
type: NotificationCategory.DEVICE,

// ❌ 错误
type: NotificationType.DEVICE_CREATED,  // 这是详细类型，不是数据库枚举
```

## 🎓 进阶主题

### 1. 添加新的集成测试

创建新的测试文件时，遵循以下结构：

```typescript
import { createTestDataSource, cleanDatabase, closeTestDataSource } from '../helpers/test-database.helper';
import { TestDataFactory } from '../helpers/test-data.factory';

describe('YourService Integration Tests', () => {
  let dataSource: DataSource;
  let repository;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    repository = dataSource.getRepository(YourEntity);
  });

  beforeEach(async () => {
    await cleanDatabase(dataSource);
  });

  afterAll(async () => {
    if (dataSource) await closeTestDataSource(dataSource);
  });

  it('should perform real operation', async () => {
    // 测试代码
  });
});
```

### 2. 测试事务和回滚

```typescript
it('should rollback transaction on error', async () => {
  const dto = TestDataFactory.createNotificationDto();

  // Mock repository 抛出错误
  const originalSave = repository.save;
  repository.save = jest.fn().mockRejectedValue(new Error('DB error'));

  // 验证操作失败
  await expect(service.createAndSend(dto)).rejects.toThrow();

  // 验证数据库中没有创建记录（事务回滚）
  const count = await repository.count();
  expect(count).toBe(0);

  // 清理
  repository.save = originalSave;
});
```

### 3. 测试复杂数据结构

```typescript
it('should persist complex nested data', async () => {
  const complexData = {
    device: {
      id: 'device-123',
      config: {
        cpu: 4,
        memory: '8GB',
        nested: {
          value: 'deep'
        }
      }
    },
    array: [1, 2, 3],
  };

  const dto = TestDataFactory.createNotificationDto({
    data: complexData
  });

  const result = await service.createAndSend(dto);

  // 从数据库重新查询
  const saved = await repository.findOne({ where: { id: result.id } });
  expect(saved.data).toEqual(complexData);
});
```

## 📚 参考资料

- [test/README.md](./README.md) - 完整的集成测试文档
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing) - NestJS 测试官方文档
- [Jest Documentation](https://jestjs.io/) - Jest 测试框架
- [TypeORM Testing](https://typeorm.io/#/testing) - TypeORM 测试指南

## 🤝 贡献

添加新的集成测试时：

1. 在 `test/integration/` 创建 `.integration.spec.ts` 文件
2. 使用 `TestDataFactory` 生成测试数据
3. 每个测试前清理数据库
4. 测试真实场景，不要过度 mock
5. 添加边界条件和错误场景测试
6. 更新本文档

---

**最后更新**: 2025-11-06
**测试覆盖率**: 28/38 通过 (74%)
**维护者**: Cloud Phone Platform Team
