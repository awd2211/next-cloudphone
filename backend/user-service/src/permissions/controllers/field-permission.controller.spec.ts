import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { FieldPermissionController } from './field-permission.controller';
import {
  FieldPermission,
  FieldAccessLevel,
  OperationType,
} from '../../entities/field-permission.entity';
import { PermissionsGuard } from '../guards/permissions.guard';
import { AuditPermissionInterceptor } from '../interceptors/audit-permission.interceptor';

describe('FieldPermissionController', () => {
  let app: INestApplication;
  let repository: Repository<FieldPermission>;
  let jwtService: JwtService;

  // Mock repository
  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn((entity) => Promise.resolve({ id: 'test-id', ...entity })),
    remove: jest.fn((entity) => Promise.resolve(entity)),
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

  // Mock AuditPermissionInterceptor (passthrough)
  const mockAuditInterceptor = {
    intercept: jest.fn((context, next) => next.handle()),
  };

  // Mock AuthGuard (passthrough, auth is handled by PermissionsGuard in our tests)
  const mockAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FieldPermissionController],
      providers: [
        {
          provide: getRepositoryToken(FieldPermission),
          useValue: mockRepository,
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
      .overrideInterceptor(AuditPermissionInterceptor)
      .useValue(mockAuditInterceptor)
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

    repository = module.get<Repository<FieldPermission>>(getRepositoryToken(FieldPermission));
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
  function generateToken(permissions: string[] = []): string {
    return jwtService.sign({
      sub: 'test-user-id',
      username: 'testuser',
      permissions,
    });
  }

  describe('GET /field-permissions', () => {
    it('should return all field permissions with list permission', async () => {
      const mockPermissions = [
        {
          id: '1',
          roleId: 'role-1',
          resourceType: 'user',
          operation: OperationType.VIEW,
          hiddenFields: ['password'],
          isActive: true,
        },
        {
          id: '2',
          roleId: 'role-2',
          resourceType: 'device',
          operation: OperationType.UPDATE,
          readOnlyFields: ['id', 'createdAt'],
          isActive: true,
        },
      ];

      mockRepository.find.mockResolvedValue(mockPermissions);

      const token = generateToken(['field-permission:list']);

      const response = await request(app.getHttpServer())
        .get('/field-permissions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPermissions);
      expect(response.body.total).toBe(2);
    });

    it('should filter by roleId', async () => {
      mockRepository.find.mockResolvedValue([]);

      const token = generateToken(['field-permission:list']);

      await request(app.getHttpServer())
        .get('/field-permissions?roleId=role-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { roleId: 'role-1' },
        order: { priority: 'ASC', createdAt: 'DESC' },
      });
    });

    it('should filter by multiple parameters', async () => {
      mockRepository.find.mockResolvedValue([]);

      const token = generateToken(['field-permission:list']);

      await request(app.getHttpServer())
        .get('/field-permissions?roleId=role-1&resourceType=user&operation=view')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          roleId: 'role-1',
          resourceType: 'user',
          operation: OperationType.VIEW,
        },
        order: { priority: 'ASC', createdAt: 'DESC' },
      });
    });

    it('should return 403 without permission', async () => {
      const token = generateToken([]); // No permissions

      await request(app.getHttpServer())
        .get('/field-permissions')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /field-permissions/:id', () => {
    it('should return field permission by id', async () => {
      const mockPermission = {
        id: 'test-id',
        roleId: 'role-1',
        resourceType: 'user',
        operation: OperationType.VIEW,
        hiddenFields: ['password', 'salt'],
        isActive: true,
      };

      mockRepository.findOne.mockResolvedValue(mockPermission);

      const token = generateToken(['field-permission:read']);

      const response = await request(app.getHttpServer())
        .get('/field-permissions/test-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPermission);
    });

    it('should return error when permission not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const token = generateToken(['field-permission:read']);

      const response = await request(app.getHttpServer())
        .get('/field-permissions/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('字段权限配置不存在');
    });

    it('should return 403 without permission', async () => {
      const token = generateToken([]);

      await request(app.getHttpServer())
        .get('/field-permissions/test-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /field-permissions/role/:roleId', () => {
    it('should return permissions grouped by resource and operation', async () => {
      const mockPermissions = [
        {
          id: '1',
          roleId: 'role-1',
          resourceType: 'user',
          operation: OperationType.VIEW,
          hiddenFields: ['password'],
        },
        {
          id: '2',
          roleId: 'role-1',
          resourceType: 'user',
          operation: OperationType.UPDATE,
          readOnlyFields: ['email'],
        },
        {
          id: '3',
          roleId: 'role-1',
          resourceType: 'device',
          operation: OperationType.VIEW,
          hiddenFields: ['internalId'],
        },
      ];

      mockRepository.find.mockResolvedValue(mockPermissions);

      const token = generateToken(['field-permission:list']);

      const response = await request(app.getHttpServer())
        .get('/field-permissions/role/role-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user:view');
      expect(response.body.data).toHaveProperty('user:update');
      expect(response.body.data).toHaveProperty('device:view');
      expect(response.body.total).toBe(3);
    });

    it('should filter by resourceType', async () => {
      mockRepository.find.mockResolvedValue([]);

      const token = generateToken(['field-permission:list']);

      await request(app.getHttpServer())
        .get('/field-permissions/role/role-1?resourceType=user')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { roleId: 'role-1', resourceType: 'user' },
        order: { resourceType: 'ASC', operation: 'ASC', priority: 'ASC' },
      });
    });

    it('should return 403 without permission', async () => {
      const token = generateToken([]);

      await request(app.getHttpServer())
        .get('/field-permissions/role/role-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('POST /field-permissions', () => {
    it('should create field permission successfully', async () => {
      const createDto = {
        roleId: 'role-1',
        resourceType: 'user',
        operation: OperationType.VIEW,
        hiddenFields: ['password', 'salt'],
        readOnlyFields: ['email'],
        description: 'Hide sensitive fields for support role',
      };

      const token = generateToken(['field-permission:create']);

      const response = await request(app.getHttpServer())
        .post('/field-permissions')
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('字段权限配置创建成功');
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should set default priority to 100', async () => {
      const createDto = {
        roleId: 'role-1',
        resourceType: 'user',
        operation: OperationType.VIEW,
      };

      const token = generateToken(['field-permission:create']);

      await request(app.getHttpServer())
        .post('/field-permissions')
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(201);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 100,
          isActive: true,
        })
      );
    });

    it('should return 403 without permission', async () => {
      const createDto = {
        roleId: 'role-1',
        resourceType: 'user',
        operation: OperationType.VIEW,
      };

      const token = generateToken([]);

      await request(app.getHttpServer())
        .post('/field-permissions')
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(403);
    });
  });

  describe('PUT /field-permissions/:id', () => {
    it('should update field permission successfully', async () => {
      const existingPermission = {
        id: 'test-id',
        roleId: 'role-1',
        resourceType: 'user',
        operation: OperationType.VIEW,
        hiddenFields: ['password'],
      };

      const updateDto = {
        hiddenFields: ['password', 'salt', 'twoFactorSecret'],
        description: 'Updated description',
      };

      mockRepository.findOne.mockResolvedValue(existingPermission);

      const token = generateToken(['field-permission:update']);

      const response = await request(app.getHttpServer())
        .put('/field-permissions/test-id')
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('字段权限配置更新成功');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should return error when permission not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const updateDto = {
        description: 'Updated',
      };

      const token = generateToken(['field-permission:update']);

      const response = await request(app.getHttpServer())
        .put('/field-permissions/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('字段权限配置不存在');
    });

    it('should return 403 without permission', async () => {
      const token = generateToken([]);

      await request(app.getHttpServer())
        .put('/field-permissions/test-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'test' })
        .expect(403);
    });
  });

  describe('DELETE /field-permissions/:id', () => {
    it('should delete field permission successfully', async () => {
      const existingPermission = {
        id: 'test-id',
        roleId: 'role-1',
        resourceType: 'user',
        operation: OperationType.VIEW,
      };

      mockRepository.findOne.mockResolvedValue(existingPermission);

      const token = generateToken(['field-permission:delete']);

      const response = await request(app.getHttpServer())
        .delete('/field-permissions/test-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('字段权限配置删除成功');
      expect(mockRepository.remove).toHaveBeenCalled();
    });

    it('should return error when permission not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const token = generateToken(['field-permission:delete']);

      const response = await request(app.getHttpServer())
        .delete('/field-permissions/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('字段权限配置不存在');
    });

    it('should return 403 without permission', async () => {
      const token = generateToken([]);

      await request(app.getHttpServer())
        .delete('/field-permissions/test-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('POST /field-permissions/batch', () => {
    it('should create multiple permissions successfully', async () => {
      const batchDto = [
        {
          roleId: 'role-1',
          resourceType: 'user',
          operation: OperationType.VIEW,
          hiddenFields: ['password'],
        },
        {
          roleId: 'role-1',
          resourceType: 'user',
          operation: OperationType.UPDATE,
          readOnlyFields: ['email'],
        },
      ];

      const token = generateToken(['field-permission:create']);

      const response = await request(app.getHttpServer())
        .post('/field-permissions/batch')
        .set('Authorization', `Bearer ${token}`)
        .send(batchDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('成功创建 2 条字段权限配置');
      expect(mockRepository.create).toHaveBeenCalledTimes(2);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should return 403 without permission', async () => {
      const batchDto = [
        {
          roleId: 'role-1',
          resourceType: 'user',
          operation: OperationType.VIEW,
        },
      ];

      const token = generateToken([]);

      await request(app.getHttpServer())
        .post('/field-permissions/batch')
        .set('Authorization', `Bearer ${token}`)
        .send(batchDto)
        .expect(403);
    });
  });

  describe('PUT /field-permissions/:id/toggle', () => {
    it('should toggle permission active status', async () => {
      const existingPermission = {
        id: 'test-id',
        roleId: 'role-1',
        resourceType: 'user',
        operation: OperationType.VIEW,
        isActive: true,
      };

      mockRepository.findOne.mockResolvedValue(existingPermission);

      const token = generateToken(['field-permission:toggle']);

      const response = await request(app.getHttpServer())
        .put('/field-permissions/test-id/toggle')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('禁用');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should return error when permission not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const token = generateToken(['field-permission:toggle']);

      const response = await request(app.getHttpServer())
        .put('/field-permissions/non-existent/toggle')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('字段权限配置不存在');
    });

    it('should return 403 without permission', async () => {
      const token = generateToken([]);

      await request(app.getHttpServer())
        .put('/field-permissions/test-id/toggle')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /field-permissions/meta/access-levels', () => {
    it('should return all field access levels', async () => {
      const token = generateToken(['field-permission:meta']);

      const response = await request(app.getHttpServer())
        .get('/field-permissions/meta/access-levels')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(4);
      expect(response.body.data[0]).toHaveProperty('value');
      expect(response.body.data[0]).toHaveProperty('label');
    });

    it('should return 403 without permission', async () => {
      const token = generateToken([]);

      await request(app.getHttpServer())
        .get('/field-permissions/meta/access-levels')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /field-permissions/meta/operation-types', () => {
    it('should return all operation types', async () => {
      const token = generateToken(['field-permission:meta']);

      const response = await request(app.getHttpServer())
        .get('/field-permissions/meta/operation-types')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(4);
      expect(response.body.data[0]).toHaveProperty('value');
      expect(response.body.data[0]).toHaveProperty('label');
    });

    it('should return 403 without permission', async () => {
      const token = generateToken([]);

      await request(app.getHttpServer())
        .get('/field-permissions/meta/operation-types')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /field-permissions/meta/transform-examples', () => {
    it('should return field transform examples', async () => {
      const token = generateToken(['field-permission:meta']);

      const response = await request(app.getHttpServer())
        .get('/field-permissions/meta/transform-examples')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('mask');
      expect(response.body.data).toHaveProperty('hash');
      expect(response.body.data).toHaveProperty('remove');
      expect(response.body.data).toHaveProperty('replace');
    });

    it('should return 403 without permission', async () => {
      const token = generateToken([]);

      await request(app.getHttpServer())
        .get('/field-permissions/meta/transform-examples')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('Security & Authentication', () => {
    it('should require authentication for all endpoints', async () => {
      await request(app.getHttpServer()).get('/field-permissions').expect(401);
    });

    it('should enforce permission-based access control', async () => {
      const token = generateToken([]); // No permissions

      // Try various endpoints
      await request(app.getHttpServer())
        .get('/field-permissions')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      await request(app.getHttpServer())
        .post('/field-permissions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          roleId: 'role-1',
          resourceType: 'user',
          operation: OperationType.VIEW,
        })
        .expect(403);

      await request(app.getHttpServer())
        .delete('/field-permissions/test-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });
});
