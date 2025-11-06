import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PermissionCacheService } from '../permission-cache.service';
import { PermissionCheckerService } from '../permission-checker.service';
import { Permission } from '../../entities/permission.entity';
import { DataScope } from '../../entities/data-scope.entity';
import { FieldPermission } from '../../entities/field-permission.entity';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { CacheService } from '../../cache/cache.service';

/**
 * 权限缓存集成测试
 * 测试 PermissionCacheService 与 PermissionCheckerService 的集成
 */
describe('PermissionCache Integration', () => {
  let cacheService: PermissionCacheService;
  let checkerService: PermissionCheckerService;
  let module: TestingModule;
  let mockCacheService: jest.Mocked<CacheService>;

  // Mock cache storage
  let cacheStorage: Map<string, any>;

  beforeAll(async () => {
    // Initialize cache storage
    cacheStorage = new Map();

    // Create mock CacheService
    mockCacheService = {
      get: jest.fn(async (key: string) => {
        return cacheStorage.get(key) || null;
      }),
      set: jest.fn(async (key: string, value: any) => {
        cacheStorage.set(key, value);
      }),
      del: jest.fn(async (key: string) => {
        cacheStorage.delete(key);
      }),
      delPattern: jest.fn(async (pattern: string) => {
        const keysToDelete = Array.from(cacheStorage.keys()).filter((k) =>
          k.startsWith(pattern.replace('*', ''))
        );
        keysToDelete.forEach((k) => cacheStorage.delete(k));
        return keysToDelete.length;
      }),
      getStats: jest.fn(() => ({
        size: cacheStorage.size,
        hits: 0,
        misses: 0,
        hitRate: 0,
      })),
    } as any;

    // Create mock repositories
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        PermissionCacheService,
        PermissionCheckerService,
        { provide: getRepositoryToken(Permission), useValue: mockRepository },
        { provide: getRepositoryToken(DataScope), useValue: mockRepository },
        { provide: getRepositoryToken(FieldPermission), useValue: mockRepository },
        { provide: getRepositoryToken(User), useValue: mockRepository },
        { provide: getRepositoryToken(Role), useValue: mockRepository },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    cacheService = module.get<PermissionCacheService>(PermissionCacheService);
    checkerService = module.get<PermissionCheckerService>(PermissionCheckerService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Cache Service', () => {
    it('should be defined', () => {
      expect(cacheService).toBeDefined();
      expect(checkerService).toBeDefined();
    });

    it('should have cache enabled', () => {
      const stats = cacheService.getCacheStats();
      expect(stats.enabled).toBe(true);
      expect(stats.ttl).toBe(300); // 5 minutes
    });

    it('should have CacheService injected', () => {
      expect(mockCacheService).toBeDefined();
      expect(mockCacheService.get).toBeDefined();
      expect(mockCacheService.set).toBeDefined();
      expect(mockCacheService.del).toBeDefined();
    });
  });

  describe('Cache Performance', () => {
    const testUserId = '10000000-0000-0000-0000-000000000001'; // admin user

    beforeEach(() => {
      // 清除缓存存储
      cacheStorage.clear();
      jest.clearAllMocks();
    });

    it('should call cache service methods', async () => {
      // Mock successful cache miss -> load from DB
      mockCacheService.get.mockResolvedValueOnce(null);

      // Mock repository to return user data
      const userRepo = module.get(getRepositoryToken(User));
      const roleRepo = module.get(getRepositoryToken(Role));

      userRepo.findOne = jest.fn().mockResolvedValue({
        id: testUserId,
        tenantId: 'tenant-1',
        isSuperAdmin: false,
        roles: [{ id: 'role-1' }],
      });

      roleRepo.find = jest.fn().mockResolvedValue([
        {
          id: 'role-1',
          permissions: [{ id: 'perm-1', code: 'user:read', name: 'Read Users' }],
        },
      ]);

      // 第一次调用 - 从数据库加载
      const cached1 = await cacheService.getUserPermissions(testUserId);

      expect(cached1).toBeDefined();
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `permissions:user:${testUserId}`,
        expect.any(Object)
      );
      expect(mockCacheService.set).toHaveBeenCalled();

      if (cached1) {
        expect(cached1.userId).toBe(testUserId);
        expect(cached1.permissions).toBeDefined();
        expect(Array.isArray(cached1.permissions)).toBe(true);
      }
    });

    it('should use cached data on second call', async () => {
      const mockCachedData = {
        userId: testUserId,
        tenantId: 'tenant-1',
        isSuperAdmin: false,
        roles: ['role-1'],
        permissions: [{ id: 'perm-1', code: 'user:read', name: 'Read Users' }],
        dataScopes: {},
        fieldPermissions: {},
        cachedAt: new Date(),
      };

      // Mock cache hit
      mockCacheService.get.mockResolvedValueOnce(mockCachedData);

      // 第二次调用 - 从缓存获取
      const cached2 = await cacheService.getUserPermissions(testUserId);

      expect(cached2).toBeDefined();
      expect(cached2).toEqual(mockCachedData);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `permissions:user:${testUserId}`,
        expect.any(Object)
      );
      // Should not call set since data came from cache
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should invalidate cache correctly', async () => {
      // Invalidate cache
      await cacheService.invalidateCache(testUserId);

      expect(mockCacheService.del).toHaveBeenCalledWith(`permissions:user:${testUserId}`);
    });

    it('should handle cache stats', () => {
      // Add some items to cache storage
      cacheStorage.set('permissions:user:user-1', {});
      cacheStorage.set('permissions:user:user-2', {});

      const stats = cacheService.getCacheStats();

      expect(stats).toMatchObject({
        enabled: true,
        ttl: 300,
        prefix: 'permissions:user:',
      });
      expect(stats.size).toBe(2);
    });
  });

  describe('Integration with PermissionChecker', () => {
    const testUserId = '10000000-0000-0000-0000-000000000001';

    beforeEach(() => {
      cacheStorage.clear();
      jest.clearAllMocks();
    });

    it('should integrate with permission checker', async () => {
      // Setup mock data
      const mockCachedData = {
        userId: testUserId,
        tenantId: 'tenant-1',
        isSuperAdmin: false,
        roles: ['role-1'],
        permissions: [
          { id: 'perm-1', code: 'user:read', name: 'Read Users' },
          { id: 'perm-2', code: 'user:create', name: 'Create Users' },
        ],
        dataScopes: {},
        fieldPermissions: {},
        cachedAt: new Date(),
      };

      mockCacheService.get.mockResolvedValue(mockCachedData);

      const userRepo = module.get(getRepositoryToken(User));
      userRepo.findOne = jest.fn().mockResolvedValue({
        id: testUserId,
        tenantId: 'tenant-1',
        isSuperAdmin: false,
        roles: [{ id: 'role-1' }],
      });

      // Test permission checking
      const result1 = await checkerService.checkFunctionPermission(testUserId, 'user:read');
      expect(typeof result1).toBe('boolean');

      // Verify cache was used
      expect(mockCacheService.get).toHaveBeenCalled();
    });
  });
});
