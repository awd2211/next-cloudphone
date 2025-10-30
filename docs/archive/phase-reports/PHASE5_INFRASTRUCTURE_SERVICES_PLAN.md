# Phase 5: Infrastructure Services Testing Plan

**日期**: 2025-10-30
**阶段**: Phase 5 - 基础设施服务测试
**预估时间**: 5-7 小时
**目标服务数**: 8-10 个核心服务

---

## 📋 Phase 5 概览

Phase 5 专注于测试项目的**基础设施层服务**，这些是支撑整个系统运行的关键组件。

### 阶段目标
- ✅ 为所有核心基础设施服务编写单元测试
- ✅ 确保数据库连接管理、消息队列、日志系统的可靠性
- ✅ 验证服务发现和配置管理的正确性
- ✅ 测试覆盖率达到 95%+

---

## 🎯 服务优先级分级

### CRITICAL 优先级 (P0)

#### 1. DatabaseConnectionService
**文件**: `backend/user-service/src/common/services/database-connection.service.ts`
**优先级**: ⚠️ CRITICAL
**功能**: 数据库连接池管理和健康检查
**预估测试数**: 15-18
**关键测试场景**:
- 连接池初始化和配置
- 连接健康检查（心跳）
- 连接重试和故障恢复
- 连接池统计信息
- 慢查询检测和日志
- 连接泄漏检测

#### 2. EventBusService (@cloudphone/shared)
**文件**: `backend/shared/src/events/event-bus.service.ts`
**优先级**: ⚠️ CRITICAL
**功能**: RabbitMQ 事件发布（微服务通信核心）
**预估测试数**: 20-25
**关键测试场景**:
- RabbitMQ 连接管理
- 事件发布（单条、批量）
- 事件发布失败重试
- 事件序列化和反序列化
- 确认机制（publisher confirms）
- 死信队列（DLX）处理
- 连接断开重连
- 事件发布性能（批量优化）

---

### HIGH 优先级 (P1)

#### 3. LoggerService
**文件**: `backend/user-service/src/common/services/logger.service.ts`
**优先级**: 🔴 HIGH
**功能**: 统一日志服务（基于 Pino）
**预估测试数**: 12-15
**关键测试场景**:
- 不同级别日志输出（debug/info/warn/error）
- 结构化日志格式验证
- 上下文信息追加（userId, tenantId, requestId）
- 日志级别动态调整
- 日志性能（异步写入）
- 敏感信息过滤（密码、token）

#### 4. HttpClientService (@cloudphone/shared)
**文件**: `backend/shared/src/http/http-client.service.ts`
**优先级**: 🔴 HIGH
**功能**: HTTP 客户端封装（服务间调用）
**预估测试数**: 18-22
**关键测试场景**:
- GET/POST/PUT/DELETE 请求
- 请求超时处理
- 请求重试（可配置）
- 请求拦截器（添加 token）
- 响应拦截器（错误处理）
- 请求取消（AbortController）
- 并发请求限制
- 请求日志记录

#### 5. RedisLockService
**文件**: `backend/user-service/src/common/services/redis-lock.service.ts`
**优先级**: 🔴 HIGH
**功能**: 分布式锁实现（Redis）
**预估测试数**: 15-18
**关键测试场景**:
- 锁的获取和释放
- 锁超时自动释放
- 锁重入（可重入锁）
- 锁等待和轮询
- 死锁检测
- 锁的延期（锁续期）
- 并发锁竞争

---

### MEDIUM 优先级 (P2)

#### 6. ConsulService (@cloudphone/shared)
**文件**: `backend/shared/src/consul/consul.service.ts`
**优先级**: 🟡 MEDIUM
**功能**: Consul 服务注册和发现
**预估测试数**: 12-15
**关键测试场景**:
- 服务注册（register）
- 服务注销（deregister）
- 服务健康检查注册
- 服务发现（查询服务列表）
- 配置获取（KV store）
- 配置变更监听
- 服务元数据管理

#### 7. ConfigService
**文件**: `backend/user-service/src/common/services/config.service.ts`
**优先级**: 🟡 MEDIUM
**功能**: 配置管理和热更新
**预估测试数**: 10-12
**关键测试场景**:
- 配置加载（.env 文件）
- 环境变量覆盖
- 配置验证（Joi schema）
- 配置缓存
- 配置热更新（Consul watch）
- 配置敏感信息加密

#### 8. HealthCheckService
**文件**: `backend/user-service/src/common/services/health-check.service.ts`
**优先级**: 🟡 MEDIUM
**功能**: 健康检查聚合
**预估测试数**: 15-18
**关键测试场景**:
- 数据库健康检查
- Redis 健康检查
- RabbitMQ 健康检查
- 外部服务健康检查
- 健康状态聚合（overall status）
- 健康检查超时处理
- 降级策略（部分不健康时）

---

### LOW 优先级 (P3) - 可选

#### 9. MetricsService
**文件**: `backend/device-service/src/metrics/metrics.service.ts`
**优先级**: 🟢 LOW
**功能**: Prometheus 指标采集
**预估测试数**: 10-12
**关键测试场景**:
- Counter 指标增加
- Gauge 指标设置
- Histogram 指标记录
- 自定义标签添加
- 指标导出格式验证

#### 10. SchedulerService
**文件**: `backend/user-service/src/common/services/scheduler.service.ts`
**优先级**: 🟢 LOW
**功能**: Cron 任务调度（基于 node-cron）
**预估测试数**: 8-10
**关键测试场景**:
- Cron 任务注册
- Cron 任务执行
- Cron 任务取消
- 任务执行日志
- 任务执行错误处理

---

## 📊 Phase 5 统计预估

### 数量预估
| 优先级 | 服务数 | 预估测试数 | 预估时间 |
|--------|--------|-----------|---------|
| CRITICAL | 2 | 35-43 | 2-3 小时 |
| HIGH | 3 | 45-55 | 2-3 小时 |
| MEDIUM | 3 | 37-45 | 1.5-2 小时 |
| LOW | 2 | 18-22 | 1 小时 |
| **总计** | **10** | **135-165** | **6.5-9 小时** |

### 保守估计（仅 P0 + P1）
- 服务数: 5
- 测试数: 80-98
- 预估时间: 4-6 小时

---

## 🔑 关键测试模式

### 1. 连接池测试模式

```typescript
describe('DatabaseConnectionService', () => {
  it('应该成功获取连接', async () => {
    const connection = await service.getConnection();
    expect(connection).toBeDefined();
    expect(connection.isConnected).toBe(true);
  });

  it('应该在连接失败时重试', async () => {
    mockDataSource.initialize
      .mockRejectedValueOnce(new Error('Connection failed'))
      .mockResolvedValueOnce(mockDataSource);

    await service.connect();

    expect(mockDataSource.initialize).toHaveBeenCalledTimes(2);
  });

  it('应该检测连接泄漏', async () => {
    // 获取所有连接但不释放
    for (let i = 0; i < 10; i++) {
      await service.getConnection();
    }

    const stats = service.getPoolStats();
    expect(stats.activeConnections).toBe(10);
    expect(stats.warnings).toContain('Connection leak detected');
  });
});
```

### 2. 事件总线测试模式

```typescript
describe('EventBusService', () => {
  it('应该成功发布事件', async () => {
    const event = { type: 'device.created', data: { deviceId: '123' } };

    await service.publish('cloudphone.events', 'device.created', event);

    expect(mockChannel.publish).toHaveBeenCalledWith(
      'cloudphone.events',
      'device.created',
      Buffer.from(JSON.stringify(event)),
      expect.objectContaining({ persistent: true }),
    );
  });

  it('应该在发布失败时重试', async () => {
    mockChannel.publish
      .mockReturnValueOnce(false) // First attempt fails
      .mockReturnValueOnce(true); // Second attempt succeeds

    await service.publish('cloudphone.events', 'device.created', event);

    expect(mockChannel.publish).toHaveBeenCalledTimes(2);
  });

  it('应该处理连接断开重连', async () => {
    // Simulate connection close
    const closeHandler = mockConnection.on.mock.calls.find(
      call => call[0] === 'close'
    )?.[1];

    closeHandler();

    // Wait for reconnection
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(amqp.connect).toHaveBeenCalledTimes(2); // Initial + reconnect
  });
});
```

### 3. 分布式锁测试模式

```typescript
describe('RedisLockService', () => {
  it('应该成功获取锁', async () => {
    mockRedis.set.mockResolvedValue('OK');

    const acquired = await service.acquireLock('resource:123', 5000);

    expect(acquired).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith(
      'lock:resource:123',
      expect.any(String),
      'PX',
      5000,
      'NX',
    );
  });

  it('应该在锁被占用时等待', async () => {
    mockRedis.set
      .mockResolvedValueOnce(null) // Lock is held
      .mockResolvedValueOnce(null) // Still held
      .mockResolvedValueOnce('OK'); // Lock acquired

    const acquired = await service.acquireLock('resource:123', 5000, {
      retryDelay: 100,
      retryTimes: 3,
    });

    expect(acquired).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledTimes(3);
  });

  it('应该自动续期锁', async () => {
    jest.useFakeTimers();
    const lockId = await service.acquireLock('resource:123', 5000);

    // Advance 3 seconds (60% of TTL)
    jest.advanceTimersByTime(3000);

    expect(mockRedis.pexpire).toHaveBeenCalledWith('lock:resource:123', 5000);
    jest.useRealTimers();
  });
});
```

### 4. HTTP 客户端测试模式

```typescript
describe('HttpClientService', () => {
  it('应该发送 GET 请求', async () => {
    const mockResponse = { data: { id: '123' }, status: 200 };
    mockAxios.get.mockResolvedValue(mockResponse);

    const result = await service.get('http://example.com/api/users/123');

    expect(mockAxios.get).toHaveBeenCalledWith(
      'http://example.com/api/users/123',
      expect.any(Object),
    );
    expect(result).toEqual(mockResponse.data);
  });

  it('应该在请求失败时重试', async () => {
    mockAxios.get
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ data: { id: '123' }, status: 200 });

    const result = await service.get('http://example.com/api/users/123', {
      retryTimes: 3,
    });

    expect(mockAxios.get).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ id: '123' });
  });

  it('应该添加认证 token', async () => {
    service.setAuthToken('Bearer abc123');

    await service.get('http://example.com/api/users/123');

    expect(mockAxios.get).toHaveBeenCalledWith(
      'http://example.com/api/users/123',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer abc123',
        }),
      }),
    );
  });
});
```

---

## 💡 关键测试要点

### 1. 连接管理测试
- ✅ 连接初始化和配置
- ✅ 连接健康检查和心跳
- ✅ 连接失败重试和指数退避
- ✅ 连接池统计和监控
- ✅ 连接泄漏检测
- ✅ 连接优雅关闭

### 2. 错误处理测试
- ✅ 网络错误（ECONNREFUSED, ETIMEDOUT）
- ✅ 超时错误（请求超时、连接超时）
- ✅ 认证错误（401, 403）
- ✅ 业务错误（4xx, 5xx）
- ✅ 序列化错误（JSON parse error）

### 3. 重试机制测试
- ✅ 固定延迟重试
- ✅ 指数退避重试
- ✅ 最大重试次数限制
- ✅ 可重试错误判断
- ✅ 重试日志记录

### 4. 性能测试
- ✅ 并发请求处理
- ✅ 批量操作优化
- ✅ 连接池复用
- ✅ 响应时间监控

### 5. 安全测试
- ✅ 敏感信息过滤（日志）
- ✅ Token 注入和刷新
- ✅ 请求签名验证
- ✅ HTTPS 强制

---

## 📝 实施计划

### 第一阶段：P0 服务（2-3 小时）
1. DatabaseConnectionService (15-18 tests)
2. EventBusService (20-25 tests)

### 第二阶段：P1 服务（2-3 小时）
3. LoggerService (12-15 tests)
4. HttpClientService (18-22 tests)
5. RedisLockService (15-18 tests)

### 第三阶段：P2 服务（1.5-2 小时）- 可选
6. ConsulService (12-15 tests)
7. ConfigService (10-12 tests)
8. HealthCheckService (15-18 tests)

### 第四阶段：P3 服务（1 小时）- 可选
9. MetricsService (10-12 tests)
10. SchedulerService (8-10 tests)

---

## 🎯 成功标准

- ✅ 所有 P0 + P1 服务测试完成（5 个服务）
- ✅ 测试通过率 ≥ 95%
- ✅ 核心逻辑覆盖率 100%
- ✅ 所有测试独立运行无依赖
- ✅ Mock 使用合理，无真实外部调用
- ✅ 测试命名清晰，使用中文描述
- ✅ AAA 模式一致性

---

## 📈 预期成果

完成 Phase 5 后，累计成果：

- **总服务数**: 23-28 (Phase 2-5)
- **总测试数**: 515-600
- **整体通过率**: ≥ 96%
- **测试代码**: ~24,000-28,000 行
- **累计投入**: ~18-24 小时

**核心价值**: 为整个平台的基础设施提供了全面的测试保障，确保系统稳定性和可靠性！🏗️

---

**文档创建日期**: 2025-10-30
**Phase 5 状态**: 📋 计划中 → 准备开始实施
