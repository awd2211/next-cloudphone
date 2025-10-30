import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CacheWarmupService } from './cache-warmup.service';
import { CacheService } from './cache.service';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { createMockRepository } from '@cloudphone/shared/testing';

describe('CacheWarmupService', () => {
  let service: CacheWarmupService;
  let cacheService: CacheService;
  let roleRepository: ReturnType<typeof createMockRepository>;
  let permissionRepository: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    roleRepository = createMockRepository();
    permissionRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheWarmupService,
        {
          provide: CacheService,
          useValue: {
            set: jest.fn().mockResolvedValue(true),
            delPattern: jest.fn().mockResolvedValue(10),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: roleRepository,
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: permissionRepository,
        },
      ],
    }).compile();

    service = module.get<CacheWarmupService>(CacheWarmupService);
    cacheService = module.get<CacheService>(CacheService);
  });

  beforeEach(() => {
    roleRepository.find.mockClear();
    permissionRepository.find.mockClear();
    (cacheService.set as jest.Mock).mockClear();
    (cacheService.delPattern as jest.Mock).mockClear();
  });

  describe('manualWarmup', () => {
    it('应该成功预热角色和权限', async () => {
      // Arrange
      const mockRoles = [
        { id: 'role-1', name: 'Admin', permissions: [] },
        { id: 'role-2', name: 'User', permissions: [] },
      ];
      const mockPermissions = [
        { id: 'perm-1', name: 'user:read' },
        { id: 'perm-2', name: 'user:write' },
      ];

      roleRepository.find.mockResolvedValue(mockRoles);
      permissionRepository.find.mockResolvedValue(mockPermissions);

      // Act
      await service.manualWarmup();

      // Assert
      expect(roleRepository.find).toHaveBeenCalledWith({
        relations: ['permissions'],
        take: 100,
      });
      expect(permissionRepository.find).toHaveBeenCalledWith({
        take: 200,
      });

      // 验证角色缓存
      expect(cacheService.set).toHaveBeenCalledWith(
        'role:role-1',
        mockRoles[0],
        { ttl: 600 },
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        'role:role-2',
        mockRoles[1],
        { ttl: 600 },
      );

      // 验证权限缓存
      expect(cacheService.set).toHaveBeenCalledWith(
        'permission:perm-1',
        mockPermissions[0],
        { ttl: 600 },
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        'permission:perm-2',
        mockPermissions[1],
        { ttl: 600 },
      );

      // 总共调用4次set
      expect(cacheService.set).toHaveBeenCalledTimes(4);
    });

    it('应该处理空角色列表', async () => {
      // Arrange
      roleRepository.find.mockResolvedValue([]);
      permissionRepository.find.mockResolvedValue([]);

      // Act
      await service.manualWarmup();

      // Assert
      expect(roleRepository.find).toHaveBeenCalled();
      expect(permissionRepository.find).toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('应该在角色查询失败时继续预热权限', async () => {
      // Arrange
      roleRepository.find.mockRejectedValue(new Error('Database error'));
      permissionRepository.find.mockResolvedValue([
        { id: 'perm-1', name: 'user:read' },
      ]);

      // Act
      await service.manualWarmup();

      // Assert
      expect(roleRepository.find).toHaveBeenCalled();
      expect(permissionRepository.find).toHaveBeenCalled();

      // 权限仍然应该被缓存
      expect(cacheService.set).toHaveBeenCalledWith(
        'permission:perm-1',
        expect.any(Object),
        { ttl: 600 },
      );
    });

    it('应该在权限查询失败时继续预热角色', async () => {
      // Arrange
      roleRepository.find.mockResolvedValue([
        { id: 'role-1', name: 'Admin', permissions: [] },
      ]);
      permissionRepository.find.mockRejectedValue(new Error('Database error'));

      // Act
      await service.manualWarmup();

      // Assert
      expect(roleRepository.find).toHaveBeenCalled();
      expect(permissionRepository.find).toHaveBeenCalled();

      // 角色仍然应该被缓存
      expect(cacheService.set).toHaveBeenCalledWith(
        'role:role-1',
        expect.any(Object),
        { ttl: 600 },
      );
    });

    it('应该限制预热的角色数量', async () => {
      // Arrange
      const mockRoles = Array.from({ length: 150 }, (_, i) => ({
        id: `role-${i}`,
        name: `Role ${i}`,
        permissions: [],
      }));
      roleRepository.find.mockResolvedValue(mockRoles);
      permissionRepository.find.mockResolvedValue([]);

      // Act
      await service.manualWarmup();

      // Assert
      expect(roleRepository.find).toHaveBeenCalledWith({
        relations: ['permissions'],
        take: 100, // 限制100个
      });
    });

    it('应该限制预热的权限数量', async () => {
      // Arrange
      roleRepository.find.mockResolvedValue([]);
      const mockPermissions = Array.from({ length: 300 }, (_, i) => ({
        id: `perm-${i}`,
        name: `Permission ${i}`,
      }));
      permissionRepository.find.mockResolvedValue(mockPermissions);

      // Act
      await service.manualWarmup();

      // Assert
      expect(permissionRepository.find).toHaveBeenCalledWith({
        take: 200, // 限制200个
      });
    });
  });

  describe('clearAndWarmup', () => {
    it('应该清除缓存并重新预热', async () => {
      // Arrange
      const mockRoles = [{ id: 'role-1', name: 'Admin', permissions: [] }];
      const mockPermissions = [{ id: 'perm-1', name: 'user:read' }];
      roleRepository.find.mockResolvedValue(mockRoles);
      permissionRepository.find.mockResolvedValue(mockPermissions);

      // Act
      await service.clearAndWarmup();

      // Assert
      // 验证清除操作
      expect(cacheService.delPattern).toHaveBeenCalledWith('user:*');
      expect(cacheService.delPattern).toHaveBeenCalledWith('role:*');
      expect(cacheService.delPattern).toHaveBeenCalledWith('permission:*');
      expect(cacheService.delPattern).toHaveBeenCalledTimes(3);

      // 验证预热操作
      expect(roleRepository.find).toHaveBeenCalled();
      expect(permissionRepository.find).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('应该在清除失败后仍然执行预热', async () => {
      // Arrange
      (cacheService.delPattern as jest.Mock).mockRejectedValue(
        new Error('Delete error'),
      );
      roleRepository.find.mockResolvedValue([
        { id: 'role-1', name: 'Admin', permissions: [] },
      ]);
      permissionRepository.find.mockResolvedValue([]);

      // Act
      await expect(service.clearAndWarmup()).rejects.toThrow('Delete error');

      // Assert
      expect(cacheService.delPattern).toHaveBeenCalled();
    });
  });

  describe('onModuleInit', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('应该在模块初始化后延迟预热', async () => {
      // Arrange
      roleRepository.find.mockResolvedValue([]);
      permissionRepository.find.mockResolvedValue([]);

      // Act
      service.onModuleInit();

      // Assert - 预热还未执行
      expect(roleRepository.find).not.toHaveBeenCalled();
      expect(permissionRepository.find).not.toHaveBeenCalled();

      // 快进5秒并运行所有pending的promises
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // Assert - 预热已执行
      expect(roleRepository.find).toHaveBeenCalled();
      expect(permissionRepository.find).toHaveBeenCalled();
    });
  });

  describe('错误恢复', () => {
    it('应该在所有操作失败时优雅处理', async () => {
      // Arrange
      roleRepository.find.mockRejectedValue(new Error('DB error 1'));
      permissionRepository.find.mockRejectedValue(new Error('DB error 2'));

      // Act & Assert - 不应该抛出异常
      await expect(service.manualWarmup()).resolves.not.toThrow();
    });

    it('应该在缓存服务失败时继续', async () => {
      // Arrange
      const mockRoles = [{ id: 'role-1', name: 'Admin', permissions: [] }];
      roleRepository.find.mockResolvedValue(mockRoles);
      permissionRepository.find.mockResolvedValue([]);
      (cacheService.set as jest.Mock).mockRejectedValue(
        new Error('Cache error'),
      );

      // Act & Assert - 不应该抛出异常
      await expect(service.manualWarmup()).resolves.not.toThrow();
    });
  });

  describe('并发性能', () => {
    it('应该并行预热角色和权限', async () => {
      // Arrange
      const mockRoles = [{ id: 'role-1', name: 'Admin', permissions: [] }];
      const mockPermissions = [{ id: 'perm-1', name: 'user:read' }];

      let rolesResolved = false;
      let permissionsResolved = false;

      roleRepository.find.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            rolesResolved = true;
            resolve(mockRoles);
          }, 100);
        });
      });

      permissionRepository.find.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            permissionsResolved = true;
            resolve(mockPermissions);
          }, 100);
        });
      });

      // Act
      const startTime = Date.now();
      await service.manualWarmup();
      const duration = Date.now() - startTime;

      // Assert
      expect(rolesResolved).toBe(true);
      expect(permissionsResolved).toBe(true);
      // 并行执行应该接近100ms，而不是200ms
      expect(duration).toBeLessThan(150);
    });
  });
});
