import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { DataScopeController } from './data-scope.controller';
import { DataScope, ScopeType } from '../../entities/data-scope.entity';
import { EnhancedPermissionsGuard } from '../guards/enhanced-permissions.guard';
import { AuditPermissionInterceptor } from '../interceptors/audit-permission.interceptor';
import { SanitizationPipe } from '@cloudphone/shared/validators/sanitization.pipe';

/**
 * DataScopeController 测试套件
 *
 * 测试覆盖：
 * - 9个CRUD端点
 * - 权限控制（@RequirePermissions, @SkipPermission）
 * - 审计装饰器（@AuditCreate, @AuditUpdate, @AuditDelete）
 * - 验证和错误处理
 */
describe('DataScopeController', () => {
  let app: INestApplication;
  let repository: jest.Mocked<Repository<DataScope>>;

  // Mock repository
  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  // Helper: Create mock DataScope
  const createMockDataScope = (overrides: Partial<DataScope> = {}): DataScope =>
    ({
      id: 'scope-123',
      roleId: 'role-123',
      resourceType: 'device',
      scopeType: ScopeType.DEPARTMENT,
      filter: {},
      departmentIds: ['dept-1'],
      includeSubDepartments: true,
      description: 'Test scope',
      isActive: true,
      priority: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as DataScope;

  // Helper: Generate JWT token with permissions
  const jwtService = new JwtService({ secret: 'test-secret' });
  const createAuthToken = (permissions: string[]): string => {
    return jwtService.sign({
      sub: 'test-user-id',
      username: 'testuser',
      roles: ['admin'],
      permissions,
    });
  };

  // Helper: Assert HTTP response
  const assertHttpResponse = (response: any, statusCode: number, expectedBody?: any) => {
    expect(response.status).toBe(statusCode);
    if (expectedBody) {
      expect(response.body).toMatchObject(expectedBody);
    }
  };

  // Mock EnhancedPermissionsGuard - simplified for controller testing
  // It checks user existence and permissions from JWT token
  const mockEnhancedPermissionsGuard = {
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

      // Get the Reflector to check for SKIP_PERMISSION_KEY
      const reflector = new Reflector();
      const handler = context.getHandler();
      const classType = context.getClass();

      // Check for @SkipPermission decorator
      const skipPermission = reflector.getAllAndOverride<boolean>('skipPermission', [
        handler,
        classType,
      ]);

      if (skipPermission) {
        return true; // Skip permission check
      }

      // Get required permissions from @RequirePermissions decorator
      const requiredPermissions = reflector.getAllAndOverride<string[]>('permissions', [
        handler,
        classType,
      ]);

      if (!requiredPermissions || requiredPermissions.length === 0) {
        return true; // No permission requirement
      }

      // Check if user has any of the required permissions
      const userPermissions = req.user.permissions || [];
      const hasPermission = requiredPermissions.some((perm: string) =>
        userPermissions.includes(perm)
      );

      if (!hasPermission) {
        return false; // Will result in 403 Forbidden
      }

      // Add userTenantId for compatibility
      req.userTenantId = 'test-tenant-id';

      return true;
    },
  };

  // Mock Audit Interceptor
  const mockAuditInterceptor = {
    intercept: (context: ExecutionContext, next: any) => next.handle(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataScopeController],
      providers: [
        {
          provide: getRepositoryToken(DataScope),
          useValue: mockRepository,
        },
      ],
    })
      .overrideGuard(EnhancedPermissionsGuard)
      .useValue(mockEnhancedPermissionsGuard)
      .overrideInterceptor(AuditPermissionInterceptor)
      .useValue(mockAuditInterceptor)
      .compile();

    app = module.createNestApplication();

    // Apply ValidationPipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    // Apply SanitizationPipe
    app.useGlobalPipes(
      new SanitizationPipe({
        enableHtmlSanitization: true,
        enableSqlKeywordDetection: true,
        strictMode: false,
      })
    );

    // Inject mockAuthGuard manually in tests (via .set('Authorization'))

    await app.init();
    repository = mockRepository as any;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock behaviors
    repository.find.mockResolvedValue([]);
    repository.findOne.mockResolvedValue(null);
    repository.create.mockImplementation((dto) => ({ ...createMockDataScope(), ...dto }) as any);
    repository.save.mockImplementation((entity) => Promise.resolve(entity));
    repository.remove.mockImplementation((entity) => Promise.resolve(entity));
  });

  describe('GET /data-scopes/meta/scope-types', () => {
    it('should return all scope types with labels', async () => {
      const token = createAuthToken(['permission:dataScope:view']);

      const response = await request(app.getHttpServer())
        .get('/data-scopes/meta/scope-types')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assertHttpResponse(response, 200, {
        success: true,
        data: expect.arrayContaining([
          { value: ScopeType.ALL, label: '全部数据' },
          { value: ScopeType.TENANT, label: '本租户数据' },
          { value: ScopeType.DEPARTMENT, label: '本部门及子部门数据' },
        ]),
      });
    });

    it('should return 403 when user lacks permission', async () => {
      const token = createAuthToken(['permission:dataScope:create']);

      await request(app.getHttpServer())
        .get('/data-scopes/meta/scope-types')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer()).get('/data-scopes/meta/scope-types').expect(401);
    });
  });

  describe('GET /data-scopes', () => {
    it('should return all data scopes without permission check (SkipPermission)', async () => {
      const mockScopes = [createMockDataScope(), createMockDataScope({ id: 'scope-456' })];
      repository.find.mockResolvedValue(mockScopes);
      const token = createAuthToken([]); // No permissions

      const response = await request(app.getHttpServer())
        .get('/data-scopes')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assertHttpResponse(response, 200, {
        success: true,
        data: expect.any(Array),
        total: 2,
      });
      expect(repository.find).toHaveBeenCalledWith({
        where: {},
        order: { priority: 'ASC', createdAt: 'DESC' },
      });
    });

    it('should filter by roleId', async () => {
      repository.find.mockResolvedValue([createMockDataScope()]);
      const token = createAuthToken([]);

      await request(app.getHttpServer())
        .get('/data-scopes?roleId=role-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(repository.find).toHaveBeenCalledWith({
        where: { roleId: 'role-123' },
        order: { priority: 'ASC', createdAt: 'DESC' },
      });
    });

    it('should filter by multiple parameters', async () => {
      repository.find.mockResolvedValue([]);
      const token = createAuthToken([]);

      await request(app.getHttpServer())
        .get('/data-scopes?roleId=role-123&resourceType=device&isActive=true')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(repository.find).toHaveBeenCalledWith({
        where: { roleId: 'role-123', resourceType: 'device', isActive: true },
        order: { priority: 'ASC', createdAt: 'DESC' },
      });
    });
  });

  describe('GET /data-scopes/:id', () => {
    it('should return data scope by id', async () => {
      const mockScope = createMockDataScope();
      repository.findOne.mockResolvedValue(mockScope);
      const token = createAuthToken(['permission:dataScope:view']);

      const response = await request(app.getHttpServer())
        .get('/data-scopes/scope-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assertHttpResponse(response, 200, {
        success: true,
        data: expect.objectContaining({ id: 'scope-123' }),
      });
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'scope-123' },
        relations: ['role'],
      });
    });

    it('should return error when scope not found', async () => {
      repository.findOne.mockResolvedValue(null);
      const token = createAuthToken(['permission:dataScope:view']);

      const response = await request(app.getHttpServer())
        .get('/data-scopes/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assertHttpResponse(response, 200, {
        success: false,
        message: '数据范围配置不存在',
      });
    });

    it('should return 403 without permission', async () => {
      const token = createAuthToken([]);

      await request(app.getHttpServer())
        .get('/data-scopes/scope-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /data-scopes/role/:roleId', () => {
    it('should return scopes grouped by resource type', async () => {
      const mockScopes = [
        createMockDataScope({ resourceType: 'device' }),
        createMockDataScope({ id: 'scope-456', resourceType: 'user' }),
        createMockDataScope({ id: 'scope-789', resourceType: 'device' }),
      ];
      repository.find.mockResolvedValue(mockScopes);
      const token = createAuthToken(['permission:dataScope:list']);

      const response = await request(app.getHttpServer())
        .get('/data-scopes/role/role-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assertHttpResponse(response, 200, {
        success: true,
        data: expect.objectContaining({
          device: expect.arrayContaining([expect.objectContaining({ resourceType: 'device' })]),
          user: expect.arrayContaining([expect.objectContaining({ resourceType: 'user' })]),
        }),
        total: 3,
      });
    });

    it('should return 403 without permission', async () => {
      const token = createAuthToken(['permission:dataScope:view']);

      await request(app.getHttpServer())
        .get('/data-scopes/role/role-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('POST /data-scopes', () => {
    const createDto = {
      roleId: 'role-123',
      resourceType: 'device',
      scopeType: ScopeType.DEPARTMENT,
      departmentIds: ['dept-1'],
      description: 'Test scope',
    };

    it('should create data scope successfully', async () => {
      repository.findOne.mockResolvedValue(null); // No existing
      const mockScope = createMockDataScope(createDto);
      repository.save.mockResolvedValue(mockScope);
      const token = createAuthToken(['permission:dataScope:create']);

      const response = await request(app.getHttpServer())
        .post('/data-scopes')
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(201);

      assertHttpResponse(response, 201, {
        success: true,
        message: '数据范围配置创建成功',
        data: expect.objectContaining({ roleId: 'role-123' }),
      });
    });

    it('should return error when duplicate scope exists', async () => {
      repository.findOne.mockResolvedValue(createMockDataScope()); // Existing
      const token = createAuthToken(['permission:dataScope:create']);

      const response = await request(app.getHttpServer())
        .post('/data-scopes')
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(201);

      assertHttpResponse(response, 201, {
        success: false,
        message: '该角色对此资源类型的数据范围配置已存在',
      });
    });

    it('should return 403 without permission', async () => {
      const token = createAuthToken(['permission:dataScope:view']);

      await request(app.getHttpServer())
        .post('/data-scopes')
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(403);
    });
  });

  describe('PUT /data-scopes/:id', () => {
    const updateDto = {
      description: 'Updated description',
      priority: 50,
    };

    it('should update data scope successfully', async () => {
      const mockScope = createMockDataScope();
      repository.findOne.mockResolvedValue(mockScope);
      repository.save.mockResolvedValue({ ...mockScope, ...updateDto });
      const token = createAuthToken(['permission:dataScope:update']);

      const response = await request(app.getHttpServer())
        .put('/data-scopes/scope-123')
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(200);

      assertHttpResponse(response, 200, {
        success: true,
        message: '数据范围配置更新成功',
      });
    });

    it('should return error when scope not found', async () => {
      repository.findOne.mockResolvedValue(null);
      const token = createAuthToken(['permission:dataScope:update']);

      const response = await request(app.getHttpServer())
        .put('/data-scopes/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(200);

      assertHttpResponse(response, 200, {
        success: false,
        message: '数据范围配置不存在',
      });
    });
  });

  describe('DELETE /data-scopes/:id', () => {
    it('should delete data scope successfully', async () => {
      const mockScope = createMockDataScope();
      repository.findOne.mockResolvedValue(mockScope);
      const token = createAuthToken(['permission:dataScope:delete']);

      const response = await request(app.getHttpServer())
        .delete('/data-scopes/scope-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assertHttpResponse(response, 200, {
        success: true,
        message: '数据范围配置删除成功',
      });
      expect(repository.remove).toHaveBeenCalledWith(mockScope);
    });

    it('should return error when scope not found', async () => {
      repository.findOne.mockResolvedValue(null);
      const token = createAuthToken(['permission:dataScope:delete']);

      const response = await request(app.getHttpServer())
        .delete('/data-scopes/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assertHttpResponse(response, 200, {
        success: false,
        message: '数据范围配置不存在',
      });
    });
  });

  describe('POST /data-scopes/batch', () => {
    it('should create multiple scopes successfully', async () => {
      const batchDto = [
        {
          roleId: 'role-123',
          resourceType: 'device',
          scopeType: ScopeType.DEPARTMENT,
        },
        {
          roleId: 'role-123',
          resourceType: 'user',
          scopeType: ScopeType.SELF,
        },
      ];
      repository.save.mockResolvedValue([createMockDataScope(), createMockDataScope()]);
      const token = createAuthToken(['permission:dataScope:create']);

      const response = await request(app.getHttpServer())
        .post('/data-scopes/batch')
        .set('Authorization', `Bearer ${token}`)
        .send(batchDto)
        .expect(201);

      assertHttpResponse(response, 201, {
        success: true,
        message: '成功创建 2 条数据范围配置',
      });
    });
  });

  describe('PUT /data-scopes/:id/toggle', () => {
    it('should toggle scope active status', async () => {
      const mockScope = createMockDataScope({ isActive: true });
      repository.findOne.mockResolvedValue(mockScope);
      repository.save.mockResolvedValue({ ...mockScope, isActive: false });
      const token = createAuthToken(['permission:dataScope:update']);

      const response = await request(app.getHttpServer())
        .put('/data-scopes/scope-123/toggle')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assertHttpResponse(response, 200, {
        success: true,
        message: expect.stringMatching(/已禁用/),
      });
    });

    it('should return error when scope not found', async () => {
      repository.findOne.mockResolvedValue(null);
      const token = createAuthToken(['permission:dataScope:update']);

      const response = await request(app.getHttpServer())
        .put('/data-scopes/invalid-id/toggle')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assertHttpResponse(response, 200, {
        success: false,
        message: '数据范围配置不存在',
      });
    });
  });

  describe('Security & Edge Cases', () => {
    it('should require authentication for protected endpoints', async () => {
      await request(app.getHttpServer()).get('/data-scopes/meta/scope-types').expect(401);
      await request(app.getHttpServer()).get('/data-scopes/scope-123').expect(401);
      await request(app.getHttpServer()).post('/data-scopes').send({}).expect(401);
      await request(app.getHttpServer()).put('/data-scopes/scope-123').send({}).expect(401);
      await request(app.getHttpServer()).delete('/data-scopes/scope-123').expect(401);
    });

    it('should allow GET /data-scopes without specific permission (SkipPermission)', async () => {
      repository.find.mockResolvedValue([]);
      const token = createAuthToken([]); // No permissions

      await request(app.getHttpServer())
        .get('/data-scopes')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should enforce permission-based access control', async () => {
      const tokenNoPermissions = createAuthToken([]);

      // Should block endpoints that require permissions
      await request(app.getHttpServer())
        .get('/data-scopes/meta/scope-types')
        .set('Authorization', `Bearer ${tokenNoPermissions}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/data-scopes/scope-123')
        .set('Authorization', `Bearer ${tokenNoPermissions}`)
        .expect(403);

      await request(app.getHttpServer())
        .post('/data-scopes')
        .set('Authorization', `Bearer ${tokenNoPermissions}`)
        .send({})
        .expect(403);
    });
  });
});
