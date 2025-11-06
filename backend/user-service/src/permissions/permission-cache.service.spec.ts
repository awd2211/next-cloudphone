import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PermissionCacheService } from './permission-cache.service';
import { Permission } from '../entities/permission.entity';
import { DataScope } from '../entities/data-scope.entity';
import { FieldPermission, OperationType } from '../entities/field-permission.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { createMockRepository } from '@cloudphone/shared/testing';
import { CacheService, CacheLayer } from '../cache/cache.service';

describe('PermissionCacheService', () => {
  let service: PermissionCacheService;
  let permissionRepository: ReturnType<typeof createMockRepository>;
  let dataScopeRepository: ReturnType<typeof createMockRepository>;
  let fieldPermissionRepository: ReturnType<typeof createMockRepository>;
  let userRepository: ReturnType<typeof createMockRepository>;
  let roleRepository: ReturnType<typeof createMockRepository>;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    permissionRepository = createMockRepository();
    dataScopeRepository = createMockRepository();
    fieldPermissionRepository = createMockRepository();
    userRepository = createMockRepository();
    roleRepository = createMockRepository();

    // Mock CacheService
    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delPattern: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        l1: { hits: 0, misses: 0, keys: 0, hitRate: '0.00%' },
        l2: { hits: 0, misses: 0, hitRate: '0.00%' },
        total: { hits: 0, misses: 0, hitRate: '0.00%' },
        enabled: true,
        ttl: 300,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionCacheService,
        {
          provide: getRepositoryToken(Permission),
          useValue: permissionRepository,
        },
        {
          provide: getRepositoryToken(DataScope),
          useValue: dataScopeRepository,
        },
        {
          provide: getRepositoryToken(FieldPermission),
          useValue: fieldPermissionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: roleRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<PermissionCacheService>(PermissionCacheService);
    cacheService = module.get(CacheService);
  });

  beforeEach(() => {
    userRepository.findOne.mockClear();
    userRepository.find.mockClear();
    roleRepository.find.mockClear();
    dataScopeRepository.find.mockClear();
    fieldPermissionRepository.find.mockClear();
    cacheService.get.mockClear();
    cacheService.set.mockClear();
    cacheService.del.mockClear();
    cacheService.delPattern.mockClear();
  });

  describe('getUserPermissions', () => {
    it('应该从缓存返回用户权限', async () => {
      // Arrange
      const userId = 'user-123';
      const mockCachedData = {
        userId,
        tenantId: 'tenant-123',
        roleIds: ['role-123'],
        permissions: [{ id: 'perm-123', name: 'test' }],
        dataScopes: {},
        fieldPermissions: {},
        cachedAt: new Date(),
      };

      // 第一次调用返回null (cache miss)，第二次返回缓存数据
      cacheService.get.mockResolvedValueOnce(null).mockResolvedValueOnce(mockCachedData);

      const mockUser = {
        id: userId,
        tenantId: 'tenant-123',
        isSuperAdmin: false,
        roles: [{ id: 'role-123' }],
      };
      const mockRole = {
        id: 'role-123',
        permissions: [{ id: 'perm-123', name: 'test' }],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue([mockRole]);
      dataScopeRepository.find.mockResolvedValue([]);
      fieldPermissionRepository.find.mockResolvedValue([]);

      // Act - 第一次调用加载数据
      const result1 = await service.getUserPermissions(userId);

      // 清除 mock 以验证缓存
      userRepository.findOne.mockClear();

      // Act - 第二次调用应该从缓存获取
      const result2 = await service.getUserPermissions(userId);

      // Assert
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1?.userId).toBe(userId);
      expect(result2?.userId).toBe(userId);
      expect(cacheService.get).toHaveBeenCalledTimes(2);
      expect(cacheService.set).toHaveBeenCalledTimes(1);
      expect(userRepository.findOne).not.toHaveBeenCalled(); // 第二次没有查询数据库
    });

    it('应该对不存在的用户返回null', async () => {
      // Arrange
      const userId = 'nonexistent';
      cacheService.get.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getUserPermissions(userId);

      // Assert
      expect(result).toBeNull();
      expect(cacheService.get).toHaveBeenCalled();
    });

    it('应该缓存用户的所有权限数据', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        tenantId: 'tenant-123',
        isSuperAdmin: false,
        roles: [{ id: 'role-123' }],
      };
      const mockRole = {
        id: 'role-123',
        permissions: [
          { id: 'perm-1', name: 'permission1' },
          { id: 'perm-2', name: 'permission2' },
        ],
      };

      cacheService.get.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue([mockRole]);
      dataScopeRepository.find.mockResolvedValue([]);
      fieldPermissionRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getUserPermissions(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.permissions.length).toBe(2);
      expect(result?.tenantId).toBe('tenant-123');
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining(userId),
        expect.objectContaining({
          userId,
          tenantId: 'tenant-123',
        }),
        expect.objectContaining({
          ttl: 300,
          layer: CacheLayer.L1_AND_L2,
          randomTTL: true,
        })
      );
    });
  });

  describe('loadAndCacheUserPermissions', () => {
    it('应该加载并缓存用户权限', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        tenantId: 'tenant-123',
        isSuperAdmin: false,
        roles: [{ id: 'role-123' }],
      };
      const mockRole = {
        id: 'role-123',
        permissions: [{ id: 'perm-123', name: 'test' }],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue([mockRole]);
      dataScopeRepository.find.mockResolvedValue([]);
      fieldPermissionRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.loadAndCacheUserPermissions(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.userId).toBe(userId);
      expect(result?.cachedAt).toBeInstanceOf(Date);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('应该合并多个角色的权限', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        tenantId: 'tenant-123',
        isSuperAdmin: false,
        roles: [{ id: 'role-1' }, { id: 'role-2' }],
      };
      const mockRoles = [
        {
          id: 'role-1',
          permissions: [{ id: 'perm-1', name: 'perm1' }],
        },
        {
          id: 'role-2',
          permissions: [
            { id: 'perm-2', name: 'perm2' },
            { id: 'perm-1', name: 'perm1' }, // 重复权限
          ],
        },
      ];

      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue(mockRoles);
      dataScopeRepository.find.mockResolvedValue([]);
      fieldPermissionRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.loadAndCacheUserPermissions(userId);

      // Assert
      expect(result?.permissions.length).toBe(2); // 去重后只有2个
    });
  });

  describe('invalidateCache', () => {
    it('应该清除指定用户的缓存', async () => {
      // Arrange
      const userId = 'user-123';
      cacheService.del.mockResolvedValue(undefined);

      // Act
      await service.invalidateCache(userId);

      // Assert
      expect(cacheService.del).toHaveBeenCalledWith(expect.stringContaining(userId));
    });

    it('应该清空所有缓存', async () => {
      // Arrange
      cacheService.delPattern.mockResolvedValue(undefined);

      // Act
      await service.invalidateCache(); // 不传参数，清空所有

      // Assert
      expect(cacheService.delPattern).toHaveBeenCalledWith(
        expect.stringContaining('permissions:user:')
      );
    });
  });

  describe('invalidateCacheByRole', () => {
    it('应该清除拥有指定角色的所有用户缓存', async () => {
      // Arrange
      const roleId = 'role-123';
      const mockUsers = [
        {
          id: 'user-1',
          roles: [{ id: 'role-123' }], // 有目标角色
        },
        {
          id: 'user-2',
          roles: [{ id: 'role-123' }], // 也有目标角色
        },
        {
          id: 'user-3',
          roles: [{ id: 'role-456' }], // 没有目标角色
        },
      ];

      userRepository.find.mockResolvedValue(mockUsers);
      cacheService.del.mockResolvedValue(undefined);

      // Act
      await service.invalidateCacheByRole(roleId);

      // Assert
      expect(userRepository.find).toHaveBeenCalled();
      expect(cacheService.del).toHaveBeenCalledTimes(2); // 只有user-1和user-2
    });
  });

  describe('invalidateCacheByTenant', () => {
    it('应该清除指定租户的所有用户缓存', async () => {
      // Arrange
      const tenantId = 'tenant-123';
      const mockUsers = [{ id: 'user-1' }, { id: 'user-2' }];

      userRepository.find.mockResolvedValue(mockUsers);
      cacheService.del.mockResolvedValue(undefined);

      // Act
      await service.invalidateCacheByTenant(tenantId);

      // Assert
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { tenantId },
        select: ['id'],
      });
      expect(cacheService.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('warmupCache', () => {
    it('应该预热指定用户的缓存', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2', 'user-3'];

      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        tenantId: 'tenant-123',
        isSuperAdmin: false,
        roles: [],
      });
      roleRepository.find.mockResolvedValue([]);
      dataScopeRepository.find.mockResolvedValue([]);
      fieldPermissionRepository.find.mockResolvedValue([]);
      cacheService.get.mockResolvedValue(null);

      // Act
      await service.warmupCache(userIds);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledTimes(3);
      expect(cacheService.set).toHaveBeenCalledTimes(3);
    });
  });

  describe('warmupActiveUsersCache', () => {
    it('应该预热活跃用户的缓存', async () => {
      // Arrange
      const mockActiveUsers = [{ id: 'user-1' }, { id: 'user-2' }];

      userRepository.find.mockResolvedValue(mockActiveUsers);
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        tenantId: 'tenant-123',
        isSuperAdmin: false,
        roles: [],
      });
      roleRepository.find.mockResolvedValue([]);
      dataScopeRepository.find.mockResolvedValue([]);
      fieldPermissionRepository.find.mockResolvedValue([]);
      cacheService.get.mockResolvedValue(null);

      // Act
      await service.warmupActiveUsersCache(10);

      // Assert
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { status: 'active' },
        select: ['id'],
        order: { lastLoginAt: 'DESC' },
        take: 10,
      });
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('应该返回缓存统计信息', () => {
      // Arrange
      const mockStats = {
        l1: {
          hits: 100,
          misses: 20,
          keys: 10,
          hitRate: '83.33%',
        },
        l2: {
          hits: 50,
          misses: 10,
          hitRate: '83.33%',
        },
        total: {
          hits: 150,
          misses: 30,
          hitRate: '83.33%',
        },
        enabled: true,
        ttl: 300,
      };
      cacheService.getStats.mockReturnValue(mockStats);

      // Act
      const stats = service.getCacheStats();

      // Assert
      expect(stats).toHaveProperty('l1');
      expect(stats).toHaveProperty('l2');
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('enabled');
      expect(stats).toHaveProperty('ttl');
      expect(stats.enabled).toBe(true);
      expect(stats.ttl).toBe(300);
      expect(cacheService.getStats).toHaveBeenCalled();
    });
  });
});
