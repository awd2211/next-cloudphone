# Phase 4: 缓存与性能服务测试 - 计划

**日期**: 2025-10-30
**状态**: 🚀 **准备开始**

---

## 📋 Phase 4 目标

专注于 **缓存、性能优化、监控** 相关的服务测试，这些服务对系统性能和稳定性至关重要。

---

## 🎯 待测试服务清单

### 高优先级服务 (HIGH)

| # | 服务 | 文件路径 | 预估测试 | 重要性 | 状态 |
|---|------|---------|----------|--------|------|
| 1 | CacheService | `cache/cache.service.ts` | 15-18 | HIGH | ⏸️ |
| 2 | CacheWarmupService | `cache/cache-warmup.service.ts` | 12-15 | HIGH | ⏸️ |
| 3 | QueryOptimizationService | `common/services/query-optimization.service.ts` | 15-18 | HIGH | ⏸️ |
| 4 | CircuitBreakerService | `common/services/circuit-breaker.service.ts` | 12-15 | HIGH | ⏸️ |

### 中优先级服务 (MEDIUM)

| # | 服务 | 文件路径 | 预估测试 | 重要性 | 状态 |
|---|------|---------|----------|--------|------|
| 5 | DatabaseMonitorService | `common/services/database-monitor.service.ts` | 10-12 | MEDIUM | ⏸️ |
| 6 | UserMetricsService | `common/metrics/user-metrics.service.ts` | 8-10 | MEDIUM | ⏸️ |
| 7 | PartitionManagerService | `common/services/partition-manager.service.ts` | 10-12 | MEDIUM | ⏸️ |

### 低优先级服务 (OPTIONAL)

| # | 服务 | 文件路径 | 预估测试 | 重要性 | 状态 |
|---|------|---------|----------|--------|------|
| 8 | TracingService | `common/tracing/tracing.service.ts` | 8-10 | LOW | ⏸️ |
| 9 | HealthCheckService | `common/services/health-check.service.ts` | 10-12 | LOW | ⏸️ |

---

## 📊 预估工作量

| 优先级 | 服务数 | 预估测试 | 预估时间 |
|--------|--------|----------|----------|
| HIGH | 4 | 54-66 | 2-3 小时 |
| MEDIUM | 3 | 28-34 | 1.5-2 小时 |
| LOW | 2 | 18-22 | 1-1.5 小时 |
| **总计** | **9** | **100-122** | **4.5-6.5 小时** |

---

## 🔍 服务功能预览

### 1. CacheService
**功能**: Redis 缓存操作封装
- `get(key)` - 获取缓存
- `set(key, value, ttl)` - 设置缓存
- `del(key)` - 删除缓存
- `exists(key)` - 检查存在
- `expire(key, ttl)` - 设置过期
- `keys(pattern)` - 模式匹配
- `flush()` - 清空缓存

**测试场景**:
- ✅ 基本 CRUD 操作
- ✅ TTL 过期处理
- ✅ 批量操作
- ✅ 模式匹配
- ✅ 错误处理（Redis 连接失败）

---

### 2. CacheWarmupService
**功能**: 缓存预热策略
- `warmupUserPermissions()` - 预热用户权限
- `warmupActiveUsers()` - 预热活跃用户
- `warmupSystemConfig()` - 预热系统配置
- `scheduledWarmup()` - 定时预热

**测试场景**:
- ✅ 预热策略执行
- ✅ 批量数据加载
- ✅ 错误恢复
- ✅ 并发预热
- ✅ 预热优先级

---

### 3. QueryOptimizationService
**功能**: 查询优化与分析
- `analyzeQuery(sql)` - 分析查询性能
- `suggestIndexes(table)` - 建议索引
- `optimizeQuery(query)` - 优化查询
- `detectSlowQueries()` - 检测慢查询

**测试场景**:
- ✅ 查询分析
- ✅ 索引建议
- ✅ 慢查询检测
- ✅ 查询重写
- ✅ 性能指标收集

---

### 4. CircuitBreakerService
**功能**: 熔断器模式实现
- `execute(fn)` - 执行受保护的函数
- `getState()` - 获取熔断器状态
- `reset()` - 重置熔断器
- `halfOpen()` - 半开状态
- `recordSuccess()` / `recordFailure()` - 记录结果

**测试场景**:
- ✅ 正常执行
- ✅ 失败计数
- ✅ 熔断触发（OPEN）
- ✅ 半开尝试（HALF_OPEN）
- ✅ 自动恢复（CLOSED）
- ✅ 超时处理

---

### 5. DatabaseMonitorService
**功能**: 数据库监控
- `getConnectionStats()` - 连接池统计
- `getQueryStats()` - 查询统计
- `detectDeadlocks()` - 检测死锁
- `checkReplicationLag()` - 检查复制延迟

**测试场景**:
- ✅ 连接池监控
- ✅ 查询性能统计
- ✅ 死锁检测
- ✅ 复制延迟监控
- ✅ 告警触发

---

### 6. UserMetricsService
**功能**: 用户指标收集
- `trackUserLogin(userId)` - 记录登录
- `trackUserActivity(userId, action)` - 记录活动
- `getUserStats(userId)` - 获取用户统计
- `getActiveUsers(timeRange)` - 获取活跃用户

**测试场景**:
- ✅ 指标记录
- ✅ 统计计算
- ✅ 活跃用户查询
- ✅ 时间范围过滤
- ✅ 指标聚合

---

### 7. PartitionManagerService
**功能**: 数据库分区管理
- `createPartition(table, range)` - 创建分区
- `dropPartition(table, partition)` - 删除分区
- `listPartitions(table)` - 列出分区
- `maintainPartitions()` - 维护分区

**测试场景**:
- ✅ 分区创建
- ✅ 分区删除
- ✅ 分区查询
- ✅ 自动维护
- ✅ 数据迁移

---

## 🎯 测试策略

### 1. 缓存服务测试重点
- Redis 操作的正确性
- TTL 过期机制
- 错误处理（连接失败、超时）
- 并发安全性

### 2. 性能监控测试重点
- 指标收集的准确性
- 统计计算的正确性
- 告警阈值触发
- 数据聚合效率

### 3. 熔断器测试重点
- 状态转换的正确性（CLOSED → OPEN → HALF_OPEN → CLOSED）
- 失败计数准确性
- 超时处理
- 自动恢复机制

### 4. Mock 策略
```typescript
// Redis mock
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  expire: jest.fn(),
  keys: jest.fn(),
};

// Database monitor mock
const mockDataSource = {
  driver: {
    poolSize: 10,
    activeConnections: 5,
  },
  createQueryRunner: jest.fn(),
};
```

---

## 📈 预期成果

完成 Phase 4 后：
- ✅ 4-9 个性能关键服务测试完成
- ✅ 100-122 个新测试用例
- ✅ 缓存、监控、优化系统全面验证
- ✅ 性能瓶颈检测机制验证
- ✅ 熔断保护机制验证

**累计成果 (Phase 2 + 3 + 4)**:
- 服务数: 18-23
- 测试用例: 447-469
- 测试代码: ~22,000-25,000 行

---

## 🚀 开始顺序建议

### 第一批 (核心缓存，2小时)
1. CacheService
2. CacheWarmupService

### 第二批 (性能优化，1.5小时)
3. QueryOptimizationService
4. CircuitBreakerService

### 第三批 (监控指标，1.5-2小时)
5. DatabaseMonitorService
6. UserMetricsService
7. PartitionManagerService

### 第四批 (可选，1-1.5小时)
8. TracingService
9. HealthCheckService

---

## 💡 关键测试模式

### 缓存测试模式
```typescript
describe('CacheService', () => {
  it('应该正确设置和获取缓存', async () => {
    // Arrange
    const key = 'test:key';
    const value = { data: 'test' };

    // Act
    await service.set(key, value, 60);
    const result = await service.get(key);

    // Assert
    expect(result).toEqual(value);
  });

  it('应该在TTL过期后返回null', async () => {
    // 使用 jest.useFakeTimers() 测试TTL
    jest.useFakeTimers();
    await service.set(key, value, 1);
    jest.advanceTimersByTime(2000);

    expect(await service.get(key)).toBeNull();
  });
});
```

### 熔断器测试模式
```typescript
describe('CircuitBreakerService', () => {
  it('应该在连续失败后打开熔断器', async () => {
    // Arrange
    const failingFn = jest.fn().mockRejectedValue(new Error('Fail'));

    // Act - 连续失败5次
    for (let i = 0; i < 5; i++) {
      await expect(service.execute(failingFn)).rejects.toThrow();
    }

    // Assert - 熔断器应该打开
    expect(service.getState()).toBe('OPEN');
  });
});
```

---

**计划日期**: 2025-10-30
**预估完成时间**: 4.5-6.5 小时
**建议开始**: 立即开始第一批（CacheService + CacheWarmupService）

