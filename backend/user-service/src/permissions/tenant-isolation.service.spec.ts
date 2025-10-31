import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { TenantIsolationService, TenantContext } from './tenant-isolation.service';
import { User, UserStatus } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';
import { createMockRepository } from '@cloudphone/shared/testing';
import { SelectQueryBuilder, Brackets } from 'typeorm';

describe('TenantIsolationService', () => {
  let service: TenantIsolationService;
  let userRepository: ReturnType<typeof createMockRepository>;
  let tenantRepository: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    userRepository = createMockRepository();
    tenantRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantIsolationService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: tenantRepository,
        },
      ],
    }).compile();

    service = module.get<TenantIsolationService>(TenantIsolationService);
  });

  beforeEach(() => {
    userRepository.findOne.mockClear();
    userRepository.count.mockClear();
    tenantRepository.find.mockClear();
  });

  describe('租户上下文管理', () => {
    it('应该成功设置租户上下文', () => {
      // Arrange
      const requestId = 'req-123';
      const context: TenantContext = {
        tenantId: 'tenant-123',
        userId: 'user-123',
        isSuperAdmin: false,
        allowCrossTenant: false,
      };

      // Act
      service.setTenantContext(requestId, context);
      const result = service.getTenantContext(requestId);

      // Assert
      expect(result).toEqual(context);
    });

    it('应该成功清除租户上下文', () => {
      // Arrange
      const requestId = 'req-123';
      const context: TenantContext = {
        tenantId: 'tenant-123',
        userId: 'user-123',
        isSuperAdmin: false,
        allowCrossTenant: false,
      };

      service.setTenantContext(requestId, context);

      // Act
      service.clearTenantContext(requestId);
      const result = service.getTenantContext(requestId);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('applyTenantFilter', () => {
    it('应该对超级管理员不应用租户过滤', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
        tenantId: 'tenant-123',
      };
      const mockQueryBuilder = {
        alias: 'device',
        andWhere: jest.fn().mockReturnThis(),
      } as any;

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.applyTenantFilter(mockQueryBuilder, userId);

      // Assert
      expect(result).toBe(mockQueryBuilder);
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('应该对普通用户应用租户过滤', async () => {
      // Arrange
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId,
      };
      const mockQueryBuilder = {
        alias: 'device',
        andWhere: jest.fn().mockReturnThis(),
      } as any;

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      await service.applyTenantFilter(mockQueryBuilder, userId);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('应该在用户不存在时抛出ForbiddenException', async () => {
      // Arrange
      const userId = 'nonexistent';
      const mockQueryBuilder = {
        alias: 'device',
      } as any;

      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.applyTenantFilter(mockQueryBuilder, userId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('checkCrossTenantAccess', () => {
    it('应该允许超级管理员跨租户访问', async () => {
      // Arrange
      const userId = 'user-123';
      const targetTenantId = 'tenant-456';
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
        tenantId: 'tenant-123',
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.checkCrossTenantAccess(userId, targetTenantId);

      // Assert
      expect(result).toBe(true);
    });

    it('应该允许访问自己的租户', async () => {
      // Arrange
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId,
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.checkCrossTenantAccess(userId, tenantId);

      // Assert
      expect(result).toBe(true);
    });

    it('应该拒绝普通用户跨租户访问', async () => {
      // Arrange
      const userId = 'user-123';
      const targetTenantId = 'tenant-456';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId: 'tenant-123',
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.checkCrossTenantAccess(userId, targetTenantId);

      // Assert
      expect(result).toBe(false);
    });

    it('应该对不存在的用户返回false', async () => {
      // Arrange
      const userId = 'nonexistent';
      const targetTenantId = 'tenant-123';

      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.checkCrossTenantAccess(userId, targetTenantId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isSuperAdmin', () => {
    it('应该正确识别超级管理员', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.isSuperAdmin(userId);

      // Assert
      expect(result).toBe(true);
    });

    it('应该正确识别非超级管理员', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.isSuperAdmin(userId);

      // Assert
      expect(result).toBe(false);
    });

    it('应该对不存在的用户返回false', async () => {
      // Arrange
      const userId = 'nonexistent';

      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.isSuperAdmin(userId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getUserTenantId', () => {
    it('应该返回用户的租户ID', async () => {
      // Arrange
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const mockUser = {
        id: userId,
        tenantId,
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.getUserTenantId(userId);

      // Assert
      expect(result).toBe(tenantId);
    });

    it('应该对不存在的用户返回null', async () => {
      // Arrange
      const userId = 'nonexistent';

      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getUserTenantId(userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('validateDataTenant', () => {
    it('应该允许超级管理员访问任意租户数据', async () => {
      // Arrange
      const userId = 'user-123';
      const data = { id: 'data-123', tenantId: 'tenant-456' };
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
        tenantId: 'tenant-123',
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.validateDataTenant(userId, data)).resolves.toBeUndefined();
    });

    it('应该允许访问同租户数据', async () => {
      // Arrange
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const data = { id: 'data-123', tenantId };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId,
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.validateDataTenant(userId, data)).resolves.toBeUndefined();
    });

    it('应该拒绝访问其他租户数据', async () => {
      // Arrange
      const userId = 'user-123';
      const data = { id: 'data-123', tenantId: 'tenant-456' };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId: 'tenant-123',
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.validateDataTenant(userId, data)).rejects.toThrow(ForbiddenException);
      await expect(service.validateDataTenant(userId, data)).rejects.toThrow(
        '无权访问其他租户的数据'
      );
    });

    it('应该对没有租户信息的数据跳过验证', async () => {
      // Arrange
      const userId = 'user-123';
      const data = { id: 'data-123' }; // 没有 tenantId

      // Act & Assert
      await expect(service.validateDataTenant(userId, data)).resolves.toBeUndefined();
    });

    it('应该在用户不存在时抛出ForbiddenException', async () => {
      // Arrange
      const userId = 'nonexistent';
      const data = { id: 'data-123', tenantId: 'tenant-123' };

      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.validateDataTenant(userId, data)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('validateDataArrayTenant', () => {
    it('应该允许超级管理员访问混合租户数据', async () => {
      // Arrange
      const userId = 'user-123';
      const dataArray = [
        { id: 'data-1', tenantId: 'tenant-123' },
        { id: 'data-2', tenantId: 'tenant-456' },
      ];
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
        tenantId: 'tenant-123',
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.validateDataArrayTenant(userId, dataArray)).resolves.toBeUndefined();
    });

    it('应该允许访问同租户数据数组', async () => {
      // Arrange
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const dataArray = [
        { id: 'data-1', tenantId },
        { id: 'data-2', tenantId },
      ];
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId,
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.validateDataArrayTenant(userId, dataArray)).resolves.toBeUndefined();
    });

    it('应该拒绝包含其他租户数据的数组', async () => {
      // Arrange
      const userId = 'user-123';
      const dataArray = [
        { id: 'data-1', tenantId: 'tenant-123' },
        { id: 'data-2', tenantId: 'tenant-456' }, // 不同租户
      ];
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId: 'tenant-123',
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.validateDataArrayTenant(userId, dataArray)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('应该对空数组跳过验证', async () => {
      // Arrange
      const userId = 'user-123';
      const dataArray: any[] = [];

      // Act & Assert
      await expect(service.validateDataArrayTenant(userId, dataArray)).resolves.toBeUndefined();
    });
  });

  describe('setDataTenant', () => {
    it('应该允许超级管理员设置任意租户ID', async () => {
      // Arrange
      const userId = 'user-123';
      const data = { id: 'data-123', tenantId: 'tenant-456' };
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
        tenantId: 'tenant-123',
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.setDataTenant(userId, data);

      // Assert
      expect(result.tenantId).toBe('tenant-456');
    });

    it('应该自动设置用户的租户ID', async () => {
      // Arrange
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const data = { id: 'data-123' };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId,
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.setDataTenant(userId, data);

      // Assert
      expect(result.tenantId).toBe(tenantId);
    });

    it('应该拒绝普通用户设置其他租户ID', async () => {
      // Arrange
      const userId = 'user-123';
      const data = { id: 'data-123', tenantId: 'tenant-456' };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId: 'tenant-123',
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.setDataTenant(userId, data)).rejects.toThrow(ForbiddenException);
      await expect(service.setDataTenant(userId, data)).rejects.toThrow('无权为其他租户创建数据');
    });

    it('应该在用户不存在时抛出ForbiddenException', async () => {
      // Arrange
      const userId = 'nonexistent';
      const data = { id: 'data-123' };

      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.setDataTenant(userId, data)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('setDataArrayTenant', () => {
    it('应该批量设置租户ID', async () => {
      // Arrange
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const dataArray = [{ id: 'data-1' }, { id: 'data-2' }];
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId,
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.setDataArrayTenant(userId, dataArray);

      // Assert
      expect(result.every((item) => item.tenantId === tenantId)).toBe(true);
    });

    it('应该对空数组返回空数组', async () => {
      // Arrange
      const userId = 'user-123';
      const dataArray: any[] = [];

      // Act
      const result = await service.setDataArrayTenant(userId, dataArray);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getTenantStats', () => {
    it('应该返回租户统计信息', async () => {
      // Arrange
      const tenantId = 'tenant-123';

      userRepository.count
        .mockResolvedValueOnce(100) // userCount
        .mockResolvedValueOnce(80); // activeUserCount

      // Act
      const result = await service.getTenantStats(tenantId);

      // Assert
      expect(result.userCount).toBe(100);
      expect(result.activeUserCount).toBe(80);
    });
  });

  describe('tenantExists', () => {
    it('应该在租户有用户时返回true', async () => {
      // Arrange
      const tenantId = 'tenant-123';

      userRepository.count.mockResolvedValue(5);

      // Act
      const result = await service.tenantExists(tenantId);

      // Assert
      expect(result).toBe(true);
    });

    it('应该在租户无用户时返回false', async () => {
      // Arrange
      const tenantId = 'tenant-123';

      userRepository.count.mockResolvedValue(0);

      // Act
      const result = await service.tenantExists(tenantId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getAccessibleTenants', () => {
    it('应该返回超级管理员可访问的所有租户', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
        tenantId: 'tenant-123',
      };
      const mockTenants = [
        { id: 'tenant-1', status: 'active' },
        { id: 'tenant-2', status: 'active' },
      ];

      userRepository.findOne.mockResolvedValue(mockUser);
      tenantRepository.find.mockResolvedValue(mockTenants);

      // Act
      const result = await service.getAccessibleTenants(userId);

      // Assert
      expect(result).toEqual(['tenant-1', 'tenant-2']);
    });

    it('应该返回普通用户自己的租户', async () => {
      // Arrange
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId,
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.getAccessibleTenants(userId);

      // Assert
      expect(result).toEqual([tenantId]);
    });

    it('应该对不存在的用户返回空数组', async () => {
      // Arrange
      const userId = 'nonexistent';

      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getAccessibleTenants(userId);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
