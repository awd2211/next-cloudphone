# Billing Service 测试覆盖率提升计划

## 📊 当前状态总结

### 整体覆盖率
```
当前覆盖率：23.86% (语句), 19.87% (分支), 19.72% (函数), 23.73% (行)
目标覆盖率：70%
需要提升：46.14%
测试状态：  106/106 测试通过 ✅ (修复了之前的 28 个失败测试)
```

### 修复成果 🎉
1. **balance.service.spec.ts**: 修复 27 个失败测试
   - 问题：CacheService 依赖未 mock
   - 解决：添加完整的 CacheService mock，包括关键的 `wrap()` 方法
   - 结果：balance.service.ts 覆盖率达到 **93.4%** ✅

2. **payments.service.spec.ts**: 修复 1 个失败测试
   - 问题：ordersRepository.update 方法缺失
   - 解决：添加 `update` mock 返回 `{ affected: 1 }`
   - 问题2：测试期望错误（期望 save，实际用 update）
   - 解决：修改测试断言为 `expect(ordersRepository.update).toHaveBeenCalledWith(...)`
   - 结果：19/19 payments 测试通过 ✅

## 📈 模块覆盖率详细分析

### ✅ 优秀覆盖率 (>90%)
| 文件 | 覆盖率 | 状态 |
|------|--------|------|
| balance.service.ts | 93.4% | ✅ 优秀 |
| invoices.service.ts | 91.75% | ✅ 优秀 |
| pricing-engine.service.ts | 97.43% | ✅ 优秀 |
| purchase-plan-v2.saga.ts | 98.59% | ✅ 优秀 |

### 🟡 良好覆盖率 (50-90%)
| 文件 | 覆盖率 | 缺口 |
|------|--------|------|
| metering.service.ts | 69.59% | 未覆盖：48-171,290,325,327,363,365,407,438 |

### ❌ 需要重点改进 (0-50%)
| 模块 | 覆盖率 | 优先级 | 预计收益 |
|------|--------|--------|----------|
| payments.service.ts | 33.54% | **P0** | ⭐⭐⭐⭐⭐ |
| payments/providers/* | 7.37% | **P0** | ⭐⭐⭐⭐ |
| payments/clients/balance-client.service.ts | 14.28% | P1 | ⭐⭐⭐ |
| payments/admin/* | 0% | P1 | ⭐⭐⭐ |
| billing.service.ts | 0% | **P0** | ⭐⭐⭐⭐⭐ |
| billing-rules.service.ts | 0% | P2 | ⭐⭐ |
| currency.service.ts | 0% | P2 | ⭐⭐⭐ |
| reports.service.ts | 0% | P2 | ⭐⭐ |
| stats.service.ts | 0% | P2 | ⭐⭐ |
| cache.service.ts | 12.5% | P3 | ⭐⭐ |
| 所有 controllers | 0% | P3 | ⭐ |

## 🎯 改进策略

### Phase 1: 快速提升到 40% (1-2天)
**目标：专注于大文件和核心业务逻辑**

1. **payments.service.ts** (33.54% → 70%)
   - 当前未覆盖：61-65,142,171-203,255,265-339,373-396,467-716,738,752-798,817-869
   - 需要添加的测试：
     - ✅ 已有：WeChat/Alipay/Balance 支付创建
     - ✅ 已有：退款流程（Saga）
     - ❌ 缺失：支付回调处理 (handleWeChatNotify, handleAlipayNotify)
     - ❌ 缺失：支付查询同步（queryPayment 中的第三方查询逻辑）
     - ❌ 缺失：退款补偿逻辑
     - ❌ 缺失：支付异常处理流程
   - **预计收益：+8%** 整体覆盖率

2. **billing.service.ts** (0% → 70%)
   - 完全无覆盖，需要创建测试文件
   - 核心功能：订单创建、套餐购买、订单查询
   - **预计收益：+6%** 整体覆盖率

3. **metering.service.ts** (69.59% → 85%)
   - 补充未覆盖的边缘场景
   - **预计收益：+2%** 整体覆盖率

**Phase 1 预期结果：23.86% + 16% = ~40%**

### Phase 2: 提升到 55% (2-3天)
**目标：完善 payments 生态系统测试**

4. **payments/providers/** (7.37% → 60%)
   - wechat-pay.provider.ts (11.86% → 60%)
   - alipay.provider.ts (9.09% → 60%)
   - stripe.provider.ts (5.78% → 50%)
   - paypal.provider.ts (6.1% → 50%)
   - paddle.provider.ts (7.2% → 50%)
   - **预计收益：+10%** 整体覆盖率

5. **payments/admin/** (0% → 60%)
   - payments-admin.service.ts
   - **预计收益：+5%** 整体覆盖率

**Phase 2 预期结果：40% + 15% = ~55%**

### Phase 3: 达到 70% (2-3天)
**目标：完成剩余关键 services**

6. **currency.service.ts** (0% → 70%)
   - 汇率转换、多币种支持
   - **预计收益：+4%** 整体覆盖率

7. **stats.service.ts** (0% → 70%)
   - 统计和分析功能
   - **预计收益：+4%** 整体覆盖率

8. **reports.service.ts** (0% → 70%)
   - 报表生成
   - **预计收益：+4%** 整体覆盖率

9. **billing-rules.service.ts** (0% → 70%)
   - 计费规则引擎
   - **预计收益：+3%** 整体覆盖率

**Phase 3 预期结果：55% + 15% = ~70%** ✅

## 🛠️ 实施计划

### Day 1-2: Phase 1 执行
- [ ] 完善 payments.service.ts 测试（补充回调、同步、异常处理）
- [ ] 创建 billing.service.spec.ts（订单 CRUD、套餐购买）
- [ ] 补充 metering.service.ts 缺失场景

### Day 3-4: Phase 2 执行
- [ ] 创建 wechat-pay.provider.spec.ts
- [ ] 创建 alipay.provider.spec.ts
- [ ] 创建 stripe/paypal/paddle provider 测试
- [ ] 创建 payments-admin.service.spec.ts
- [ ] 创建 balance-client.service.spec.ts

### Day 5-7: Phase 3 执行
- [ ] 创建 currency.service.spec.ts
- [ ] 创建 stats.service.spec.ts
- [ ] 创建 reports.service.spec.ts
- [ ] 创建 billing-rules.service.spec.ts
- [ ] 运行完整测试套件验证 70% 目标

## 📝 测试编写模式参考

### 模式 1: Service 测试模板
```typescript
describe('XxxService', () => {
  let service: XxxService;
  let repository: jest.Mocked<Repository<Entity>>;
  let dependency: jest.Mocked<DependencyService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        XxxService,
        {
          provide: getRepositoryToken(Entity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            // ... 所有使用的方法
          },
        },
        {
          provide: DependencyService,
          useValue: {
            method: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<XxxService>(XxxService);
    repository = module.get(getRepositoryToken(Entity));
    dependency = module.get(DependencyService);
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(mockEntity);

      // Act
      const result = await service.methodName('param');

      // Assert
      expect(result).toBeDefined();
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'param' } });
    });

    it('should throw exception on failure', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.methodName('invalid')).rejects.toThrow(NotFoundException);
    });
  });
});
```

### 模式 2: Provider 测试模板
```typescript
describe('PaymentProvider', () => {
  let provider: PaymentProvider;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentProvider,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    provider = module.get<PaymentProvider>(PaymentProvider);
    httpService = module.get(HttpService);
  });

  it('should create payment order', async () => {
    // Mock HTTP response
    const mockResponse = { data: { prepayId: 'wx_123', codeUrl: 'weixin://...' } };
    httpService.post.mockReturnValue(of(mockResponse) as any);

    const result = await provider.createOrder(orderData);

    expect(result.prepayId).toBe('wx_123');
    expect(httpService.post).toHaveBeenCalledWith(
      expect.stringContaining('/pay/unifiedorder'),
      expect.objectContaining({ amount: orderData.amount })
    );
  });
});
```

## 🔍 关键修复模式

### 修复 1: Repository Mock 必须完整
```typescript
// ❌ 错误 - 缺少方法
const mockRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};

// ✅ 正确 - 包含所有使用的方法
const mockRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn().mockResolvedValue({ affected: 1 }),  // TypeORM update 返回 UpdateResult
  find: jest.fn(),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
};
```

### 修复 2: CacheService Mock
```typescript
// ✅ 必须包含 wrap() 方法
{
  provide: CacheService,
  useValue: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    delPattern: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(3600),
    wrap: jest.fn().mockImplementation(async (key, fn) => await fn()),  // 关键！
  },
}
```

### 修复 3: 测试断言与代码实现一致
```typescript
// ❌ 错误 - 代码用 update，测试期望 save
expect(repository.save).toHaveBeenCalled();

// ✅ 正确
expect(repository.update).toHaveBeenCalledWith(
  { id: 'xxx' },
  expect.objectContaining({ status: 'PAID' })
);
```

## 📊 进度追踪

- [x] Phase 0: 修复所有失败测试 (23.86%)
- [ ] Phase 1: 快速提升核心模块 (目标 40%)
- [ ] Phase 2: 完善 payments 生态 (目标 55%)
- [ ] Phase 3: 达到最终目标 (目标 70%)

## ⏱️ 时间估算

- **Phase 1**: 1-2 天 (payments.service, billing.service, metering)
- **Phase 2**: 2-3 天 (providers, admin, clients)
- **Phase 3**: 2-3 天 (currency, stats, reports, billing-rules)
- **总计**: 5-8 天

---

**最后更新**: 2025-11-02
**创建者**: Claude Code
**状态**: ✅ Phase 0 完成，准备进入 Phase 1
