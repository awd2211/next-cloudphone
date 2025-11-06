import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { QuotasService, DeductQuotaRequest, RestoreQuotaRequest } from '../quotas.service';
import { Quota, QuotaStatus, QuotaLimits, QuotaUsage } from '../../entities/quota.entity';

describe('QuotasService - Concurrency Tests', () => {
  let service: QuotasService;
  let quotaRepository: jest.Mocked<Repository<Quota>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockQuotaLimits: QuotaLimits = {
    maxDevices: 10,
    maxConcurrentDevices: 5,
    totalCpuCores: 20,
    totalMemoryGB: 40,
    totalStorageGB: 100,
    monthlyTrafficGB: 1000,
    dailyUsageHours: 24,
    monthlyUsageHours: 720,
  };

  const mockQuotaUsage: QuotaUsage = {
    currentDevices: 5,
    currentConcurrentDevices: 2,
    usedCpuCores: 10,
    usedMemoryGB: 20,
    usedStorageGB: 50,
    monthlyTrafficUsedGB: 100,
    todayUsageHours: 5,
    monthlyUsageHours: 150,
    lastUpdatedAt: new Date(),
  };

  const createMockQuota = (): Partial<Quota> => ({
    id: 'quota-123',
    userId: 'user-123',
    status: QuotaStatus.ACTIVE,
    limits: { ...mockQuotaLimits },
    usage: { ...mockQuotaUsage },
  });

  // Mock QueryRunner
  const createMockQueryRunner = (): jest.Mocked<QueryRunner> => ({
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any,
  } as any);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotasService,
        {
          provide: getRepositoryToken(Quota),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QuotasService>(QuotasService);
    quotaRepository = module.get(getRepositoryToken(Quota));
    dataSource = module.get(DataSource);
  });

  describe('deductQuota - 并发扣减测试', () => {
    it('应该防止并发扣减导致配额统计错误', async () => {
      const request: DeductQuotaRequest = {
        userId: 'user-123',
        deviceCount: 1,
        cpuCores: 2,
        memoryGB: 4,
      };

      // 创建两个独立的 quota 实例模拟并发场景
      const quota1 = createMockQuota();
      const quota2 = createMockQuota();

      const mockQueryRunner1 = createMockQueryRunner();
      const mockQueryRunner2 = createMockQueryRunner();

      // 第一个请求获取锁，成功扣减
      mockQueryRunner1.manager.findOne.mockResolvedValue(quota1);
      mockQueryRunner1.manager.save.mockResolvedValue({
        ...quota1,
        usage: {
          ...quota1.usage,
          currentDevices: quota1.usage.currentDevices + 1,
          usedCpuCores: quota1.usage.usedCpuCores + 2,
          usedMemoryGB: quota1.usage.usedMemoryGB + 4,
        },
      });

      // 第二个请求由于悲观锁，会等待第一个请求完成
      // 当它获取配额时，配额已经被第一个请求修改
      mockQueryRunner2.manager.findOne.mockResolvedValue({
        ...quota2,
        usage: {
          ...quota2.usage,
          currentDevices: 6, // 已被第一个请求增加
          usedCpuCores: 12,
          usedMemoryGB: 24,
        },
      });
      mockQueryRunner2.manager.save.mockResolvedValue({
        ...quota2,
        usage: {
          ...quota2.usage,
          currentDevices: 7, // 再增加 1
          usedCpuCores: 14,
          usedMemoryGB: 28,
        },
      });

      let callCount = 0;
      (dataSource.createQueryRunner as jest.Mock).mockImplementation(() => {
        callCount++;
        return callCount === 1 ? mockQueryRunner1 : mockQueryRunner2;
      });

      // 执行并发扣减
      const result1 = service.deductQuota(request);
      await new Promise(resolve => setTimeout(resolve, 10)); // 模拟并发
      const result2 = service.deductQuota(request);

      const [response1, response2] = await Promise.all([result1, result2]);

      // 验证两次扣减都成功
      expect(response1).toBeDefined();
      expect(response2).toBeDefined();

      // 验证都使用了事务
      expect(mockQueryRunner1.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner2.commitTransaction).toHaveBeenCalled();
    });

    it('应该使用悲观写锁查询配额', async () => {
      const request: DeductQuotaRequest = {
        userId: 'user-123',
        deviceCount: 1,
      };

      const quota = createMockQuota();
      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(quota);
      mockQueryRunner.manager.save.mockResolvedValue(quota);
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await service.deductQuota(request);

      // 验证使用了悲观锁
      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(
        Quota,
        expect.objectContaining({
          where: { userId: 'user-123', status: QuotaStatus.ACTIVE },
          lock: { mode: 'pessimistic_write' },
        })
      );
    });

    it('应该在配额不存在时抛出 NotFoundException', async () => {
      const request: DeductQuotaRequest = {
        userId: 'non-existent-user',
        deviceCount: 1,
      };

      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await expect(service.deductQuota(request)).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('应该在数据库错误时回滚事务', async () => {
      const request: DeductQuotaRequest = {
        userId: 'user-123',
        deviceCount: 1,
      };

      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(createMockQuota());
      mockQueryRunner.manager.save.mockRejectedValue(new Error('Database error'));
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await expect(service.deductQuota(request)).rejects.toThrow('Database error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('应该正确更新配额状态为超额', async () => {
      const request: DeductQuotaRequest = {
        userId: 'user-123',
        deviceCount: 6, // 超过 maxDevices (10), 已有 5 个
      };

      const quota = createMockQuota();
      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(quota);

      let savedQuota: any;
      mockQueryRunner.manager.save.mockImplementation(async (entity, data) => {
        savedQuota = data || entity;
        return savedQuota;
      });

      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await service.deductQuota(request);

      // 验证状态变更为超额
      expect(savedQuota.status).toBe(QuotaStatus.EXCEEDED);
      expect(savedQuota.usage.currentDevices).toBeGreaterThan(quota.limits.maxDevices);
    });
  });

  describe('restoreQuota - 并发恢复测试', () => {
    it('应该防止并发恢复导致配额统计错误', async () => {
      const request: RestoreQuotaRequest = {
        userId: 'user-123',
        deviceCount: 1,
        cpuCores: 2,
        memoryGB: 4,
      };

      const quota1 = createMockQuota();
      const quota2 = createMockQuota();

      const mockQueryRunner1 = createMockQueryRunner();
      const mockQueryRunner2 = createMockQueryRunner();

      mockQueryRunner1.manager.findOne.mockResolvedValue(quota1);
      mockQueryRunner1.manager.save.mockResolvedValue({
        ...quota1,
        usage: {
          ...quota1.usage,
          currentDevices: Math.max(0, quota1.usage.currentDevices - 1),
        },
      });

      mockQueryRunner2.manager.findOne.mockResolvedValue({
        ...quota2,
        usage: {
          ...quota2.usage,
          currentDevices: 4, // 已被第一个请求减少
        },
      });
      mockQueryRunner2.manager.save.mockResolvedValue({
        ...quota2,
        usage: {
          ...quota2.usage,
          currentDevices: 3,
        },
      });

      let callCount = 0;
      (dataSource.createQueryRunner as jest.Mock).mockImplementation(() => {
        callCount++;
        return callCount === 1 ? mockQueryRunner1 : mockQueryRunner2;
      });

      // 执行并发恢复
      const result1 = service.restoreQuota(request);
      await new Promise(resolve => setTimeout(resolve, 10));
      const result2 = service.restoreQuota(request);

      const [response1, response2] = await Promise.all([result1, result2]);

      expect(response1).toBeDefined();
      expect(response2).toBeDefined();
      expect(mockQueryRunner1.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner2.commitTransaction).toHaveBeenCalled();
    });

    it('应该使用悲观写锁查询配额', async () => {
      const request: RestoreQuotaRequest = {
        userId: 'user-123',
        deviceCount: 1,
      };

      const quota = createMockQuota();
      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(quota);
      mockQueryRunner.manager.save.mockResolvedValue(quota);
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await service.restoreQuota(request);

      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(
        Quota,
        expect.objectContaining({
          where: { userId: 'user-123', status: QuotaStatus.ACTIVE },
          lock: { mode: 'pessimistic_write' },
        })
      );
    });

    it('应该防止配额恢复为负数', async () => {
      const request: RestoreQuotaRequest = {
        userId: 'user-123',
        deviceCount: 10, // 恢复超过当前使用量
        cpuCores: 20,
      };

      const quota = createMockQuota();
      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(quota);

      let savedQuota: any;
      mockQueryRunner.manager.save.mockImplementation(async (entity, data) => {
        savedQuota = data || entity;
        return savedQuota;
      });

      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await service.restoreQuota(request);

      // 验证不会出现负数
      expect(savedQuota.usage.currentDevices).toBeGreaterThanOrEqual(0);
      expect(savedQuota.usage.usedCpuCores).toBeGreaterThanOrEqual(0);
    });

    it('应该在恢复后重新检查超额状态', async () => {
      const request: RestoreQuotaRequest = {
        userId: 'user-123',
        deviceCount: 2,
      };

      // 创建一个超额的配额
      const quota = {
        ...createMockQuota(),
        status: QuotaStatus.EXCEEDED,
        usage: {
          ...mockQuotaUsage,
          currentDevices: 11, // 超过限制 (10)
        },
      };

      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(quota);

      let savedQuota: any;
      mockQueryRunner.manager.save.mockImplementation(async (entity, data) => {
        savedQuota = data || entity;
        return savedQuota;
      });

      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await service.restoreQuota(request);

      // 验证恢复后状态变回 ACTIVE
      expect(savedQuota.status).toBe(QuotaStatus.ACTIVE);
      expect(savedQuota.usage.currentDevices).toBeLessThanOrEqual(quota.limits.maxDevices);
    });
  });

  describe('事务边界测试', () => {
    it('应该确保 deductQuota 操作顺序正确', async () => {
      const request: DeductQuotaRequest = {
        userId: 'user-123',
        deviceCount: 1,
      };

      const quota = createMockQuota();
      const mockQueryRunner = createMockQueryRunner();
      const operationOrder: string[] = [];

      mockQueryRunner.connect.mockImplementation(async () => {
        operationOrder.push('connect');
      });
      mockQueryRunner.startTransaction.mockImplementation(async () => {
        operationOrder.push('startTransaction');
      });
      mockQueryRunner.manager.findOne.mockImplementation(async () => {
        operationOrder.push('findOne');
        return quota;
      });
      mockQueryRunner.manager.save.mockImplementation(async (entity) => {
        operationOrder.push('save');
        return entity;
      });
      mockQueryRunner.commitTransaction.mockImplementation(async () => {
        operationOrder.push('commit');
      });
      mockQueryRunner.release.mockImplementation(async () => {
        operationOrder.push('release');
      });

      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await service.deductQuota(request);

      expect(operationOrder).toEqual([
        'connect',
        'startTransaction',
        'findOne',
        'save',
        'commit',
        'release',
      ]);
    });

    it('应该在任何错误时确保资源释放', async () => {
      const request: DeductQuotaRequest = {
        userId: 'user-123',
        deviceCount: 1,
      };

      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne.mockRejectedValue(new Error('Connection lost'));
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await expect(service.deductQuota(request)).rejects.toThrow();

      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});
