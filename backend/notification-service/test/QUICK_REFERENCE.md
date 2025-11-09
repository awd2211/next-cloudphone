# 集成测试快速参考

## ⚡ 常用命令

```bash
# 🚀 一键运行（自动启动基础设施 + 测试 + 清理）
npm run test:integration:run

# 🔄 运行测试（需要先启动基础设施）
npm run test:integration

# 📊 生成覆盖率报告
npm run test:integration:cov

# 👀 监听模式
npm run test:integration:watch

# 🎯 运行特定测试文件
npm run test:integration -- notifications.integration.spec.ts

# 🔍 运行匹配的测试用例
npm run test:integration -- -t "should create notification"

# 🧹 清理测试基础设施
docker compose -f docker-compose.test.yml down
```

## 🐳 Docker 命令

```bash
# 启动测试基础设施
docker compose -f docker-compose.test.yml up -d

# 查看服务状态
docker compose -f docker-compose.test.yml ps

# 查看日志
docker compose -f docker-compose.test.yml logs -f

# 查看特定服务日志
docker compose -f docker-compose.test.yml logs postgres
docker compose -f docker-compose.test.yml logs redis
docker compose -f docker-compose.test.yml logs rabbitmq

# 停止服务
docker compose -f docker-compose.test.yml stop

# 停止并删除容器
docker compose -f docker-compose.test.yml down

# 停止并删除容器 + 数据卷（⚠️ 会删除所有测试数据）
docker compose -f docker-compose.test.yml down -v
```

## 🔧 调试命令

```bash
# 连接到测试数据库
docker exec -it notification-service-postgres-test psql -U test_user -d cloudphone_notification_test

# 查询通知表
docker exec -it notification-service-postgres-test psql -U test_user -d cloudphone_notification_test -c "SELECT id, user_id, title, status, created_at FROM notifications ORDER BY created_at DESC LIMIT 10;"

# 连接到 Redis
docker exec -it notification-service-redis-test redis-cli

# 查看 Redis 所有键
docker exec -it notification-service-redis-test redis-cli KEYS '*'

# 访问 RabbitMQ 管理界面
open http://localhost:15673  # 用户名: test_admin, 密码: test_password
```

## 📝 测试数据工厂

```typescript
import { TestDataFactory } from '../helpers/test-data.factory';

// 创建通知 DTO
const dto = TestDataFactory.createNotificationDto({
  userId: 'custom-user-id',
  title: 'Custom Title',
  type: NotificationCategory.DEVICE,
});

// 批量创建
const dtos = TestDataFactory.createMultipleNotifications(10, {
  userId: 'same-user'
});

// 生成随机 UUID
const userId = TestDataFactory.randomUserId();

// 创建事件
const event = TestDataFactory.createDeviceCreatedEvent({
  payload: { deviceName: 'Custom Device' }
});
```

## 🧪 测试模式

```typescript
describe('Your Test Suite', () => {
  let dataSource: DataSource;
  let repository;

  // 在所有测试前执行一次
  beforeAll(async () => {
    dataSource = await createTestDataSource();
    repository = dataSource.getRepository(YourEntity);
  });

  // 每个测试前执行
  beforeEach(async () => {
    await cleanDatabase(dataSource);  // 清空数据库
    jest.clearAllMocks();             // 清除 mock
  });

  // 在所有测试后执行一次
  afterAll(async () => {
    if (dataSource) await closeTestDataSource(dataSource);
  });

  it('should test something', async () => {
    // 测试代码
  });
});
```

## 📊 当前测试状态

```
✅ Redis 集成测试:          15/15 通过 (100%)
✅ Notifications 服务测试:   13/13 通过 (100%)
✅ RabbitMQ 集成测试:        10/10 通过 (100%)

总计: 38/38 通过 (100%) 🎉🎉🎉
```

### RabbitMQ 测试详情

**全部通过 (10/10):**
- ✅ 设备创建事件消费并保存到数据库
- ✅ 并发处理 5 个事件
- ✅ 优雅处理缺少可选字段的事件
- ✅ 失败重试并发送到 DLX
- ✅ 用户注册事件消费
- ✅ 计费低余额事件消费
- ✅ E2E 端到端事件流
- ✅ 高吞吐量消息处理 (50 个事件)
- ✅ 处理格式错误的事件数据
- ✅ 优雅处理数据库连接失败

**关键改进:**
- ✅ 使用 `pnpm test:integration:clean` 清空旧数据
- ✅ 修复清理脚本的服务名称问题

## 🎯 测试端口

| 服务 | 端口 | 用户名/密码 |
|------|------|------------|
| PostgreSQL | 5433 | test_user / test_password |
| Redis | 6380 | (无密码) |
| RabbitMQ AMQP | 5673 | test_admin / test_password |
| RabbitMQ 管理界面 | 15673 | test_admin / test_password |

## 🔗 相关文档

- [INTEGRATION_TEST_GUIDE.md](./INTEGRATION_TEST_GUIDE.md) - 完整使用指南
- [README.md](./README.md) - 详细文档（360+ 行）

---

**提示**: 第一次运行测试前，记得先执行 `pnpm install` 安装依赖！
