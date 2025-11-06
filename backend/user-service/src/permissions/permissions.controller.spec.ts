import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  NotFoundException,
  ConflictException,
  ExecutionContext,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common';
import request from 'supertest';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { createTestApp, generateTestJwt } from '@cloudphone/shared/testing/test-helpers';
import { createMockPermission } from '@cloudphone/shared/testing/mock-factories';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SanitizationPipe } from '@cloudphone/shared/validators/sanitization.pipe';

// Helper function for response assertions
const assertHttpResponse = (response: any, statusCode: number, expectedBody?: any) => {
  expect(response.status).toBe(statusCode);
  if (expectedBody) {
    expect(response.body).toMatchObject(expectedBody);
  }
};

describe('PermissionsController', () => {
  let app: INestApplication;
  let permissionsService: PermissionsService;

  const mockPermissionsService = {
    create: jest.fn(),
    bulkCreate: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByResource: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  // Helper to generate auth token with specific permissions
  const createAuthToken = (
    permissions: string[] = [
      'permission.read',
      'permission.create',
      'permission.update',
      'permission.delete',
    ]
  ) => {
    return generateTestJwt({
      sub: 'test-admin-id',
      username: 'admin',
      roles: ['admin'],
      permissions,
    });
  };

  beforeAll(async () => {
    // Create JwtService for token decoding
    const jwtService = new JwtService({ secret: 'test-secret' });

    // Mock guards with smart authentication check
    const mockAuthGuard = {
      canActivate: (context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest();

        // Check if Authorization header exists
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new UnauthorizedException('Authentication required'); // 抛出401异常
        }

        // Extract and decode JWT token
        const token = authHeader.substring(7); // Remove 'Bearer '
        try {
          const payload = jwtService.decode(token) as any;

          // Attach user with permissions from token
          req.user = {
            id: payload.sub || 'test-user-id',
            username: payload.username || 'testuser',
            roles: payload.roles || ['user'],
            permissions: payload.permissions || [],
          };
          return true;
        } catch (error) {
          // Invalid token
          throw new UnauthorizedException('Invalid token');
        }
      },
    };

    // Mock permissions guard to check user permissions
    const mockPermissionsGuard = {
      canActivate: (context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest();

        // If no user (auth failed), let auth guard handle it
        if (!req.user) {
          return true;
        }

        // Map routes to required permissions
        const method = req.method;
        const url = req.url.split('?')[0]; // Remove query params

        let requiredPermission: string | null = null;

        // Determine required permission based on route and method
        if (method === 'POST' && url === '/permissions') {
          requiredPermission = 'permission.create';
        } else if (method === 'POST' && url === '/permissions/bulk') {
          requiredPermission = 'permission.create';
        } else if (method === 'GET' && url === '/permissions') {
          requiredPermission = 'permission.read';
        } else if (method === 'GET' && url.startsWith('/permissions/resource/')) {
          requiredPermission = 'permission.read';
        } else if (method === 'GET' && url.match(/^\/permissions\/[^/]+$/)) {
          requiredPermission = 'permission.read';
        } else if (method === 'PATCH' && url.match(/^\/permissions\/[^/]+$/)) {
          requiredPermission = 'permission.update';
        } else if (method === 'DELETE' && url.match(/^\/permissions\/[^/]+$/)) {
          requiredPermission = 'permission.delete';
        }

        // If no specific permission required, allow access
        if (!requiredPermission) {
          return true;
        }

        // Check if user has the required permission
        const userPermissions = req.user.permissions || [];
        return userPermissions.includes(requiredPermission);
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PermissionsController],
      providers: [{ provide: PermissionsService, useValue: mockPermissionsService }],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue(mockAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockPermissionsGuard)
      .compile();

    app = moduleRef.createNestApplication();

    // 添加ValidationPipe用于DTO验证
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    // 添加SanitizationPipe用于XSS/SQL注入防护
    app.useGlobalPipes(
      new SanitizationPipe({
        enableHtmlSanitization: true,
        enableSqlKeywordDetection: true,
        strictMode: false, // 使用宽松模式，仅清理不拒绝
      })
    );

    await app.init();

    permissionsService = moduleRef.get<PermissionsService>(PermissionsService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // 清空所有mocks
    jest.clearAllMocks();

    // 设置默认的成功行为
    mockPermissionsService.create.mockResolvedValue(createMockPermission());
    mockPermissionsService.bulkCreate.mockResolvedValue([createMockPermission()]);
    mockPermissionsService.findAll.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    mockPermissionsService.findOne.mockResolvedValue(createMockPermission());
    mockPermissionsService.findByResource.mockResolvedValue([]);
    mockPermissionsService.update.mockResolvedValue(createMockPermission());
    mockPermissionsService.remove.mockResolvedValue(undefined);
  });

  describe('POST /permissions', () => {
    const createPermissionDto = {
      name: 'device.create',
      resource: 'device',
      action: 'create',
      displayName: 'Create Device',
      description: 'Allows creating new devices',
    };

    it('should create permission successfully when authenticated', async () => {
      // Arrange
      const mockPermission = createMockPermission(createPermissionDto);
      mockPermissionsService.create.mockResolvedValue(mockPermission);
      const token = createAuthToken(['permission.create']);

      // Act
      const response = await request(app.getHttpServer())
        .post('/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send(createPermissionDto)
        .expect(201);

      // Assert
      assertHttpResponse(response, 201, {
        success: true,
        data: expect.objectContaining({
          name: 'device.create',
          resource: 'device',
          action: 'create',
        }),
        message: '权限创建成功',
      });

      expect(mockPermissionsService.create).toHaveBeenCalledWith(createPermissionDto);
    });

    it('should return 403 when user lacks permission.create permission', async () => {
      // Arrange
      const token = createAuthToken(['permission.read']); // No create permission

      // Act
      await request(app.getHttpServer())
        .post('/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send(createPermissionDto)
        .expect(403);

      // Assert
      expect(mockPermissionsService.create).not.toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      // Act
      await request(app.getHttpServer()).post('/permissions').send(createPermissionDto).expect(401);
    });

    it('should return 400 when validation fails', async () => {
      // Arrange
      const invalidDto = { name: '' }; // Missing required fields
      const token = createAuthToken(['permission.create']);

      // Act
      await request(app.getHttpServer())
        .post('/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidDto)
        .expect(400);

      // Assert
      expect(mockPermissionsService.create).not.toHaveBeenCalled();
    });

    it('should return 409 when permission name already exists', async () => {
      // Arrange
      mockPermissionsService.create.mockRejectedValue(
        new ConflictException('Permission name already exists')
      );
      const token = createAuthToken(['permission.create']);

      // Act
      await request(app.getHttpServer())
        .post('/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send(createPermissionDto)
        .expect(409);
    });

    it('should validate permission name format (resource.action)', async () => {
      // Arrange
      const invalidNameDto = {
        ...createPermissionDto,
        name: 'invalid-format', // Should be resource.action
      };
      const token = createAuthToken(['permission.create']);

      // Act
      await request(app.getHttpServer())
        .post('/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidNameDto)
        .expect(400);
    });

    it('should create system permission when isSystem flag is true', async () => {
      // Arrange
      const systemPermissionDto = {
        ...createPermissionDto,
        name: 'system.admin',
        isSystem: true,
      };
      const mockPermission = createMockPermission({ ...systemPermissionDto, isSystem: true });
      mockPermissionsService.create.mockResolvedValue(mockPermission);
      const token = createAuthToken(['permission.create']);

      // Act
      const response = await request(app.getHttpServer())
        .post('/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send(systemPermissionDto)
        .expect(201);

      // Assert
      expect(response.body.data.isSystem).toBe(true);
    });
  });

  describe('POST /permissions/bulk', () => {
    const bulkCreateDto = [
      { name: 'device.create', resource: 'device', action: 'create', displayName: 'Create Device' },
      { name: 'device.read', resource: 'device', action: 'read', displayName: 'Read Device' },
      { name: 'device.update', resource: 'device', action: 'update', displayName: 'Update Device' },
      { name: 'device.delete', resource: 'device', action: 'delete', displayName: 'Delete Device' },
    ];

    it('should create multiple permissions successfully', async () => {
      // Arrange
      const mockPermissions = bulkCreateDto.map((dto) => createMockPermission(dto));
      mockPermissionsService.bulkCreate.mockResolvedValue(mockPermissions);
      const token = createAuthToken(['permission.create']);

      // Act
      const response = await request(app.getHttpServer())
        .post('/permissions/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissions: bulkCreateDto })
        .expect(201);

      // Assert
      assertHttpResponse(response, 201, {
        success: true,
        data: expect.any(Array),
        message: '成功创建 4 个权限',
      });

      expect(response.body.data).toHaveLength(4);
      expect(mockPermissionsService.bulkCreate).toHaveBeenCalledWith(bulkCreateDto);
    });

    it('should return 403 when user lacks permission.create permission', async () => {
      // Arrange
      const token = createAuthToken(['permission.read']);

      // Act
      await request(app.getHttpServer())
        .post('/permissions/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissions: bulkCreateDto })
        .expect(403);
    });

    it('should return 400 when array is empty', async () => {
      // Arrange
      const token = createAuthToken(['permission.create']);

      // Act
      await request(app.getHttpServer())
        .post('/permissions/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissions: [] })
        .expect(400);
    });

    it('should handle partial failures in bulk create', async () => {
      // Arrange
      mockPermissionsService.bulkCreate.mockRejectedValue(
        new Error('Permission "device.create" already exists')
      );
      const token = createAuthToken(['permission.create']);

      // Act
      await request(app.getHttpServer())
        .post('/permissions/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissions: bulkCreateDto })
        .expect(500);
    });

    it('should validate all permissions in bulk request', async () => {
      // Arrange
      const invalidBulkDto = [
        { name: 'device.create', resource: 'device', action: 'create', displayName: 'Create' },
        { name: 'invalid', resource: 'device', action: 'read', displayName: 'Read' }, // Invalid name format
      ];
      const token = createAuthToken(['permission.create']);

      // Act
      await request(app.getHttpServer())
        .post('/permissions/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissions: invalidBulkDto })
        .expect(400);
    });

    it('should create CRUD permissions for a resource', async () => {
      // Arrange
      const crudPermissions = ['create', 'read', 'update', 'delete'].map((action) => ({
        name: `user.${action}`,
        resource: 'user',
        action,
        displayName: `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      }));

      const mockPermissions = crudPermissions.map((p) => createMockPermission(p));
      mockPermissionsService.bulkCreate.mockResolvedValue(mockPermissions);
      const token = createAuthToken(['permission.create']);

      // Act
      const response = await request(app.getHttpServer())
        .post('/permissions/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissions: crudPermissions })
        .expect(201);

      // Assert
      expect(response.body.data).toHaveLength(4);
      expect(response.body.message).toBe('成功创建 4 个权限');
    });
  });

  describe('GET /permissions', () => {
    it('should return paginated permission list', async () => {
      // Arrange
      const mockPermissions = [
        createMockPermission({ name: 'user.create' }),
        createMockPermission({ name: 'user.read' }),
        createMockPermission({ name: 'user.update' }),
      ];
      const mockResult = {
        data: mockPermissions,
        total: 3,
        page: 1,
        limit: 10,
      };
      mockPermissionsService.findAll.mockResolvedValue(mockResult);
      const token = createAuthToken(['permission.read']);

      // Act
      const response = await request(app.getHttpServer())
        .get('/permissions?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      assertHttpResponse(response, 200, {
        success: true,
        data: expect.any(Array),
        total: 3,
        page: 1,
        limit: 10,
      });

      expect(response.body.data).toHaveLength(3);
    });

    it('should filter by resource when provided', async () => {
      // Arrange
      const devicePermissions = [
        createMockPermission({ name: 'device.create', resource: 'device' }),
        createMockPermission({ name: 'device.read', resource: 'device' }),
      ];
      mockPermissionsService.findAll.mockResolvedValue({
        data: devicePermissions,
        total: 2,
        page: 1,
        limit: 10,
      });
      const token = createAuthToken(['permission.read']);

      // Act
      await request(app.getHttpServer())
        .get('/permissions?resource=device')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockPermissionsService.findAll).toHaveBeenCalledWith(1, 10, 'device');
    });

    it('should use default pagination when not provided', async () => {
      // Arrange
      mockPermissionsService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });
      const token = createAuthToken(['permission.read']);

      // Act
      await request(app.getHttpServer())
        .get('/permissions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockPermissionsService.findAll).toHaveBeenCalledWith(1, 10, undefined);
    });

    it('should return 403 when user lacks permission.read permission', async () => {
      // Arrange
      const token = createAuthToken(['permission.create']);

      // Act
      await request(app.getHttpServer())
        .get('/permissions')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should handle large page numbers', async () => {
      // Arrange
      mockPermissionsService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 100,
        limit: 10,
      });
      const token = createAuthToken(['permission.read']);

      // Act
      await request(app.getHttpServer())
        .get('/permissions?page=100')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('GET /permissions/resource/:resource', () => {
    it('should return all permissions for a specific resource', async () => {
      // Arrange
      const devicePermissions = [
        createMockPermission({ name: 'device.create', resource: 'device', action: 'create' }),
        createMockPermission({ name: 'device.read', resource: 'device', action: 'read' }),
        createMockPermission({ name: 'device.update', resource: 'device', action: 'update' }),
        createMockPermission({ name: 'device.delete', resource: 'device', action: 'delete' }),
      ];
      mockPermissionsService.findByResource.mockResolvedValue(devicePermissions);
      const token = createAuthToken(['permission.read']);

      // Act
      const response = await request(app.getHttpServer())
        .get('/permissions/resource/device')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      assertHttpResponse(response, 200, {
        success: true,
        data: expect.any(Array),
      });

      expect(response.body.data).toHaveLength(4);
      expect(mockPermissionsService.findByResource).toHaveBeenCalledWith('device');
    });

    it('should return empty array when resource has no permissions', async () => {
      // Arrange
      mockPermissionsService.findByResource.mockResolvedValue([]);
      const token = createAuthToken(['permission.read']);

      // Act
      const response = await request(app.getHttpServer())
        .get('/permissions/resource/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.data).toEqual([]);
    });

    it('should return 403 when user lacks permission.read permission', async () => {
      // Arrange
      const token = createAuthToken(['permission.create']);

      // Act
      await request(app.getHttpServer())
        .get('/permissions/resource/device')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should handle special characters in resource name', async () => {
      // Arrange
      mockPermissionsService.findByResource.mockResolvedValue([]);
      const token = createAuthToken(['permission.read']);

      // Act
      await request(app.getHttpServer())
        .get('/permissions/resource/device-service')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockPermissionsService.findByResource).toHaveBeenCalledWith('device-service');
    });
  });

  describe('GET /permissions/:id', () => {
    it('should return permission details when permission exists', async () => {
      // Arrange
      const mockPermission = createMockPermission({
        id: 'perm-123',
        name: 'device.create',
        resource: 'device',
        action: 'create',
      });
      mockPermissionsService.findOne.mockResolvedValue(mockPermission);
      const token = createAuthToken(['permission.read']);

      // Act
      const response = await request(app.getHttpServer())
        .get('/permissions/perm-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      assertHttpResponse(response, 200, {
        success: true,
        data: expect.objectContaining({
          id: 'perm-123',
          name: 'device.create',
        }),
      });

      expect(mockPermissionsService.findOne).toHaveBeenCalledWith('perm-123');
    });

    it('should return 404 when permission not found', async () => {
      // Arrange
      mockPermissionsService.findOne.mockRejectedValue(
        new NotFoundException('Permission not found')
      );
      const token = createAuthToken(['permission.read']);

      // Act
      await request(app.getHttpServer())
        .get('/permissions/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should return 403 when user lacks permission.read permission', async () => {
      // Arrange
      const token = createAuthToken(['permission.create']);

      // Act
      await request(app.getHttpServer())
        .get('/permissions/perm-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should return 401 when not authenticated', async () => {
      // Act
      await request(app.getHttpServer()).get('/permissions/perm-123').expect(401);
    });
  });

  describe('PATCH /permissions/:id', () => {
    const updateDto = {
      displayName: 'Updated Permission',
      description: 'Updated description',
    };

    it('should update permission successfully when authenticated', async () => {
      // Arrange
      const mockPermission = createMockPermission({ id: 'perm-123', ...updateDto });
      mockPermissionsService.update.mockResolvedValue(mockPermission);
      const token = createAuthToken(['permission.update']);

      // Act
      const response = await request(app.getHttpServer())
        .patch('/permissions/perm-123')
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(200);

      // Assert
      assertHttpResponse(response, 200, {
        success: true,
        data: expect.objectContaining({
          displayName: 'Updated Permission',
          description: 'Updated description',
        }),
        message: '权限更新成功',
      });

      expect(mockPermissionsService.update).toHaveBeenCalledWith('perm-123', updateDto);
    });

    it('should return 404 when permission not found', async () => {
      // Arrange
      mockPermissionsService.update.mockRejectedValue(
        new NotFoundException('Permission not found')
      );
      const token = createAuthToken(['permission.update']);

      // Act
      await request(app.getHttpServer())
        .patch('/permissions/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(404);
    });

    it('should return 403 when user lacks permission.update permission', async () => {
      // Arrange
      const token = createAuthToken(['permission.read']);

      // Act
      await request(app.getHttpServer())
        .patch('/permissions/perm-123')
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(403);
    });

    it('should allow partial updates', async () => {
      // Arrange
      const partialDto = { displayName: 'Only Name Updated' };
      const mockPermission = createMockPermission({ displayName: 'Only Name Updated' });
      mockPermissionsService.update.mockResolvedValue(mockPermission);
      const token = createAuthToken(['permission.update']);

      // Act
      await request(app.getHttpServer())
        .patch('/permissions/perm-123')
        .set('Authorization', `Bearer ${token}`)
        .send(partialDto)
        .expect(200);

      // Assert
      expect(mockPermissionsService.update).toHaveBeenCalledWith('perm-123', partialDto);
    });

    it('should prevent updating system permissions', async () => {
      // Arrange
      mockPermissionsService.update.mockRejectedValue(new Error('Cannot modify system permission'));
      const token = createAuthToken(['permission.update']);

      // Act
      await request(app.getHttpServer())
        .patch('/permissions/system-admin-perm')
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(500);
    });

    it('should prevent changing permission name', async () => {
      // Arrange
      const invalidDto = { name: 'different.permission' };
      const token = createAuthToken(['permission.update']);

      // Act
      await request(app.getHttpServer())
        .patch('/permissions/perm-123')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('DELETE /permissions/:id', () => {
    it('should delete permission successfully when authenticated', async () => {
      // Arrange
      mockPermissionsService.remove.mockResolvedValue(undefined);
      const token = createAuthToken(['permission.delete']);

      // Act
      const response = await request(app.getHttpServer())
        .delete('/permissions/perm-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      assertHttpResponse(response, 200, {
        success: true,
        message: '权限删除成功',
      });

      expect(mockPermissionsService.remove).toHaveBeenCalledWith('perm-123');
    });

    it('should return 404 when permission not found', async () => {
      // Arrange
      mockPermissionsService.remove.mockRejectedValue(
        new NotFoundException('Permission not found')
      );
      const token = createAuthToken(['permission.delete']);

      // Act
      await request(app.getHttpServer())
        .delete('/permissions/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should return 403 when user lacks permission.delete permission', async () => {
      // Arrange
      const token = createAuthToken(['permission.read', 'permission.update']);

      // Act
      await request(app.getHttpServer())
        .delete('/permissions/perm-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should return 401 when not authenticated', async () => {
      // Act
      await request(app.getHttpServer()).delete('/permissions/perm-123').expect(401);
    });

    it('should prevent deleting system permissions', async () => {
      // Arrange
      mockPermissionsService.remove.mockRejectedValue(new Error('Cannot delete system permission'));
      const token = createAuthToken(['permission.delete']);

      // Act
      await request(app.getHttpServer())
        .delete('/permissions/system-admin-perm')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);
    });

    it('should prevent deleting permission in use by roles', async () => {
      // Arrange
      mockPermissionsService.remove.mockRejectedValue(
        new Error('Cannot delete permission assigned to roles')
      );
      const token = createAuthToken(['permission.delete']);

      // Act
      await request(app.getHttpServer())
        .delete('/permissions/perm-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);
    });
  });

  describe('Security & Edge Cases', () => {
    it('should require authentication for all endpoints', async () => {
      // Test all endpoints without token
      await request(app.getHttpServer()).post('/permissions').send({}).expect(401);
      await request(app.getHttpServer())
        .post('/permissions/bulk')
        .send({ permissions: [] })
        .expect(401);
      await request(app.getHttpServer()).get('/permissions').expect(401);
      await request(app.getHttpServer()).get('/permissions/resource/device').expect(401);
      await request(app.getHttpServer()).get('/permissions/perm-123').expect(401);
      await request(app.getHttpServer()).patch('/permissions/perm-123').send({}).expect(401);
      await request(app.getHttpServer()).delete('/permissions/perm-123').expect(401);
    });

    it('should enforce permission-based access control', async () => {
      // Test with token but without specific permissions
      const tokenNoPermissions = generateTestJwt({
        sub: 'test-user',
        username: 'test',
        roles: ['user'],
        permissions: [],
      });

      await request(app.getHttpServer())
        .get('/permissions')
        .set('Authorization', `Bearer ${tokenNoPermissions}`)
        .expect(403);

      await request(app.getHttpServer())
        .post('/permissions')
        .set('Authorization', `Bearer ${tokenNoPermissions}`)
        .send({})
        .expect(403);
    });

    it('should sanitize input to prevent XSS', async () => {
      // Arrange
      const xssDto = {
        name: 'device.create',
        resource: 'device',
        action: 'create',
        displayName: '<script>alert("xss")</script>',
        description: '<img src=x onerror=alert(1)>',
      };
      const mockPermission = createMockPermission();
      mockPermissionsService.create.mockResolvedValue(mockPermission);
      const token = createAuthToken(['permission.create']);

      // Act
      await request(app.getHttpServer())
        .post('/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send(xssDto)
        .expect(201);

      // Assert - Verify sanitization
      const callArgs = mockPermissionsService.create.mock.calls[0][0];
      expect(callArgs.displayName).not.toContain('<script>');
    });

    it('should validate permission naming convention', async () => {
      // Arrange
      const invalidNames = [
        { name: 'invalid', resource: 'device', action: 'create', displayName: 'Test' },
        { name: 'device_create', resource: 'device', action: 'create', displayName: 'Test' },
        { name: 'device..create', resource: 'device', action: 'create', displayName: 'Test' },
      ];
      const token = createAuthToken(['permission.create']);

      // Act & Assert
      for (const dto of invalidNames) {
        await request(app.getHttpServer())
          .post('/permissions')
          .set('Authorization', `Bearer ${token}`)
          .send(dto)
          .expect(400);
      }
    });

    it('should handle concurrent permission creation', async () => {
      // Arrange
      const permDto = {
        name: 'device.create',
        resource: 'device',
        action: 'create',
        displayName: 'Test',
      };
      mockPermissionsService.create
        .mockResolvedValueOnce(createMockPermission(permDto))
        .mockRejectedValueOnce(new ConflictException('Permission already exists'));
      const token = createAuthToken(['permission.create']);

      // Act
      const [response1, response2] = await Promise.all([
        request(app.getHttpServer())
          .post('/permissions')
          .set('Authorization', `Bearer ${token}`)
          .send(permDto),
        request(app.getHttpServer())
          .post('/permissions')
          .set('Authorization', `Bearer ${token}`)
          .send(permDto),
      ]);

      // Assert - One succeeds, one fails
      const statuses = [response1.status, response2.status].sort();
      expect(statuses).toEqual([201, 409]);
    });

    it('should prevent SQL injection in permission name', async () => {
      // Arrange
      const sqlInjectionDto = {
        name: "device.create'; DROP TABLE permissions; --",
        resource: 'device',
        action: 'create',
        displayName: 'SQL Injection Test',
      };
      const token = createAuthToken(['permission.create']);

      // Act
      const response = await request(app.getHttpServer())
        .post('/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send(sqlInjectionDto);

      // Assert - Should be sanitized or rejected
      expect([400, 201]).toContain(response.status);
      if (response.status === 201) {
        const callArgs = mockPermissionsService.create.mock.calls[0][0];
        expect(callArgs.name).not.toContain('DROP TABLE');
      }
    });
  });
});
