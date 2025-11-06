import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { QuotasService } from './quotas.service';
import { Quota, QuotaStatus, QuotaType } from '../entities/quota.entity';
import { createMockRepository } from '@cloudphone/shared/testing';

// Helper function to create mock quota
function createMockQuota(overrides: Partial<Quota> = {}): Quota {
  return {
    id: 'quota-123',
    userId: 'user-123',
    planId: 'plan-basic',
    planName: 'Basic Plan',
    status: QuotaStatus.ACTIVE,
    limits: {
      maxDevices: 10,
      maxCpuCoresPerDevice: 4,
      maxMemoryMBPerDevice: 8192,
      maxStorageGBPerDevice: 100,
      totalCpuCores: 40,
      totalMemoryGB: 80,
      totalStorageGB: 1000,
      monthlyTrafficGB: 500,
      maxUsageHoursPerMonth: 720,
    },
    usage: {
      currentDevices: 0,
      peakDevices: 0,
      usedCpuCores: 0,
      usedMemoryGB: 0,
      usedStorageGB: 0,
      monthlyTrafficUsedGB: 0,
      monthlyUsageHours: 0,
      lastResetDate: new Date(),
    },
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    autoRenew: false,
    notes: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: jest.fn(() => true),
    isExpired: jest.fn(() => false),
    hasAvailableDeviceQuota: jest.fn(() => true),
    hasAvailableCpuQuota: jest.fn(() => true),
    hasAvailableMemoryQuota: jest.fn(() => true),
    hasAvailableStorageQuota: jest.fn(() => true),
    getRemainingDevices: jest.fn(() => 10),
    ...overrides,
  } as any;
}

describe('QuotasService', () => {
  let service: QuotasService;
  let quotaRepository: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    quotaRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotasService,
        {
          provide: getRepositoryToken(Quota),
          useValue: quotaRepository,
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => ({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: {
                save: jest.fn(),
                findOne: jest.fn(),
              },
            })),
            manager: {
              save: jest.fn(),
              findOne: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<QuotasService>(QuotasService);
  });

  beforeEach(() => {
    quotaRepository.findOne.mockClear();
    quotaRepository.find.mockClear();
    quotaRepository.create.mockClear();
    quotaRepository.save.mockClear();
  });

  describe('createQuota', () => {
    it('应该成功创建配额', async () => {
      // Arrange
      const dto = {
        userId: 'user-123',
        planId: 'plan-basic',
        planName: 'Basic Plan',
        limits: {
          maxDevices: 10,
          maxCpuCoresPerDevice: 4,
          maxMemoryMBPerDevice: 8192,
          maxStorageGBPerDevice: 100,
          totalCpuCores: 40,
          totalMemoryGB: 80,
          totalStorageGB: 1000,
          monthlyTrafficGB: 500,
          maxUsageHoursPerMonth: 720,
        },
      };

      const mockQuota = createMockQuota(dto);

      quotaRepository.findOne.mockResolvedValue(null); // 无活跃配额
      quotaRepository.create.mockReturnValue(mockQuota);
      quotaRepository.save.mockResolvedValue(mockQuota);

      // Act
      const result = await service.createQuota(dto);

      // Assert
      expect(result).toEqual(mockQuota);
      expect(quotaRepository.findOne).toHaveBeenCalledWith({
        where: { userId: dto.userId, status: QuotaStatus.ACTIVE },
      });
      expect(quotaRepository.save).toHaveBeenCalled();
    });

    it('应该在用户已有活跃配额时抛出 BadRequestException', async () => {
      // Arrange
      const dto = {
        userId: 'user-123',
        planId: 'plan-basic',
        limits: {} as any,
      };

      const existingQuota = createMockQuota();
      quotaRepository.findOne.mockResolvedValue(existingQuota);

      // Act & Assert
      await expect(service.createQuota(dto)).rejects.toThrow(BadRequestException);
      await expect(service.createQuota(dto)).rejects.toThrow('用户已有活跃配额');
      expect(quotaRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getUserQuota', () => {
    it('应该成功获取用户配额', async () => {
      // Arrange
      const userId = 'user-123';
      const mockQuota = createMockQuota({ userId });

      quotaRepository.findOne.mockResolvedValue(mockQuota);

      // Act
      const result = await service.getUserQuota(userId);

      // Assert
      expect(result).toEqual(mockQuota);
      expect(quotaRepository.findOne).toHaveBeenCalledWith({
        where: { userId, status: QuotaStatus.ACTIVE },
        relations: ['user'],
      });
    });

    it('应该在配额不存在时抛出 NotFoundException', async () => {
      // Arrange
      const userId = 'nonexistent';

      quotaRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUserQuota(userId)).rejects.toThrow(NotFoundException);
      await expect(service.getUserQuota(userId)).rejects.toThrow(`用户 ${userId} 未找到活跃配额`);
    });

    it('应该在配额过期时更新状态并抛出异常', async () => {
      // Arrange
      const userId = 'user-123';
      const expiredQuota = createMockQuota({
        userId,
        isExpired: jest.fn(() => true),
      });

      quotaRepository.findOne.mockResolvedValue(expiredQuota);
      quotaRepository.save.mockResolvedValue({
        ...expiredQuota,
        status: QuotaStatus.EXPIRED,
      });

      // Act & Assert
      await expect(service.getUserQuota(userId)).rejects.toThrow(BadRequestException);
      await expect(service.getUserQuota(userId)).rejects.toThrow('配额已过期');
      expect(quotaRepository.save).toHaveBeenCalled();
    });
  });

  describe('checkQuota', () => {
    it('应该允许设备配额检查通过', async () => {
      // Arrange
      const request = {
        userId: 'user-123',
        quotaType: QuotaType.DEVICE,
        requestedAmount: 2,
      };

      const mockQuota = createMockQuota({
        usage: { currentDevices: 5, peakDevices: 5 } as any,
        hasAvailableDeviceQuota: jest.fn(() => true),
        getRemainingDevices: jest.fn(() => 5),
      });

      quotaRepository.findOne.mockResolvedValue(mockQuota);

      // Act
      const result = await service.checkQuota(request);

      // Assert
      expect(result.allowed).toBe(true);
      expect(mockQuota.hasAvailableDeviceQuota).toHaveBeenCalledWith(2);
    });

    it('应该拒绝设备配额不足的请求', async () => {
      // Arrange
      const request = {
        userId: 'user-123',
        quotaType: QuotaType.DEVICE,
        requestedAmount: 10,
      };

      const mockQuota = createMockQuota({
        usage: { currentDevices: 9, peakDevices: 9 } as any,
        limits: { maxDevices: 10 } as any,
        hasAvailableDeviceQuota: jest.fn(() => false),
        getRemainingDevices: jest.fn(() => 1),
      });

      quotaRepository.findOne.mockResolvedValue(mockQuota);

      // Act
      const result = await service.checkQuota(request);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('设备配额不足');
      expect(result.remaining).toBe(1);
    });

    it('应该检查CPU配额', async () => {
      // Arrange
      const request = {
        userId: 'user-123',
        quotaType: QuotaType.CPU,
        requestedAmount: 4,
      };

      const mockQuota = createMockQuota({
        hasAvailableCpuQuota: jest.fn(() => true),
      });

      quotaRepository.findOne.mockResolvedValue(mockQuota);

      // Act
      const result = await service.checkQuota(request);

      // Assert
      expect(result.allowed).toBe(true);
      expect(mockQuota.hasAvailableCpuQuota).toHaveBeenCalledWith(4);
    });

    it('应该检查内存配额', async () => {
      // Arrange
      const request = {
        userId: 'user-123',
        quotaType: QuotaType.MEMORY,
        requestedAmount: 8,
      };

      const mockQuota = createMockQuota({
        hasAvailableMemoryQuota: jest.fn(() => true),
      });

      quotaRepository.findOne.mockResolvedValue(mockQuota);

      // Act
      const result = await service.checkQuota(request);

      // Assert
      expect(result.allowed).toBe(true);
      expect(mockQuota.hasAvailableMemoryQuota).toHaveBeenCalledWith(8);
    });

    it('应该检查存储配额', async () => {
      // Arrange
      const request = {
        userId: 'user-123',
        quotaType: QuotaType.STORAGE,
        requestedAmount: 50,
      };

      const mockQuota = createMockQuota({
        hasAvailableStorageQuota: jest.fn(() => true),
      });

      quotaRepository.findOne.mockResolvedValue(mockQuota);

      // Act
      const result = await service.checkQuota(request);

      // Assert
      expect(result.allowed).toBe(true);
      expect(mockQuota.hasAvailableStorageQuota).toHaveBeenCalledWith(50);
    });

    it('应该在配额状态异常时拒绝请求', async () => {
      // Arrange
      const request = {
        userId: 'user-123',
        quotaType: QuotaType.DEVICE,
        requestedAmount: 1,
      };

      const mockQuota = createMockQuota({
        status: QuotaStatus.SUSPENDED,
        isActive: jest.fn(() => false),
      });

      quotaRepository.findOne.mockResolvedValue(mockQuota);

      // Act
      const result = await service.checkQuota(request);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('配额状态异常');
    });

    it('应该检查单设备CPU限制', async () => {
      // Arrange
      const request = {
        userId: 'user-123',
        quotaType: QuotaType.DEVICE,
        requestedAmount: 1,
        deviceConfig: {
          cpuCores: 8, // 超过限制
        },
      };

      const mockQuota = createMockQuota({
        limits: { maxCpuCoresPerDevice: 4 } as any,
        hasAvailableDeviceQuota: jest.fn(() => true),
      });

      quotaRepository.findOne.mockResolvedValue(mockQuota);

      // Act
      const result = await service.checkQuota(request);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('单设备 CPU 超限');
    });
  });

  describe('deductQuota', () => {
    it.skip('应该成功扣除设备配额', async () => {
      // Arrange
      const request = {
        userId: 'user-123',
        deviceCount: 1,
        cpuCores: 2,
        memoryGB: 4,
        storageGB: 50,
      };

      const mockQuota = createMockQuota({
        usage: {
          currentDevices: 2,
          usedCpuCores: 4,
          usedMemoryGB: 8,
          usedStorageGB: 100,
        } as any,
      });

      quotaRepository.findOne.mockResolvedValue(mockQuota);
      quotaRepository.save.mockResolvedValue({
        ...mockQuota,
        usage: {
          currentDevices: 3,
          usedCpuCores: 6,
          usedMemoryGB: 12,
          usedStorageGB: 150,
        },
      });

      // Act
      const result = await service.deductQuota(request);

      // Assert
      expect(quotaRepository.save).toHaveBeenCalled();
      const savedQuota = quotaRepository.save.mock.calls[0][0];
      expect(savedQuota.usage.currentDevices).toBe(3);
      expect(savedQuota.usage.usedCpuCores).toBe(6);
    });
  });

  describe('restoreQuota', () => {
    it.skip('应该成功恢复设备配额', async () => {
      // Arrange
      const request = {
        userId: 'user-123',
        deviceCount: 1,
        cpuCores: 2,
        memoryGB: 4,
        storageGB: 50,
      };

      const mockQuota = createMockQuota({
        usage: {
          currentDevices: 3,
          usedCpuCores: 6,
          usedMemoryGB: 12,
          usedStorageGB: 150,
        } as any,
      });

      quotaRepository.findOne.mockResolvedValue(mockQuota);
      quotaRepository.save.mockResolvedValue({
        ...mockQuota,
        usage: {
          currentDevices: 2,
          usedCpuCores: 4,
          usedMemoryGB: 8,
          usedStorageGB: 100,
        },
      });

      // Act
      const result = await service.restoreQuota(request);

      // Assert
      expect(quotaRepository.save).toHaveBeenCalled();
      const savedQuota = quotaRepository.save.mock.calls[0][0];
      expect(savedQuota.usage.currentDevices).toBe(2);
      expect(savedQuota.usage.usedCpuCores).toBe(4);
    });
  });

  describe('updateQuota', () => {
    it('应该成功更新配额', async () => {
      // Arrange
      const quotaId = 'quota-123';
      const dto = {
        limits: {
          maxDevices: 20,
        },
        notes: 'Updated limits',
      };

      const mockQuota = createMockQuota({ id: quotaId });

      quotaRepository.findOne.mockResolvedValue(mockQuota);
      quotaRepository.save.mockResolvedValue({
        ...mockQuota,
        ...dto,
      });

      // Act
      const result = await service.updateQuota(quotaId, dto);

      // Assert
      expect(quotaRepository.save).toHaveBeenCalled();
    });

    it('应该在配额不存在时抛出 NotFoundException', async () => {
      // Arrange
      const quotaId = 'nonexistent';
      const dto = { notes: 'Test' };

      quotaRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateQuota(quotaId, dto)).rejects.toThrow(NotFoundException);
    });
  });
});
