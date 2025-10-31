import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException, ConflictException } from '@nestjs/common';
import * as request from 'supertest';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import {
  createTestApp,
  generateTestJwt,
  assertHttpResponse,
} from '@cloudphone/shared/testing/test-helpers';
import { createMockRole, createMockPermission } from '@cloudphone/shared/testing/mock-factories';

describe('RolesController', () => {
  let app: INestApplication;
  let rolesService: RolesService;

  const mockRolesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addPermissions: jest.fn(),
    removePermissions: jest.fn(),
  };

  // Helper to generate auth token with specific permissions
  const createAuthToken = (
    permissions: string[] = ['role.read', 'role.create', 'role.update', 'role.delete']
  ) => {
    return generateTestJwt({
      sub: 'test-user-id',
      username: 'testadmin',
      roles: ['admin'],
      permissions,
    });
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [{ provide: RolesService, useValue: mockRolesService }],
    }).compile();

    app = await createTestApp(moduleRef);
    rolesService = moduleRef.get<RolesService>(RolesService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /roles', () => {
    const createRoleDto = {
      name: 'editor',
      displayName: 'Editor',
      description: 'Can edit content',
      permissionIds: ['perm-1', 'perm-2'],
    };

    it('should create role successfully when authenticated with permission', async () => {
      // Arrange
      const mockRole = createMockRole(createRoleDto);
      mockRolesService.create.mockResolvedValue(mockRole);
      const token = createAuthToken(['role.create']);

      // Act
      const response = await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${token}`)
        .send(createRoleDto)
        .expect(201);

      // Assert
      assertHttpResponse(response, 201, {
        success: true,
        data: expect.objectContaining({
          name: 'editor',
          displayName: 'Editor',
        }),
        message: '角色创建成功',
      });

      expect(mockRolesService.create).toHaveBeenCalledWith(createRoleDto);
    });

    it('should return 403 when user lacks role.create permission', async () => {
      // Arrange
      const token = createAuthToken(['role.read']); // No create permission

      // Act
      await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${token}`)
        .send(createRoleDto)
        .expect(403);

      // Assert
      expect(mockRolesService.create).not.toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      // Act
      await request(app.getHttpServer()).post('/roles').send(createRoleDto).expect(401);
    });

    it('should return 400 when validation fails', async () => {
      // Arrange
      const invalidDto = { name: '' }; // Empty name
      const token = createAuthToken(['role.create']);

      // Act
      await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidDto)
        .expect(400);

      // Assert
      expect(mockRolesService.create).not.toHaveBeenCalled();
    });

    it('should return 409 when role name already exists', async () => {
      // Arrange
      mockRolesService.create.mockRejectedValue(new ConflictException('Role name already exists'));
      const token = createAuthToken(['role.create']);

      // Act
      await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${token}`)
        .send(createRoleDto)
        .expect(409);
    });

    it('should create system role when isSystem flag is true', async () => {
      // Arrange
      const systemRoleDto = {
        ...createRoleDto,
        name: 'system-admin',
        isSystem: true,
      };
      const mockRole = createMockRole({ ...systemRoleDto, isSystem: true });
      mockRolesService.create.mockResolvedValue(mockRole);
      const token = createAuthToken(['role.create']);

      // Act
      const response = await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${token}`)
        .send(systemRoleDto)
        .expect(201);

      // Assert
      expect(response.body.data.isSystem).toBe(true);
    });

    it('should sanitize role name and description', async () => {
      // Arrange
      const xssDto = {
        name: '<script>alert("xss")</script>',
        displayName: 'Test Role',
        description: '<img src=x onerror=alert(1)>',
      };
      const mockRole = createMockRole({ name: 'script-alert-xss', displayName: 'Test Role' });
      mockRolesService.create.mockResolvedValue(mockRole);
      const token = createAuthToken(['role.create']);

      // Act
      await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${token}`)
        .send(xssDto)
        .expect(201);

      // Assert - Verify XSS content was sanitized
      const callArgs = mockRolesService.create.mock.calls[0][0];
      expect(callArgs.name).not.toContain('<script>');
    });
  });

  describe('GET /roles', () => {
    it('should return paginated role list', async () => {
      // Arrange
      const mockRoles = [
        createMockRole({ name: 'admin' }),
        createMockRole({ name: 'user' }),
        createMockRole({ name: 'editor' }),
      ];
      const mockResult = {
        data: mockRoles,
        total: 3,
        page: 1,
        limit: 10,
      };
      mockRolesService.findAll.mockResolvedValue(mockResult);

      // Act
      const response = await request(app.getHttpServer()).get('/roles?page=1&limit=10').expect(200);

      // Assert
      assertHttpResponse(response, 200, {
        success: true,
        data: expect.any(Array),
        total: 3,
        page: 1,
        limit: 10,
      });

      expect(response.body.data).toHaveLength(3);
      expect(mockRolesService.findAll).toHaveBeenCalledWith(1, 10, undefined);
    });

    it('should use default pagination when not provided', async () => {
      // Arrange
      mockRolesService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      // Act
      await request(app.getHttpServer()).get('/roles').expect(200);

      // Assert
      expect(mockRolesService.findAll).toHaveBeenCalledWith(1, 10, undefined);
    });

    it('should filter by tenantId when provided', async () => {
      // Arrange
      mockRolesService.findAll.mockResolvedValue({
        data: [createMockRole()],
        total: 1,
        page: 1,
        limit: 10,
      });

      // Act
      await request(app.getHttpServer()).get('/roles?tenantId=tenant-123').expect(200);

      // Assert
      expect(mockRolesService.findAll).toHaveBeenCalledWith(1, 10, 'tenant-123');
    });

    it('should not require authentication for listing roles', async () => {
      // Arrange
      mockRolesService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      // Act - No Authorization header
      await request(app.getHttpServer()).get('/roles').expect(200);
    });

    it('should handle large page numbers', async () => {
      // Arrange
      mockRolesService.findAll.mockResolvedValue({
        data: [],
        total: 100,
        page: 20,
        limit: 10,
      });

      // Act
      await request(app.getHttpServer()).get('/roles?page=20&limit=10').expect(200);
    });

    it('should return empty array when no roles exist', async () => {
      // Arrange
      mockRolesService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      // Act
      const response = await request(app.getHttpServer()).get('/roles').expect(200);

      // Assert
      expect(response.body.data).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });

  describe('GET /roles/:id', () => {
    it('should return role details when role exists', async () => {
      // Arrange
      const mockRole = createMockRole({
        id: 'role-123',
        name: 'admin',
        permissions: [
          createMockPermission({ name: 'user.create' }),
          createMockPermission({ name: 'user.delete' }),
        ],
      });
      mockRolesService.findOne.mockResolvedValue(mockRole);
      const token = createAuthToken(['role.read']);

      // Act
      const response = await request(app.getHttpServer())
        .get('/roles/role-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      assertHttpResponse(response, 200, {
        success: true,
        data: expect.objectContaining({
          id: 'role-123',
          name: 'admin',
        }),
      });

      expect(mockRolesService.findOne).toHaveBeenCalledWith('role-123');
    });

    it('should include permissions in response', async () => {
      // Arrange
      const mockPermissions = [
        createMockPermission({ name: 'user.create' }),
        createMockPermission({ name: 'user.update' }),
      ];
      const mockRole = createMockRole({
        id: 'role-123',
        permissions: mockPermissions,
      });
      mockRolesService.findOne.mockResolvedValue(mockRole);
      const token = createAuthToken(['role.read']);

      // Act
      const response = await request(app.getHttpServer())
        .get('/roles/role-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.data.permissions).toBeDefined();
      expect(response.body.data.permissions).toHaveLength(2);
    });

    it('should return 404 when role not found', async () => {
      // Arrange
      mockRolesService.findOne.mockRejectedValue(new NotFoundException('Role not found'));
      const token = createAuthToken(['role.read']);

      // Act
      await request(app.getHttpServer())
        .get('/roles/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should return 403 when user lacks role.read permission', async () => {
      // Arrange
      const token = createAuthToken(['role.create']); // No read permission

      // Act
      await request(app.getHttpServer())
        .get('/roles/role-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should return 401 when not authenticated', async () => {
      // Act
      await request(app.getHttpServer()).get('/roles/role-123').expect(401);
    });
  });

  describe('PATCH /roles/:id', () => {
    const updateDto = {
      displayName: 'Updated Role',
      description: 'Updated description',
    };

    it('should update role successfully when authenticated', async () => {
      // Arrange
      const mockRole = createMockRole({ id: 'role-123', ...updateDto });
      mockRolesService.update.mockResolvedValue(mockRole);
      const token = createAuthToken(['role.update']);

      // Act
      const response = await request(app.getHttpServer())
        .patch('/roles/role-123')
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(200);

      // Assert
      assertHttpResponse(response, 200, {
        success: true,
        data: expect.objectContaining({
          displayName: 'Updated Role',
          description: 'Updated description',
        }),
        message: '角色更新成功',
      });

      expect(mockRolesService.update).toHaveBeenCalledWith('role-123', updateDto);
    });

    it('should return 404 when role not found', async () => {
      // Arrange
      mockRolesService.update.mockRejectedValue(new NotFoundException('Role not found'));
      const token = createAuthToken(['role.update']);

      // Act
      await request(app.getHttpServer())
        .patch('/roles/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(404);
    });

    it('should return 403 when user lacks role.update permission', async () => {
      // Arrange
      const token = createAuthToken(['role.read']); // No update permission

      // Act
      await request(app.getHttpServer())
        .patch('/roles/role-123')
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(403);
    });

    it('should allow partial updates', async () => {
      // Arrange
      const partialDto = { displayName: 'Only Name Updated' };
      const mockRole = createMockRole({ displayName: 'Only Name Updated' });
      mockRolesService.update.mockResolvedValue(mockRole);
      const token = createAuthToken(['role.update']);

      // Act
      await request(app.getHttpServer())
        .patch('/roles/role-123')
        .set('Authorization', `Bearer ${token}`)
        .send(partialDto)
        .expect(200);

      // Assert
      expect(mockRolesService.update).toHaveBeenCalledWith('role-123', partialDto);
    });

    it('should prevent updating system roles', async () => {
      // Arrange
      mockRolesService.update.mockRejectedValue(new Error('Cannot modify system role'));
      const token = createAuthToken(['role.update']);

      // Act
      await request(app.getHttpServer())
        .patch('/roles/system-admin')
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(500);
    });

    it('should validate displayName length', async () => {
      // Arrange
      const invalidDto = { displayName: 'a'.repeat(300) }; // Too long
      const token = createAuthToken(['role.update']);

      // Act
      await request(app.getHttpServer())
        .patch('/roles/role-123')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('DELETE /roles/:id', () => {
    it('should delete role successfully when authenticated', async () => {
      // Arrange
      mockRolesService.remove.mockResolvedValue(undefined);
      const token = createAuthToken(['role.delete']);

      // Act
      const response = await request(app.getHttpServer())
        .delete('/roles/role-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      assertHttpResponse(response, 200, {
        success: true,
        message: '角色删除成功',
      });

      expect(mockRolesService.remove).toHaveBeenCalledWith('role-123');
    });

    it('should return 404 when role not found', async () => {
      // Arrange
      mockRolesService.remove.mockRejectedValue(new NotFoundException('Role not found'));
      const token = createAuthToken(['role.delete']);

      // Act
      await request(app.getHttpServer())
        .delete('/roles/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should return 403 when user lacks role.delete permission', async () => {
      // Arrange
      const token = createAuthToken(['role.read', 'role.update']); // No delete permission

      // Act
      await request(app.getHttpServer())
        .delete('/roles/role-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should return 401 when not authenticated', async () => {
      // Act
      await request(app.getHttpServer()).delete('/roles/role-123').expect(401);
    });

    it('should prevent deleting system roles', async () => {
      // Arrange
      mockRolesService.remove.mockRejectedValue(new Error('Cannot delete system role'));
      const token = createAuthToken(['role.delete']);

      // Act
      await request(app.getHttpServer())
        .delete('/roles/system-admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);
    });

    it('should prevent deleting role with active users', async () => {
      // Arrange
      mockRolesService.remove.mockRejectedValue(new Error('Cannot delete role with active users'));
      const token = createAuthToken(['role.delete']);

      // Act
      await request(app.getHttpServer())
        .delete('/roles/role-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);
    });
  });

  describe('POST /roles/:id/permissions', () => {
    const permissionIds = ['perm-1', 'perm-2', 'perm-3'];

    it('should add permissions to role successfully', async () => {
      // Arrange
      const mockPermissions = permissionIds.map((id) => createMockPermission({ id }));
      const mockRole = createMockRole({
        id: 'role-123',
        permissions: mockPermissions,
      });
      mockRolesService.addPermissions.mockResolvedValue(mockRole);
      const token = createAuthToken(['role.update']);

      // Act
      const response = await request(app.getHttpServer())
        .post('/roles/role-123/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissionIds })
        .expect(200);

      // Assert
      assertHttpResponse(response, 200, {
        success: true,
        data: expect.objectContaining({
          id: 'role-123',
        }),
        message: '权限添加成功',
      });

      expect(response.body.data.permissions).toHaveLength(3);
      expect(mockRolesService.addPermissions).toHaveBeenCalledWith('role-123', permissionIds);
    });

    it('should return 404 when role not found', async () => {
      // Arrange
      mockRolesService.addPermissions.mockRejectedValue(new NotFoundException('Role not found'));
      const token = createAuthToken(['role.update']);

      // Act
      await request(app.getHttpServer())
        .post('/roles/invalid-id/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissionIds })
        .expect(404);
    });

    it('should return 403 when user lacks role.update permission', async () => {
      // Arrange
      const token = createAuthToken(['role.read']); // No update permission

      // Act
      await request(app.getHttpServer())
        .post('/roles/role-123/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissionIds })
        .expect(403);
    });

    it('should handle duplicate permission IDs gracefully', async () => {
      // Arrange
      const duplicateIds = ['perm-1', 'perm-1', 'perm-2'];
      const mockRole = createMockRole({
        permissions: [
          createMockPermission({ id: 'perm-1' }),
          createMockPermission({ id: 'perm-2' }),
        ],
      });
      mockRolesService.addPermissions.mockResolvedValue(mockRole);
      const token = createAuthToken(['role.update']);

      // Act
      await request(app.getHttpServer())
        .post('/roles/role-123/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissionIds: duplicateIds })
        .expect(200);
    });

    it('should return 400 when permissionIds is empty', async () => {
      // Arrange
      const token = createAuthToken(['role.update']);

      // Act
      await request(app.getHttpServer())
        .post('/roles/role-123/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissionIds: [] })
        .expect(400);
    });

    it('should return 400 when permissionIds is not an array', async () => {
      // Arrange
      const token = createAuthToken(['role.update']);

      // Act
      await request(app.getHttpServer())
        .post('/roles/role-123/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissionIds: 'not-an-array' })
        .expect(400);
    });

    it('should prevent adding permissions to system roles', async () => {
      // Arrange
      mockRolesService.addPermissions.mockRejectedValue(
        new Error('Cannot modify system role permissions')
      );
      const token = createAuthToken(['role.update']);

      // Act
      await request(app.getHttpServer())
        .post('/roles/system-admin/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissionIds })
        .expect(500);
    });
  });

  describe('DELETE /roles/:id/permissions', () => {
    const permissionIds = ['perm-1', 'perm-2'];

    it('should remove permissions from role successfully', async () => {
      // Arrange
      const mockRole = createMockRole({
        id: 'role-123',
        permissions: [createMockPermission({ id: 'perm-3' })], // Only perm-3 remains
      });
      mockRolesService.removePermissions.mockResolvedValue(mockRole);
      const token = createAuthToken(['role.update']);

      // Act
      const response = await request(app.getHttpServer())
        .delete('/roles/role-123/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissionIds })
        .expect(200);

      // Assert
      assertHttpResponse(response, 200, {
        success: true,
        data: expect.objectContaining({
          id: 'role-123',
        }),
        message: '权限移除成功',
      });

      expect(mockRolesService.removePermissions).toHaveBeenCalledWith('role-123', permissionIds);
    });

    it('should return 404 when role not found', async () => {
      // Arrange
      mockRolesService.removePermissions.mockRejectedValue(new NotFoundException('Role not found'));
      const token = createAuthToken(['role.update']);

      // Act
      await request(app.getHttpServer())
        .delete('/roles/invalid-id/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissionIds })
        .expect(404);
    });

    it('should return 403 when user lacks role.update permission', async () => {
      // Arrange
      const token = createAuthToken(['role.read']); // No update permission

      // Act
      await request(app.getHttpServer())
        .delete('/roles/role-123/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissionIds })
        .expect(403);
    });

    it('should handle removing non-existent permissions gracefully', async () => {
      // Arrange
      const mockRole = createMockRole({ id: 'role-123', permissions: [] });
      mockRolesService.removePermissions.mockResolvedValue(mockRole);
      const token = createAuthToken(['role.update']);

      // Act
      await request(app.getHttpServer())
        .delete('/roles/role-123/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissionIds: ['non-existent'] })
        .expect(200);
    });

    it('should return 400 when permissionIds is empty', async () => {
      // Arrange
      const token = createAuthToken(['role.update']);

      // Act
      await request(app.getHttpServer())
        .delete('/roles/role-123/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissionIds: [] })
        .expect(400);
    });

    it('should prevent removing all permissions from admin role', async () => {
      // Arrange
      mockRolesService.removePermissions.mockRejectedValue(
        new Error('Admin role must have at least one permission')
      );
      const token = createAuthToken(['role.update']);

      // Act
      await request(app.getHttpServer())
        .delete('/roles/admin/permissions')
        .set('Authorization', `Bearer ${token}`)
        .send({ permissionIds })
        .expect(500);
    });
  });

  describe('Security & Edge Cases', () => {
    it('should require authentication for protected endpoints', async () => {
      // Test all protected endpoints without token
      await request(app.getHttpServer()).post('/roles').send({}).expect(401);
      await request(app.getHttpServer()).get('/roles/role-123').expect(401);
      await request(app.getHttpServer()).patch('/roles/role-123').send({}).expect(401);
      await request(app.getHttpServer()).delete('/roles/role-123').expect(401);
      await request(app.getHttpServer()).post('/roles/role-123/permissions').send({}).expect(401);
      await request(app.getHttpServer()).delete('/roles/role-123/permissions').send({}).expect(401);
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
        .post('/roles')
        .set('Authorization', `Bearer ${tokenNoPermissions}`)
        .send({})
        .expect(403);

      await request(app.getHttpServer())
        .delete('/roles/role-123')
        .set('Authorization', `Bearer ${tokenNoPermissions}`)
        .expect(403);
    });

    it('should sanitize input to prevent XSS', async () => {
      // Arrange
      const xssDto = {
        name: '<script>alert("xss")</script>',
        displayName: '<img src=x onerror=alert(1)>',
        description: 'javascript:alert(document.cookie)',
      };
      const mockRole = createMockRole();
      mockRolesService.create.mockResolvedValue(mockRole);
      const token = createAuthToken(['role.create']);

      // Act
      await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${token}`)
        .send(xssDto)
        .expect(201);

      // Assert - Verify sanitization
      const callArgs = mockRolesService.create.mock.calls[0][0];
      expect(callArgs.name).not.toContain('<script>');
      expect(callArgs.displayName).not.toContain('onerror');
    });

    it('should handle concurrent role creation gracefully', async () => {
      // Arrange
      const roleDto = { name: 'concurrent-test', displayName: 'Test' };
      mockRolesService.create
        .mockResolvedValueOnce(createMockRole(roleDto))
        .mockRejectedValueOnce(new ConflictException('Role already exists'));
      const token = createAuthToken(['role.create']);

      // Act - Create two roles concurrently
      const [response1, response2] = await Promise.all([
        request(app.getHttpServer())
          .post('/roles')
          .set('Authorization', `Bearer ${token}`)
          .send(roleDto),
        request(app.getHttpServer())
          .post('/roles')
          .set('Authorization', `Bearer ${token}`)
          .send(roleDto),
      ]);

      // Assert - One succeeds, one fails
      const statuses = [response1.status, response2.status].sort();
      expect(statuses).toEqual([201, 409]);
    });

    it('should validate role name format', async () => {
      // Arrange
      const invalidNames = [
        { name: 'role with spaces', displayName: 'Test' },
        { name: 'role@special', displayName: 'Test' },
        { name: '123-starts-with-number', displayName: 'Test' },
      ];
      const token = createAuthToken(['role.create']);

      // Act & Assert
      for (const dto of invalidNames) {
        await request(app.getHttpServer())
          .post('/roles')
          .set('Authorization', `Bearer ${token}`)
          .send(dto)
          .expect(400);
      }
    });

    it('should prevent SQL injection in role name', async () => {
      // Arrange
      const sqlInjectionDto = {
        name: "admin'; DROP TABLE roles; --",
        displayName: 'SQL Injection Test',
      };
      const token = createAuthToken(['role.create']);

      // Act
      const response = await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${token}`)
        .send(sqlInjectionDto);

      // Assert - Should be sanitized or rejected
      expect([400, 201]).toContain(response.status);
      if (response.status === 201) {
        const callArgs = mockRolesService.create.mock.calls[0][0];
        expect(callArgs.name).not.toContain('DROP TABLE');
      }
    });
  });
});
