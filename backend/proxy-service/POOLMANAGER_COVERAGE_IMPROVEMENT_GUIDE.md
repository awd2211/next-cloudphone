# PoolManager 覆盖率改进指南

> 当前覆盖率: 54.54% (语句) / 24.35% (分支)
> 目标覆盖率: 70%+

## 未覆盖代码分析

### 1. 从池中选择代理的路径 (77-85行)

**问题**: 当前测试中池始终为空，所以总是走"从供应商获取"的路径

**未覆盖代码**:
```typescript
const selectedProxy = this.selectProxyByStrategy(availableProxies);
selectedProxy.inUse = true;
selectedProxy.lastUsed = new Date();
this.logger.debug(`Proxy acquired from pool: ${selectedProxy.id} (${selectedProxy.provider})`);
return selectedProxy;
```

**改进方案**:
```typescript
describe('getProxy - 从池中选择', () => {
  it('应该从池中选择可用代理', async () => {
    // 预先往池中添加代理
    const mockProxy = {
      id: 'pool-proxy-1',
      host: 'proxy.pool.com',
      port: 8080,
      protocol: 'http' as const,
      provider: 'iproyal',
      location: { country: 'US' },
      quality: 95,
      latency: 100,
      inUse: false,
      costPerGB: 10,
      createdAt: new Date(),
    };

    // 使用反射直接添加到池中
    service['proxyPool'].set(mockProxy.id, mockProxy);

    const criteria: ProxyCriteria = {
      country: 'US',
    };

    const proxy = await service.getProxy(criteria);

    expect(proxy).toBeDefined();
    expect(proxy.id).toBe('pool-proxy-1');
    expect(proxy.inUse).toBe(true);
    expect(proxy.lastUsed).toBeInstanceOf(Date);
  });
});
```

### 2. markProxyFailed 方法 (128-163行)

**未覆盖功能**:
- 增加失败计数
- 降低质量分数
- 失败5次后从池中移除
- 记录使用失败

**改进方案**:
```typescript
describe('markProxyFailed - 标记代理失败', () => {
  let mockProxy: ProxyInfo;

  beforeEach(() => {
    mockProxy = {
      id: 'test-proxy-1',
      host: 'proxy.test.com',
      port: 8080,
      protocol: 'http',
      provider: 'iproyal',
      location: { country: 'US' },
      quality: 95,
      latency: 100,
      inUse: true,
      costPerGB: 10,
      createdAt: new Date(),
      failureCount: 0,
    };

    service['proxyPool'].set(mockProxy.id, mockProxy);
  });

  it('应该增加失败计数', async () => {
    await service.markProxyFailed('test-proxy-1', new Error('Test error'));

    const proxy = service['proxyPool'].get('test-proxy-1');
    expect(proxy.failureCount).toBe(1);
  });

  it('应该降低质量分数', async () => {
    await service.markProxyFailed('test-proxy-1', new Error('Test error'));

    const proxy = service['proxyPool'].get('test-proxy-1');
    expect(proxy.quality).toBe(75); // 95 - 20
  });

  it('应该将代理标记为可用', async () => {
    await service.markProxyFailed('test-proxy-1', new Error('Test error'));

    const proxy = service['proxyPool'].get('test-proxy-1');
    expect(proxy.inUse).toBe(false);
  });

  it('失败5次后应该从池中移除', async () => {
    // 模拟4次失败
    for (let i = 0; i < 4; i++) {
      await service.markProxyFailed('test-proxy-1', new Error('Test error'));
    }

    expect(service['proxyPool'].has('test-proxy-1')).toBe(true);

    // 第5次失败
    await service.markProxyFailed('test-proxy-1', new Error('Test error'));

    expect(service['proxyPool'].has('test-proxy-1')).toBe(false);
  });

  it('应该记录使用失败', async () => {
    const recordUsageSpy = jest.spyOn(service as any, 'recordUsage');

    await service.markProxyFailed('test-proxy-1', new Error('Test error'), 100);

    expect(recordUsageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'test-proxy-1' }),
      false,
      100
    );
  });
});
```

### 3. reportProxySuccess 方法 (168-188行)

**未覆盖功能**:
- 重置失败计数
- 提升质量分数
- 记录使用成功

**改进方案**:
```typescript
describe('reportProxySuccess - 报告代理成功', () => {
  let mockProxy: ProxyInfo;

  beforeEach(() => {
    mockProxy = {
      id: 'test-proxy-1',
      host: 'proxy.test.com',
      port: 8080,
      protocol: 'http',
      provider: 'iproyal',
      location: { country: 'US' },
      quality: 80,
      latency: 100,
      inUse: true,
      costPerGB: 10,
      createdAt: new Date(),
      failureCount: 3,
    };

    service['proxyPool'].set(mockProxy.id, mockProxy);
  });

  it('应该重置失败计数', async () => {
    await service.reportProxySuccess('test-proxy-1', 50);

    const proxy = service['proxyPool'].get('test-proxy-1');
    expect(proxy.failureCount).toBe(0);
  });

  it('应该提升质量分数', async () => {
    await service.reportProxySuccess('test-proxy-1', 50);

    const proxy = service['proxyPool'].get('test-proxy-1');
    expect(proxy.quality).toBe(85); // 80 + 5
  });

  it('质量分数不应超过100', async () => {
    const highQualityProxy = { ...mockProxy, quality: 98 };
    service['proxyPool'].set('high-quality', highQualityProxy);

    await service.reportProxySuccess('high-quality', 50);

    const proxy = service['proxyPool'].get('high-quality');
    expect(proxy.quality).toBe(100); // 不超过100
  });

  it('应该记录使用成功', async () => {
    const recordUsageSpy = jest.spyOn(service as any, 'recordUsage');

    await service.reportProxySuccess('test-proxy-1', 50);

    expect(recordUsageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'test-proxy-1' }),
      true,
      50
    );
  });
});
```

### 4. 负载均衡策略实现 (392-449行)

**未覆盖的策略**:
- ROUND_ROBIN (轮询)
- QUALITY_BASED (基于质量)
- COST_OPTIMIZED (成本优化)
- LEAST_CONNECTIONS (最少连接)

**改进方案**:
```typescript
describe('负载均衡策略 - 实际效果测试', () => {
  let proxies: ProxyInfo[];

  beforeEach(() => {
    proxies = [
      {
        id: 'proxy-1',
        host: 'p1.test.com',
        port: 8080,
        protocol: 'http',
        provider: 'iproyal',
        location: { country: 'US' },
        quality: 90,
        latency: 50,
        inUse: false,
        costPerGB: 15,
        createdAt: new Date('2025-01-01'),
        lastUsed: new Date('2025-01-01'),
      },
      {
        id: 'proxy-2',
        host: 'p2.test.com',
        port: 8080,
        protocol: 'http',
        provider: 'brightdata',
        location: { country: 'US' },
        quality: 95,
        latency: 30,
        inUse: false,
        costPerGB: 10,
        createdAt: new Date('2025-01-02'),
        lastUsed: new Date('2025-01-02'),
      },
      {
        id: 'proxy-3',
        host: 'p3.test.com',
        port: 8080,
        protocol: 'http',
        provider: 'oxylabs',
        location: { country: 'US' },
        quality: 85,
        latency: 40,
        inUse: false,
        costPerGB: 12,
        createdAt: new Date('2025-01-03'),
        lastUsed: new Date('2025-01-03'),
      },
    ];

    // 添加到池中
    proxies.forEach(proxy => {
      service['proxyPool'].set(proxy.id, proxy);
    });
  });

  describe('ROUND_ROBIN 策略', () => {
    beforeEach(() => {
      service.setLoadBalancingStrategy(LoadBalancingStrategy.ROUND_ROBIN);
    });

    it('应该按顺序轮询选择代理', async () => {
      const proxy1 = await service.getProxy({ country: 'US' });
      const proxy2 = await service.getProxy({ country: 'US' });
      const proxy3 = await service.getProxy({ country: 'US' });
      const proxy4 = await service.getProxy({ country: 'US' });

      // 验证轮询顺序
      expect(proxy1.id).not.toBe(proxy2.id);
      expect(proxy2.id).not.toBe(proxy3.id);
      expect(proxy4.id).toBe(proxy1.id); // 第4次应该回到第1个
    });
  });

  describe('QUALITY_BASED 策略', () => {
    beforeEach(() => {
      service.setLoadBalancingStrategy(LoadBalancingStrategy.QUALITY_BASED);
    });

    it('应该选择质量最高的代理', async () => {
      const proxy = await service.getProxy({ country: 'US' });

      expect(proxy.id).toBe('proxy-2'); // quality=95 是最高的
      expect(proxy.quality).toBe(95);
    });
  });

  describe('COST_OPTIMIZED 策略', () => {
    beforeEach(() => {
      service.setLoadBalancingStrategy(LoadBalancingStrategy.COST_OPTIMIZED);
    });

    it('应该选择成本最低的代理', async () => {
      const proxy = await service.getProxy({ country: 'US' });

      expect(proxy.id).toBe('proxy-2'); // costPerGB=10 是最低的
      expect(proxy.costPerGB).toBe(10);
    });
  });

  describe('LEAST_CONNECTIONS 策略', () => {
    beforeEach(() => {
      service.setLoadBalancingStrategy(LoadBalancingStrategy.LEAST_CONNECTIONS);
    });

    it('应该选择最近最少使用的代理', async () => {
      const proxy = await service.getProxy({ country: 'US' });

      expect(proxy.id).toBe('proxy-1'); // lastUsed 最早
    });

    it('应该在使用后更新 lastUsed', async () => {
      const proxy = await service.getProxy({ country: 'US' });

      expect(proxy.lastUsed).toBeInstanceOf(Date);
      expect(proxy.lastUsed.getTime()).toBeGreaterThan(new Date('2025-01-01').getTime());
    });
  });
});
```

### 5. matchesCriteria 方法的分支覆盖 (345-387行)

**未覆盖的筛选条件**:
- 城市匹配
- 最小质量分数
- 最大延迟
- 最大成本
- 指定供应商

**改进方案**:
```typescript
describe('matchesCriteria - 代理筛选', () => {
  let proxies: ProxyInfo[];

  beforeEach(() => {
    proxies = [
      {
        id: 'proxy-us-ny-high',
        host: 'proxy1.test.com',
        port: 8080,
        protocol: 'http',
        provider: 'iproyal',
        location: { country: 'US', city: 'New York' },
        quality: 95,
        latency: 30,
        inUse: false,
        costPerGB: 15,
        createdAt: new Date(),
      },
      {
        id: 'proxy-us-la-low',
        host: 'proxy2.test.com',
        port: 8080,
        protocol: 'http',
        provider: 'brightdata',
        location: { country: 'US', city: 'Los Angeles' },
        quality: 70,
        latency: 100,
        inUse: false,
        costPerGB: 20,
        createdAt: new Date(),
      },
      {
        id: 'proxy-uk-high',
        host: 'proxy3.test.com',
        port: 8080,
        protocol: 'socks5',
        provider: 'oxylabs',
        location: { country: 'UK' },
        quality: 90,
        latency: 50,
        inUse: false,
        costPerGB: 12,
        createdAt: new Date(),
      },
    ];

    proxies.forEach(p => service['proxyPool'].set(p.id, p));
  });

  it('应该根据城市筛选', async () => {
    const proxy = await service.getProxy({
      country: 'US',
      city: 'New York',
    });

    expect(proxy.location.city).toBe('New York');
  });

  it('应该根据最小质量分数筛选', async () => {
    const proxy = await service.getProxy({
      country: 'US',
      minQuality: 90,
    });

    expect(proxy.quality).toBeGreaterThanOrEqual(90);
    expect(proxy.id).toBe('proxy-us-ny-high');
  });

  it('应该根据最大延迟筛选', async () => {
    const proxy = await service.getProxy({
      country: 'US',
      maxLatency: 50,
    });

    expect(proxy.latency).toBeLessThanOrEqual(50);
    expect(proxy.id).toBe('proxy-us-ny-high');
  });

  it('应该根据最大成本筛选', async () => {
    const proxy = await service.getProxy({
      country: 'US',
      maxCostPerGB: 16,
    });

    expect(proxy.costPerGB).toBeLessThanOrEqual(16);
    expect(proxy.id).toBe('proxy-us-ny-high');
  });

  it('应该根据指定供应商筛选', async () => {
    const proxy = await service.getProxy({
      provider: 'oxylabs',
    });

    expect(proxy.provider).toBe('oxylabs');
    expect(proxy.id).toBe('proxy-uk-high');
  });

  it('应该组合多个筛选条件', async () => {
    const proxy = await service.getProxy({
      country: 'US',
      minQuality: 90,
      maxLatency: 50,
      protocol: 'http',
    });

    expect(proxy.location.country).toBe('US');
    expect(proxy.quality).toBeGreaterThanOrEqual(90);
    expect(proxy.latency).toBeLessThanOrEqual(50);
    expect(proxy.protocol).toBe('http');
  });
});
```

## 实施步骤

### 步骤1: 创建测试辅助方法

```typescript
// 在 pool-manager.service.spec.ts 中添加
function createMockProxies(count: number): ProxyInfo[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `proxy-${i + 1}`,
    host: `proxy${i + 1}.test.com`,
    port: 8080,
    protocol: 'http' as const,
    provider: ['iproyal', 'brightdata', 'oxylabs'][i % 3],
    location: { country: 'US', city: i % 2 === 0 ? 'New York' : 'Los Angeles' },
    quality: 70 + i * 5,
    latency: 30 + i * 10,
    inUse: false,
    costPerGB: 10 + i * 2,
    createdAt: new Date(),
    failureCount: 0,
  }));
}

function addProxiesToPool(service: ProxyPoolManager, proxies: ProxyInfo[]): void {
  proxies.forEach(proxy => {
    service['proxyPool'].set(proxy.id, proxy);
  });
}
```

### 步骤2: 添加测试套件

按照上述示例，依次添加：
1. 从池中选择代理的测试
2. markProxyFailed 测试
3. reportProxySuccess 测试
4. 负载均衡策略测试
5. 筛选条件测试

### 步骤3: 运行测试并验证覆盖率

```bash
pnpm test pool-manager.service.spec.ts
pnpm test:cov

# 期望结果:
# - 测试数量: 30 → 60+
# - 语句覆盖率: 54.54% → 75%+
# - 分支覆盖率: 24.35% → 65%+
```

## 预期提升

实施上述改进后，预期覆盖率提升：

| 指标 | 当前 | 目标 | 提升 |
|------|------|------|------|
| 语句覆盖率 | 54.54% | 75%+ | +20% |
| 分支覆盖率 | 24.35% | 65%+ | +40% |
| 函数覆盖率 | 57.57% | 85%+ | +27% |
| 测试数量 | 30 | 65+ | +35 |

## 注意事项

1. **私有方法访问**: 使用 TypeScript 的 `service['privateMethod']` 语法访问私有方法和属性

2. **异步处理**: 所有涉及数据库或外部调用的方法都需要 `await` 和适当的 mock

3. **时间相关测试**: 使用 `jest.useFakeTimers()` 控制时间，确保测试稳定性

4. **清理工作**: 在 `afterEach` 中清理 proxyPool，避免测试间相互影响

5. **Mock Repository**: 确保 mock 了 ProxyUsageRepository 和 ProxyHealthRepository

## 总结

完成这些测试后，PoolManager 将达到生产级别的测试覆盖率，所有核心功能和边缘情况都将得到验证。这不仅提高了代码质量，还为未来的重构和功能扩展提供了安全保障。

---

**文档创建时间**: 2025-11-02
**当前PoolManager覆盖率**: 54.54%
**目标覆盖率**: 75%+
**预计新增测试**: 35+
