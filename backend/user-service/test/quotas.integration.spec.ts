import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { QuotasService, DeductQuotaRequest, RestoreQuotaRequest } from '../src/quotas/quotas.service';
import { Quota, QuotaStatus, QuotaLimits, QuotaUsage } from '../src/entities/quota.entity';

/**
 * 配额服务集成测试
 *
 * 测试目的：
 * 1. 验证真实数据库悲观锁防止并发 Lost Update
 * 2. 验证配额不会变为负数
 * 3. 验证超额状态的正确管理
 * 4. 验证事务回滚行为
 *
 * 运行前置条件：
 * - PostgreSQL 数据库运行在 localhost:5432
 * - 存在测试数据库 cloudphone_user_test
 * - 数据库用户 postgres/postgres
 */
describe('QuotasService - Integration Tests', () => {
  let module: TestingModule;
  let service: QuotasService;
  let dataSource: DataSource;
  let testUserId: string;
  let testQuotaId: string;

  const defaultLimits: QuotaLimits = {
    maxDevices: 10,
    maxConcurrentDevices: 5,
    totalCpuCores: 20,
    totalMemoryGB: 40,
    totalStorageGB: 100,
    monthlyTrafficGB: 1000,
    dailyUsageHours: 24,
    monthlyUsageHours: 720,
  };

  const initialUsage: QuotaUsage = {
    currentDevices: 0,
    currentConcurrentDevices: 0,
    usedCpuCores: 0,
    usedMemoryGB: 0,
    usedStorageGB: 0,
    monthlyTrafficUsedGB: 0,
    todayUsageHours: 0,
    monthlyUsageHours: 0,
    lastUpdatedAt: new Date(),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_DATABASE || 'cloudphone_user_test',
          entities: [Quota],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([Quota]),
      ],
      providers: [QuotasService],
    }).compile();

    service = module.get<QuotasService>(QuotasService);
    dataSource = module.get<DataSource>(DataSource);

    testUserId = 'integration-test-user-' + Date.now();
  });

  afterAll(async () => {
    // 清理所有测试数据
    const quotaRepository = dataSource.getRepository(Quota);
    await quotaRepository.delete({ userId: testUserId });

    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    // 清理之前的配额
    const quotaRepository = dataSource.getRepository(Quota);
    await quotaRepository.delete({ userId: testUserId });

    // 创建新的测试配额
    const quota = quotaRepository.create({
      userId: testUserId,
      status: QuotaStatus.ACTIVE,
      limits: { ...defaultLimits },
      usage: { ...initialUsage },
    });
    const savedQuota = await quotaRepository.save(quota);
    testQuotaId = savedQuota.id;
  });

  describe('deductQuota - 并发扣减测试（真实数据库锁）', () => {
    it('应该防止并发扣减导致 Lost Update', async () => {
      const request: DeductQuotaRequest = {
        userId: testUserId,
        deviceCount: 1,
        cpuCores: 2,
        memoryGB: 4,
      };

      // 发起10个并发扣减请求
      const requests = Array.from({ length: 10 }, () =>
        service.deductQuota(request)
      );

      await Promise.all(requests);

      // 验证最终配额值
      const quotaRepository = dataSource.getRepository(Quota);
      const finalQuota = await quotaRepository.findOne({ where: { id: testQuotaId } });

      // 应该正好扣减了 10 次
      expect(finalQuota.usage.currentDevices).toBe(10); // 0 + 10 * 1
      expect(finalQuota.usage.usedCpuCores).toBe(20);   // 0 + 10 * 2
      expect(finalQuota.usage.usedMemoryGB).toBe(40);   // 0 + 10 * 4

      // 没有 Lost Update（如果没有锁，并发会导致数据丢失）
    });

    it('应该在高并发场景下保持数据准确性（50个并发请求）', async () => {
      const request: DeductQuotaRequest = {
        userId: testUserId,
        deviceCount: 1,
      };

      // 发起50个并发请求
      const requests = Array.from({ length: 50 }, () =>
        service.deductQuota(request)
      );

      await Promise.all(requests);

      const quotaRepository = dataSource.getRepository(Quota);
      const finalQuota = await quotaRepository.findOne({ where: { id: testQuotaId } });

      // 验证设备数量正好是50
      expect(finalQuota.usage.currentDevices).toBe(50);
    });

    it('应该正确检测并标记超额状态', async () => {
      // 扣减到接近限制
      await service.deductQuota({
        userId: testUserId,
        deviceCount: 9,
      });

      // 验证还未超额
      let quotaRepository = dataSource.getRepository(Quota);
      let quota = await quotaRepository.findOne({ where: { id: testQuotaId } });
      expect(quota.status).toBe(QuotaStatus.ACTIVE);
      expect(quota.usage.currentDevices).toBe(9);

      // 再扣减2个（超过限制10）
      await service.deductQuota({
        userId: testUserId,
        deviceCount: 2,
      });

      // 验证超额状态
      quota = await quotaRepository.findOne({ where: { id: testQuotaId } });
      expect(quota.status).toBe(QuotaStatus.EXCEEDED);
      expect(quota.usage.currentDevices).toBe(11);
    });
  });

  describe('restoreQuota - 并发恢复测试（真实数据库锁）', () => {
    it('应该防止并发恢复导致 Lost Update', async () => {
      // 先扣减一些配额
      await service.deductQuota({
        userId: testUserId,
        deviceCount: 20,
        cpuCores: 40,
      });

      // 验证扣减成功
      const quotaRepository = dataSource.getRepository(Quota);
      let quota = await quotaRepository.findOne({ where: { id: testQuotaId } });
      expect(quota.usage.currentDevices).toBe(20);
      expect(quota.usage.usedCpuCores).toBe(40);

      // 发起10个并发恢复请求
      const request: RestoreQuotaRequest = {
        userId: testUserId,
        deviceCount: 1,
        cpuCores: 2,
      };

      const requests = Array.from({ length: 10 }, () =>
        service.restoreQuota(request)
      );

      await Promise.all(requests);

      // 验证最终配额值
      quota = await quotaRepository.findOne({ where: { id: testQuotaId } });
      expect(quota.usage.currentDevices).toBe(10); // 20 - 10 * 1
      expect(quota.usage.usedCpuCores).toBe(20);   // 40 - 10 * 2
    });

    it('应该防止配额恢复为负数', async () => {
      // 先扣减少量配额
      await service.deductQuota({
        userId: testUserId,
        deviceCount: 5,
        cpuCores: 10,
      });

      // 尝试恢复超过当前使用量的配额
      await service.restoreQuota({
        userId: testUserId,
        deviceCount: 10, // 超过当前的 5
        cpuCores: 20,    // 超过当前的 10
      });

      // 验证配额不会变负
      const quotaRepository = dataSource.getRepository(Quota);
      const quota = await quotaRepository.findOne({ where: { id: testQuotaId } });
      expect(quota.usage.currentDevices).toBeGreaterThanOrEqual(0);
      expect(quota.usage.usedCpuCores).toBeGreaterThanOrEqual(0);

      // 应该是 0，而不是负数
      expect(quota.usage.currentDevices).toBe(0);
      expect(quota.usage.usedCpuCores).toBe(0);
    });

    it('应该在恢复后重新评估超额状态', async () => {
      // 先扣减到超额
      await service.deductQuota({
        userId: testUserId,
        deviceCount: 15, // 超过限制 10
      });

      const quotaRepository = dataSource.getRepository(Quota);
      let quota = await quotaRepository.findOne({ where: { id: testQuotaId } });
      expect(quota.status).toBe(QuotaStatus.EXCEEDED);

      // 恢复配额到限制以下
      await service.restoreQuota({
        userId: testUserId,
        deviceCount: 10, // 15 - 10 = 5，回到限制以下
      });

      // 验证状态恢复为 ACTIVE
      quota = await quotaRepository.findOne({ where: { id: testQuotaId } });
      expect(quota.status).toBe(QuotaStatus.ACTIVE);
      expect(quota.usage.currentDevices).toBe(5);
    });
  });

  describe('deductQuota 和 restoreQuota - 混合并发测试', () => {
    it('应该正确处理混合的扣减和恢复操作', async () => {
      // 先扣减一些初始配额
      await service.deductQuota({
        userId: testUserId,
        deviceCount: 10,
      });

      // 混合执行扣减和恢复操作（20个扣减 + 15个恢复）
      const deductRequests = Array.from({ length: 20 }, () =>
        service.deductQuota({ userId: testUserId, deviceCount: 1 })
      );
      const restoreRequests = Array.from({ length: 15 }, () =>
        service.restoreQuota({ userId: testUserId, deviceCount: 1 })
      );

      await Promise.all([...deductRequests, ...restoreRequests]);

      // 验证最终结果：10 + 20 - 15 = 15
      const quotaRepository = dataSource.getRepository(Quota);
      const quota = await quotaRepository.findOne({ where: { id: testQuotaId } });
      expect(quota.usage.currentDevices).toBe(15);
    });

    it('应该在极端并发下保持数据一致性（100个混合操作）', async () => {
      // 设置初始值
      await service.deductQuota({
        userId: testUserId,
        deviceCount: 50,
        cpuCores: 100,
      });

      // 50个扣减 + 50个恢复
      const operations = [
        ...Array.from({ length: 50 }, () =>
          service.deductQuota({ userId: testUserId, deviceCount: 1, cpuCores: 2 })
        ),
        ...Array.from({ length: 50 }, () =>
          service.restoreQuota({ userId: testUserId, deviceCount: 1, cpuCores: 2 })
        ),
      ];

      // 随机打乱操作顺序
      operations.sort(() => Math.random() - 0.5);

      await Promise.all(operations);

      // 验证最终结果：50 + 50 - 50 = 50（应该保持不变）
      const quotaRepository = dataSource.getRepository(Quota);
      const quota = await quotaRepository.findOne({ where: { id: testQuotaId } });
      expect(quota.usage.currentDevices).toBe(50);
      expect(quota.usage.usedCpuCores).toBe(100);
    });
  });

  describe('事务回滚验证', () => {
    it('应该在配额不存在时抛出异常且不修改数据', async () => {
      await expect(
        service.deductQuota({
          userId: 'non-existent-user',
          deviceCount: 1,
        })
      ).rejects.toThrow(NotFoundException);

      // 验证原配额未受影响
      const quotaRepository = dataSource.getRepository(Quota);
      const quota = await quotaRepository.findOne({ where: { id: testQuotaId } });
      expect(quota.usage.currentDevices).toBe(0); // 保持初始值
    });

    it('应该在数据库错误时不影响其他配额', async () => {
      // 记录初始状态
      const quotaRepository = dataSource.getRepository(Quota);
      const initialQuota = await quotaRepository.findOne({ where: { id: testQuotaId } });
      const initialDevices = initialQuota.usage.currentDevices;

      // 尝试操作不存在的用户（应该失败）
      try {
        await service.deductQuota({
          userId: 'invalid-user',
          deviceCount: 1,
        });
      } catch (error) {
        // 预期会失败
      }

      // 验证原配额未受影响
      const unchangedQuota = await quotaRepository.findOne({ where: { id: testQuotaId } });
      expect(unchangedQuota.usage.currentDevices).toBe(initialDevices);
    });
  });

  describe('lastUpdatedAt 时间戳验证', () => {
    it('应该在每次扣减时更新 lastUpdatedAt', async () => {
      const quotaRepository = dataSource.getRepository(Quota);
      const initialQuota = await quotaRepository.findOne({ where: { id: testQuotaId } });
      const initialTime = initialQuota.usage.lastUpdatedAt;

      // 等待一小段时间确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 100));

      // 扣减配额
      await service.deductQuota({
        userId: testUserId,
        deviceCount: 1,
      });

      // 验证时间戳已更新
      const updatedQuota = await quotaRepository.findOne({ where: { id: testQuotaId } });
      expect(updatedQuota.usage.lastUpdatedAt.getTime()).toBeGreaterThan(initialTime.getTime());
    });

    it('应该在每次恢复时更新 lastUpdatedAt', async () => {
      // 先扣减
      await service.deductQuota({
        userId: testUserId,
        deviceCount: 5,
      });

      const quotaRepository = dataSource.getRepository(Quota);
      const beforeRestore = await quotaRepository.findOne({ where: { id: testQuotaId } });
      const beforeTime = beforeRestore.usage.lastUpdatedAt;

      await new Promise(resolve => setTimeout(resolve, 100));

      // 恢复配额
      await service.restoreQuota({
        userId: testUserId,
        deviceCount: 1,
      });

      // 验证时间戳已更新
      const afterRestore = await quotaRepository.findOne({ where: { id: testQuotaId } });
      expect(afterRestore.usage.lastUpdatedAt.getTime()).toBeGreaterThan(beforeTime.getTime());
    });
  });

  describe('数据库连接和资源管理', () => {
    it('应该正确释放数据库连接', async () => {
      const initialPoolSize = dataSource.driver.master.poolSize;

      // 执行多次操作
      for (let i = 0; i < 20; i++) {
        await service.deductQuota({
          userId: testUserId,
          deviceCount: 1,
        });
      }

      // 等待连接释放
      await new Promise(resolve => setTimeout(resolve, 200));

      const finalPoolSize = dataSource.driver.master.poolSize;
      expect(finalPoolSize).toBeLessThanOrEqual(initialPoolSize + 2);
    });

    it('应该在错误场景下正确释放连接', async () => {
      const initialPoolSize = dataSource.driver.master.poolSize;

      // 执行多次失败的操作
      for (let i = 0; i < 10; i++) {
        try {
          await service.deductQuota({
            userId: 'invalid-user',
            deviceCount: 1,
          });
        } catch (error) {
          // 预期会失败
        }
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      const finalPoolSize = dataSource.driver.master.poolSize;
      expect(finalPoolSize).toBeLessThanOrEqual(initialPoolSize + 2);
    });
  });
});
