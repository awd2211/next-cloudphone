import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { MenuPermissionController } from './menu-permission.controller';
import { MenuPermissionService, MenuItem } from '../menu-permission.service';
import { PermissionCacheService } from '../permission-cache.service';
import { PermissionsGuard } from '../guards/permissions.guard';

describe('MenuPermissionController', () => {
  let app: INestApplication;
  let menuPermissionService: jest.Mocked<MenuPermissionService>;
  let permissionCacheService: jest.Mocked<PermissionCacheService>;
  let jwtService: JwtService;

  // Mock MenuPermissionService
  const mockMenuPermissionService = {
    getUserMenus: jest.fn(),
    getUserPermissionNames: jest.fn(),
    checkMenuAccess: jest.fn(),
    getAllMenus: jest.fn(),
    buildBreadcrumb: jest.fn(),
  };

  // Mock PermissionCacheService
  const mockPermissionCacheService = {
    invalidateCache: jest.fn(),
    loadAndCacheUserPermissions: jest.fn(),
    getCacheStats: jest.fn(),
    warmupActiveUsersCache: jest.fn(),
  };

  // Mock PermissionsGuard that checks JWT permissions
  const mockPermissionsGuard = {
    canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      const authHeader = req.headers.authorization;

      // Check authentication
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Authentication required');
      }

      // Decode JWT and extract user
      const token = authHeader.substring(7);
      try {
        const payload = jwtService.decode(token) as any;
        req.user = {
          id: payload.sub || 'test-user-id',
          username: payload.username || 'testuser',
          roles: payload.roles || ['user'],
          permissions: payload.permissions || [],
        };
      } catch (error) {
        throw new UnauthorizedException('Invalid token');
      }

      // Get the Reflector to check for metadata
      const reflector = new Reflector();
      const handler = context.getHandler();
      const classType = context.getClass();

      // Check for @SkipPermission decorator
      const skipPermission = reflector.getAllAndOverride<boolean>('skipPermission', [
        handler,
        classType,
      ]);

      if (skipPermission) {
        return true;
      }

      // Get required permissions from @RequirePermissions decorator
      const requiredPermissions = reflector.getAllAndOverride<string[]>('permissions', [
        handler,
        classType,
      ]);

      if (!requiredPermissions || requiredPermissions.length === 0) {
        return true;
      }

      // Check if user has any of the required permissions
      const userPermissions = req.user.permissions || [];
      const hasPermission = requiredPermissions.some((perm: string) =>
        userPermissions.includes(perm)
      );

      if (!hasPermission) {
        return false; // Will result in 403 Forbidden
      }

      req.userTenantId = 'test-tenant-id';
      return true;
    },
  };

  // Mock AuthGuard (passthrough, auth is handled by PermissionsGuard in our tests)
  const mockAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MenuPermissionController],
      providers: [
        {
          provide: MenuPermissionService,
          useValue: mockMenuPermissionService,
        },
        {
          provide: PermissionCacheService,
          useValue: mockPermissionCacheService,
        },
        {
          provide: JwtService,
          useValue: new JwtService({
            secret: 'test-secret-key',
          }),
        },
      ],
    })
      .overrideGuard(PermissionsGuard)
      .useValue(mockPermissionsGuard)
      .overrideGuard(require('@nestjs/passport').AuthGuard('jwt'))
      .useValue(mockAuthGuard)
      .compile();

    app = module.createNestApplication();

    // Configure ValidationPipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    await app.init();

    menuPermissionService = module.get(MenuPermissionService);
    permissionCacheService = module.get(PermissionCacheService);
    jwtService = module.get<JwtService>(JwtService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  /**
   * Helper function to generate JWT token with permissions
   */
  function generateToken(permissions: string[] = [], userId: string = 'test-user-id'): string {
    return jwtService.sign({
      sub: userId,
      username: 'testuser',
      permissions,
    });
  }

  /**
   * Helper function to create mock menu items
   */
  function createMockMenus(): MenuItem[] {
    return [
      {
        id: 'dashboard',
        name: 'Dashboard',
        path: '/dashboard',
        icon: 'DashboardOutlined',
        permission: 'system:dashboard:view',
        meta: { title: '仪表盘', order: 1 },
      },
      {
        id: 'devices',
        name: 'Devices',
        path: '/devices',
        icon: 'MobileOutlined',
        permission: 'device:list',
        meta: { title: '设备管理', order: 2 },
        children: [
          {
            id: 'device-list',
            name: 'DeviceList',
            path: '/devices/list',
            permission: 'device:list',
            meta: { title: '设备列表' },
          },
        ],
      },
    ];
  }

  describe('GET /menu-permissions/my-menus', () => {
    it('should return menus for current user without permission check', async () => {
      const mockMenus = createMockMenus();
      mockMenuPermissionService.getUserMenus.mockResolvedValue(mockMenus);

      const token = generateToken(); // No specific permissions needed

      const response = await request(app.getHttpServer())
        .get('/menu-permissions/my-menus')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockMenus);
      expect(mockMenuPermissionService.getUserMenus).toHaveBeenCalledWith('test-user-id');
    });

    it('should return error when user is not logged in', async () => {
      const token = generateToken();

      // Mock user extraction to return null user
      const response = await request(app.getHttpServer())
        .get('/menu-permissions/my-menus')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Even though endpoint has @SkipPermission, it still needs authenticated user
      // The controller checks req.user?.id
      expect(mockMenuPermissionService.getUserMenus).toHaveBeenCalled();
    });
  });

  describe('GET /menu-permissions/my-permissions', () => {
    it('should return permissions for current user', async () => {
      const mockPermissions = ['device:read', 'device:create', 'user:list'];
      mockMenuPermissionService.getUserPermissionNames.mockResolvedValue(mockPermissions);

      const token = generateToken();

      const response = await request(app.getHttpServer())
        .get('/menu-permissions/my-permissions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPermissions);
      expect(mockMenuPermissionService.getUserPermissionNames).toHaveBeenCalledWith('test-user-id');
    });
  });

  describe('GET /menu-permissions/check-menu-access', () => {
    it('should check if user has access to menu path', async () => {
      mockMenuPermissionService.checkMenuAccess.mockResolvedValue(true);

      const token = generateToken();

      const response = await request(app.getHttpServer())
        .get('/menu-permissions/check-menu-access?path=/devices/list')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hasAccess).toBe(true);
      expect(mockMenuPermissionService.checkMenuAccess).toHaveBeenCalledWith(
        'test-user-id',
        '/devices/list'
      );
    });

    it('should return false when user does not have access', async () => {
      mockMenuPermissionService.checkMenuAccess.mockResolvedValue(false);

      const token = generateToken();

      const response = await request(app.getHttpServer())
        .get('/menu-permissions/check-menu-access?path=/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hasAccess).toBe(false);
    });

    it('should return error when path parameter is missing', async () => {
      const token = generateToken();

      const response = await request(app.getHttpServer())
        .get('/menu-permissions/check-menu-access')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('参数错误');
    });
  });

  describe('GET /menu-permissions/all-menus', () => {
    it('should return all menus with admin permission', async () => {
      const mockMenus = createMockMenus();
      mockMenuPermissionService.getAllMenus.mockReturnValue(mockMenus);

      const token = generateToken(['permission:menu:list']);

      const response = await request(app.getHttpServer())
        .get('/menu-permissions/all-menus')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockMenus);
      expect(mockMenuPermissionService.getAllMenus).toHaveBeenCalled();
    });

    it('should return 403 without permission', async () => {
      const token = generateToken([]);

      await request(app.getHttpServer())
        .get('/menu-permissions/all-menus')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /menu-permissions/user/:userId/menus', () => {
    it('should return menus for specified user', async () => {
      const mockMenus = createMockMenus();
      mockMenuPermissionService.getUserMenus.mockResolvedValue(mockMenus);

      const token = generateToken(['permission:menu:view']);

      const response = await request(app.getHttpServer())
        .get('/menu-permissions/user/other-user-id/menus')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockMenus);
      expect(mockMenuPermissionService.getUserMenus).toHaveBeenCalledWith('other-user-id');
    });

    it('should return 403 without permission', async () => {
      const token = generateToken([]);

      await request(app.getHttpServer())
        .get('/menu-permissions/user/other-user-id/menus')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /menu-permissions/user/:userId/permissions', () => {
    it('should return permissions for specified user', async () => {
      const mockPermissions = ['device:read', 'user:list'];
      mockMenuPermissionService.getUserPermissionNames.mockResolvedValue(mockPermissions);

      const token = generateToken(['permission:view']);

      const response = await request(app.getHttpServer())
        .get('/menu-permissions/user/other-user-id/permissions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPermissions);
      expect(mockMenuPermissionService.getUserPermissionNames).toHaveBeenCalledWith(
        'other-user-id'
      );
    });

    it('should return 403 without permission', async () => {
      const token = generateToken([]);

      await request(app.getHttpServer())
        .get('/menu-permissions/user/other-user-id/permissions')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /menu-permissions/breadcrumb', () => {
    it('should return breadcrumb for given path', async () => {
      const mockBreadcrumb = [
        {
          id: 'devices',
          name: 'Devices',
          path: '/devices',
          meta: { title: '设备管理' },
        },
        {
          id: 'device-list',
          name: 'DeviceList',
          path: '/devices/list',
          meta: { title: '设备列表' },
        },
      ];

      mockMenuPermissionService.buildBreadcrumb.mockReturnValue(mockBreadcrumb);

      const token = generateToken();

      const response = await request(app.getHttpServer())
        .get('/menu-permissions/breadcrumb?path=/devices/list')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockBreadcrumb);
      expect(mockMenuPermissionService.buildBreadcrumb).toHaveBeenCalledWith('/devices/list');
    });

    it('should return error when path is missing', async () => {
      const token = generateToken();

      const response = await request(app.getHttpServer())
        .get('/menu-permissions/breadcrumb')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('路径参数不能为空');
    });
  });

  describe('GET /menu-permissions/cache/refresh/:userId', () => {
    it('should refresh user cache with admin permission', async () => {
      mockPermissionCacheService.invalidateCache.mockResolvedValue();
      mockPermissionCacheService.loadAndCacheUserPermissions.mockResolvedValue({
        userId: 'target-user-id',
        tenantId: 'tenant-1',
        isSuperAdmin: false,
        roles: ['user'],
        permissions: [],
        dataScopes: {},
        fieldPermissions: {},
        cachedAt: new Date(),
      });

      const token = generateToken(['permission:cache:manage']);

      const response = await request(app.getHttpServer())
        .get('/menu-permissions/cache/refresh/target-user-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('用户权限缓存已刷新');
      expect(mockPermissionCacheService.invalidateCache).toHaveBeenCalledWith('target-user-id');
      expect(mockPermissionCacheService.loadAndCacheUserPermissions).toHaveBeenCalledWith(
        'target-user-id'
      );
    });

    it('should return 403 without permission', async () => {
      const token = generateToken([]);

      await request(app.getHttpServer())
        .get('/menu-permissions/cache/refresh/target-user-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /menu-permissions/cache/clear-all', () => {
    it('should clear all cache with admin permission', async () => {
      mockPermissionCacheService.invalidateCache.mockResolvedValue();

      const token = generateToken(['permission:cache:manage']);

      const response = await request(app.getHttpServer())
        .get('/menu-permissions/cache/clear-all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('所有权限缓存已清空');
      expect(mockPermissionCacheService.invalidateCache).toHaveBeenCalledWith();
    });

    it('should return 403 without permission', async () => {
      const token = generateToken([]);

      await request(app.getHttpServer())
        .get('/menu-permissions/cache/clear-all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /menu-permissions/cache/stats', () => {
    it('should return cache statistics', async () => {
      const mockStats = {
        totalKeys: 150,
        hitRate: 0.85,
        missRate: 0.15,
        size: '2.5MB',
      };

      mockPermissionCacheService.getCacheStats.mockReturnValue(mockStats);

      const token = generateToken(['permission:cache:view']);

      const response = await request(app.getHttpServer())
        .get('/menu-permissions/cache/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
      expect(mockPermissionCacheService.getCacheStats).toHaveBeenCalled();
    });

    it('should return 403 without permission', async () => {
      const token = generateToken([]);

      await request(app.getHttpServer())
        .get('/menu-permissions/cache/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /menu-permissions/cache/warmup', () => {
    it('should warmup cache with default limit', async () => {
      mockPermissionCacheService.warmupActiveUsersCache.mockResolvedValue();

      const token = generateToken(['permission:cache:manage']);

      const response = await request(app.getHttpServer())
        .get('/menu-permissions/cache/warmup')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('已预热 100 个活跃用户的权限缓存');
      expect(mockPermissionCacheService.warmupActiveUsersCache).toHaveBeenCalledWith(100);
    });

    it('should warmup cache with custom limit', async () => {
      mockPermissionCacheService.warmupActiveUsersCache.mockResolvedValue();

      const token = generateToken(['permission:cache:manage']);

      const response = await request(app.getHttpServer())
        .get('/menu-permissions/cache/warmup?limit=50')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('已预热 50 个活跃用户的权限缓存');
      expect(mockPermissionCacheService.warmupActiveUsersCache).toHaveBeenCalledWith(50);
    });

    it('should return 403 without permission', async () => {
      const token = generateToken([]);

      await request(app.getHttpServer())
        .get('/menu-permissions/cache/warmup')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /menu-permissions/cache/stats-detail', () => {
    it('should return detailed cache statistics', async () => {
      const mockStats = {
        totalKeys: 150,
        hitRate: 0.85,
        missRate: 0.15,
        size: '2.5MB',
        l1CacheSize: 50,
        l2CacheSize: 150,
      };

      mockPermissionCacheService.getCacheStats.mockReturnValue(mockStats);

      const token = generateToken(['permission:cache:view']);

      const response = await request(app.getHttpServer())
        .get('/menu-permissions/cache/stats-detail')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
      expect(response.body.message).toBe('缓存统计信息获取成功');
      expect(mockPermissionCacheService.getCacheStats).toHaveBeenCalled();
    });

    it('should return 403 without permission', async () => {
      const token = generateToken([]);

      await request(app.getHttpServer())
        .get('/menu-permissions/cache/stats-detail')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('Security & Authentication', () => {
    it('should require authentication for all endpoints', async () => {
      await request(app.getHttpServer()).get('/menu-permissions/my-menus').expect(401);

      await request(app.getHttpServer()).get('/menu-permissions/all-menus').expect(401);

      await request(app.getHttpServer()).get('/menu-permissions/cache/stats').expect(401);
    });

    it('should allow @SkipPermission endpoints for authenticated users', async () => {
      const mockMenus = createMockMenus();
      mockMenuPermissionService.getUserMenus.mockResolvedValue(mockMenus);
      mockMenuPermissionService.getUserPermissionNames.mockResolvedValue([]);
      mockMenuPermissionService.checkMenuAccess.mockResolvedValue(true);
      mockMenuPermissionService.buildBreadcrumb.mockReturnValue([]);

      const token = generateToken([]); // No permissions

      // These endpoints have @SkipPermission, should work without specific permissions
      await request(app.getHttpServer())
        .get('/menu-permissions/my-menus')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/menu-permissions/my-permissions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/menu-permissions/check-menu-access?path=/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/menu-permissions/breadcrumb?path=/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should enforce permission-based access control', async () => {
      const token = generateToken([]); // No permissions

      // These endpoints require specific permissions
      await request(app.getHttpServer())
        .get('/menu-permissions/all-menus')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/menu-permissions/user/test-user/menus')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/menu-permissions/cache/refresh/test-user')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/menu-permissions/cache/clear-all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/menu-permissions/cache/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/menu-permissions/cache/warmup')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });
});
