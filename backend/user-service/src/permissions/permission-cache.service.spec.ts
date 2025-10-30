import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PermissionCacheService } from './permission-cache.service';
import { Permission } from '../entities/permission.entity';
import { DataScope } from '../entities/data-scope.entity';
import { FieldPermission, OperationType } from '../entities/field-permission.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { createMockRepository } from '@cloudphone/shared/testing';

describe('PermissionCacheService', () => {
  let service: PermissionCacheService;
  let permissionRepository: ReturnType<typeof createMockRepository>;
  let dataScopeRepository: ReturnType<typeof createMockRepository>;
  let fieldPermissionRepository: ReturnType<typeof createMockRepository>;
  let userRepository: ReturnType<typeof createMockRepository>;
  let roleRepository: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    permissionRepository = createMockRepository();
    dataScopeRepository = createMockRepository();
    fieldPermissionRepository = createMockRepository();
    userRepository = createMockRepository();
    roleRepository = createMockRepository();

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
      ],
    }).compile();

    service = module.get<PermissionCacheService>(PermissionCacheService);
  });

  beforeEach(() => {
    userRepository.findOne.mockClear();
    userRepository.find.mockClear();
    roleRepository.find.mockClear();
    dataScopeRepository.find.mockClear();
    fieldPermissionRepository.find.mockClear();
  });

  describe('getUserPermissions', () => {
    it('应该从缓存返回用户权限', async () => {
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
      expect(userRepository.findOne).not.toHaveBeenCalled(); // 第二次没有查询数据库
    });

    it('应该对不存在的用户返回null', async () => {
      // Arrange
      const userId = 'nonexistent';
      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getUserPermissions(userId);

      // Assert
      expect(result).toBeNull();
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
      const mockUser = {
        id: userId,
        tenantId: 'tenant-123',
        isSuperAdmin: false,
        roles: [{ id: 'role-123' }],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue([{ id: 'role-123', permissions: [] }]);
      dataScopeRepository.find.mockResolvedValue([]);
      fieldPermissionRepository.find.mockResolvedValue([]);

      // 先加载到缓存
      await service.getUserPermissions(userId);
      userRepository.findOne.mockClear();

      // Act
      service.invalidateCache(userId);

      // 再次获取应该重新加载
      await service.getUserPermissions(userId);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalled();
    });

    it('应该清空所有缓存', async () => {
      // Arrange
      const userId1 = 'user-1';
      const userId2 = 'user-2';

      userRepository.findOne.mockResolvedValue({
        id: userId1,
        tenantId: 'tenant-123',
        isSuperAdmin: false,
        roles: [],
      });
      roleRepository.find.mockResolvedValue([]);
      dataScopeRepository.find.mockResolvedValue([]);
      fieldPermissionRepository.find.mockResolvedValue([]);

      // 加载两个用户的缓存
      await service.getUserPermissions(userId1);
      await service.getUserPermissions(userId2);

      // Act
      service.invalidateCache(); // 不传参数，清空所有

      // Assert
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('invalidateCacheByRole', () => {
    it('应该清除拥有指定角色的所有用户缓存', async () => {
      // Arrange
      const roleId = 'role-123';
      const mockUsers = [
        {
          id: 'user-1',
          roles: [{ id: 'role-123' }],
        },
        {
          id: 'user-2',
          roles: [{ id: 'role-456' }],
        },
      ];

      userRepository.find.mockResolvedValue(mockUsers);

      // Act
      await service.invalidateCacheByRole(roleId);

      // Assert
      expect(userRepository.find).toHaveBeenCalled();
    });
  });

  describe('invalidateCacheByTenant', () => {
    it('应该清除指定租户的所有用户缓存', async () => {
      // Arrange
      const tenantId = 'tenant-123';
      const mockUsers = [
        { id: 'user-1' },
        { id: 'user-2' },
      ];

      userRepository.find.mockResolvedValue(mockUsers);

      // Act
      await service.invalidateCacheByTenant(tenantId);

      // Assert
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { tenantId },
        select: ['id'],
      });
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

      // Act
      await service.warmupCache(userIds);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledTimes(3);
    });
  });

  describe('warmupActiveUsersCache', () => {
    it('应该预热活跃用户的缓存', async () => {
      // Arrange
      const mockActiveUsers = [
        { id: 'user-1' },
        { id: 'user-2' },
      ];

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

      // Act
      await service.warmupActiveUsersCache(10);

      // Assert
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { status: 'active' },
        select: ['id'],
        order: { lastLoginAt: 'DESC' },
        take: 10,
      });
    });
  });

  describe('getCacheStats', () => {
    it('应该返回缓存统计信息', () => {
      // Act
      const stats = service.getCacheStats();

      // Assert
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('enabled');
      expect(stats).toHaveProperty('ttl');
      expect(stats.enabled).toBe(true);
      expect(stats.ttl).toBe(300);
    });
  });

  describe('exportCache', () => {
    it('应该导出缓存数据快照', async () => {
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
        permissions: [{ id: 'perm-1' }, { id: 'perm-2' }],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue([mockRole]);
      dataScopeRepository.find.mockResolvedValue([]);
      fieldPermissionRepository.find.mockResolvedValue([]);

      // 先加载到缓存
      await service.getUserPermissions(userId);

      // Act
      const snapshot = service.exportCache();

      // Assert
      expect(snapshot.length).toBeGreaterThan(0);
      expect(snapshot[0]).toHaveProperty('userId');
      expect(snapshot[0]).toHaveProperty('tenantId');
      expect(snapshot[0]).toHaveProperty('rolesCount');
      expect(snapshot[0]).toHaveProperty('permissionsCount');
      expect(snapshot[0].permissionsCount).toBe(2);
    });
  });
});
