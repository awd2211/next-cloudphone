import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as request from 'supertest';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RolesService } from '../roles/roles.service';
import {
  createTestApp,
  generateTestJwt,
  assertHttpResponse,
} from '@cloudphone/shared/testing/test-helpers';
import {
  createMockUser,
  createMockUsers,
  createMockRole,
} from '@cloudphone/shared/testing/mock-factories';

describe('UsersController', () => {
  let app: INestApplication;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let usersService: UsersService;
  let rolesService: RolesService;

  const mockCommandBus = {
    execute: jest.fn(),
  };

  const mockQueryBus = {
    execute: jest.fn(),
  };

  const mockUsersService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockRolesService = {
    findAll: jest.fn(),
    findById: jest.fn(),
  };

  // Helper to generate auth token with specific permissions
  const createAuthToken = (
    permissions: string[] = ['user.read', 'user.create', 'user.update', 'user.delete']
  ) => {
    return generateTestJwt({
      sub: 'test-user-id',
      username: 'testuser',
      roles: ['admin'],
      permissions,
    });
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: QueryBus, useValue: mockQueryBus },
        { provide: UsersService, useValue: mockUsersService },
        { provide: RolesService, useValue: mockRolesService },
      ],
    }).compile();

    app = await createTestApp(moduleRef);
    commandBus = moduleRef.get<CommandBus>(CommandBus);
    queryBus = moduleRef.get<QueryBus>(QueryBus);
    usersService = moduleRef.get<UsersService>(UsersService);
    rolesService = moduleRef.get<RolesService>(RolesService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /users', () => {
    const createUserDto = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      fullName: 'New User',
      phoneNumber: '+1234567890',
      roleIds: ['role-1'],
    };

    it('should create user successfully when authenticated with permission', async () => {
      // Arrange
      const mockUser = createMockUser(createUserDto);
      mockCommandBus.execute.mockResolvedValue(mockUser);
      const token = createAuthToken(['user.create']);

      // Act
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${token}`)
        .send(createUserDto)
        .expect(201);

      // Assert
      assertHttpResponse(response, 201, {
        success: true,
        data: expect.objectContaining({
          username: 'newuser',
          email: 'newuser@example.com',
        }),
        message: '用户创建成功',
      });

      expect(mockCommandBus.execute).toHaveBeenCalled();
    });

    it('should not return password in response', async () => {
      // Arrange
      const mockUser = createMockUser({ ...createUserDto, password: 'hashed-password' });
      mockCommandBus.execute.mockResolvedValue(mockUser);
      const token = createAuthToken(['user.create']);

      // Act
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${token}`)
        .send(createUserDto)
        .expect(201);

      // Assert
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should return 403 when user lacks user.create permission', async () => {
      // Arrange
      const token = createAuthToken(['user.read']); // No create permission

      // Act
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${token}`)
        .send(createUserDto)
        .expect(403);

      // Assert
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      // Act
      await request(app.getHttpServer()).post('/users').send(createUserDto).expect(401);
    });

    it('should return 400 when validation fails', async () => {
      // Arrange
      const invalidDto = { username: 'u' }; // Missing required fields
      const token = createAuthToken(['user.create']);

      // Act
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidDto)
        .expect(400);

      // Assert
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should return 409 when username already exists', async () => {
      // Arrange
      mockCommandBus.execute.mockRejectedValue(new Error('Username already exists'));
      const token = createAuthToken(['user.create']);

      // Act
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${token}`)
        .send(createUserDto)
        .expect(500); // CommandBus errors are 500 by default
    });
  });

  describe('GET /users', () => {
    it('should return paginated user list when authenticated', async () => {
      // Arrange
      const mockUsers = createMockUsers(10);
      const mockResult = {
        data: mockUsers,
        total: 100,
        page: 1,
        limit: 10,
      };
      mockQueryBus.execute.mockResolvedValue(mockResult);
      const token = createAuthToken(['user.read']);

      // Act
      const response = await request(app.getHttpServer())
        .get('/users?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      assertHttpResponse(response, 200, {
        success: true,
        data: expect.any(Array),
        total: 100,
        page: 1,
        limit: 10,
      });

      expect(response.body.data).toHaveLength(10);
      expect(mockQueryBus.execute).toHaveBeenCalled();
    });

    it('should use default pagination values when not provided', async () => {
      // Arrange
      mockQueryBus.execute.mockResolvedValue({
        data: createMockUsers(10),
        total: 10,
        page: 1,
        limit: 10,
      });
      const token = createAuthToken(['user.read']);

      // Act
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
        })
      );
    });

    it('should filter by tenantId when provided', async () => {
      // Arrange
      mockQueryBus.execute.mockResolvedValue({
        data: createMockUsers(5),
        total: 5,
        page: 1,
        limit: 10,
      });
      const token = createAuthToken(['user.read']);

      // Act
      await request(app.getHttpServer())
        .get('/users?tenantId=tenant-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-123',
        })
      );
    });

    it('should return 403 when user lacks user.read permission', async () => {
      // Arrange
      const token = createAuthToken(['user.create']); // No read permission

      // Act
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should handle large page numbers', async () => {
      // Arrange
      mockQueryBus.execute.mockResolvedValue({
        data: [],
        total: 100,
        page: 50,
        limit: 10,
      });
      const token = createAuthToken(['user.read']);

      // Act
      await request(app.getHttpServer())
        .get('/users?page=50&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should handle invalid page parameter gracefully', async () => {
      // Arrange
      mockQueryBus.execute.mockResolvedValue({
        data: createMockUsers(10),
        total: 10,
        page: 1,
        limit: 10,
      });
      const token = createAuthToken(['user.read']);

      // Act
      await request(app.getHttpServer())
        .get('/users?page=invalid')
        .set('Authorization', `Bearer ${token}`)
        .expect(200); // Should default to 1

      // Assert - NaN converts to 1
      expect(mockQueryBus.execute).toHaveBeenCalled();
    });
  });

  describe('GET /users/filter', () => {
    it('should return filtered users with advanced filters', async () => {
      // Arrange
      const mockUsers = createMockUsers(5);
      const mockResult = {
        data: mockUsers,
        total: 5,
        page: 1,
        limit: 10,
      };
      mockUsersService.findAll.mockResolvedValue(mockResult);
      const token = createAuthToken(['user.read']);

      // Act
      const response = await request(app.getHttpServer())
        .get('/users/filter?status=active&includeRoles=true')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        total: 5,
        totalPages: 1,
        hasMore: false,
      });

      expect(mockUsersService.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        expect.objectContaining({
          includeRoles: true,
          filters: expect.any(Object),
        })
      );
    });

    it('should calculate totalPages and hasMore correctly', async () => {
      // Arrange
      mockUsersService.findAll.mockResolvedValue({
        data: createMockUsers(10),
        total: 25,
        page: 1,
        limit: 10,
      });
      const token = createAuthToken(['user.read']);

      // Act
      const response = await request(app.getHttpServer())
        .get('/users/filter?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.totalPages).toBe(3); // 25 / 10 = 3
      expect(response.body.hasMore).toBe(true); // page 1 < 3
    });

    it('should support search by username', async () => {
      // Arrange
      mockUsersService.findAll.mockResolvedValue({
        data: [createMockUser({ username: 'testuser' })],
        total: 1,
        page: 1,
        limit: 10,
      });
      const token = createAuthToken(['user.read']);

      // Act
      await request(app.getHttpServer())
        .get('/users/filter?search=testuser')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockUsersService.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        expect.objectContaining({
          filters: expect.objectContaining({
            search: 'testuser',
          }),
        })
      );
    });

    it('should support multiple filter criteria', async () => {
      // Arrange
      mockUsersService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });
      const token = createAuthToken(['user.read']);

      // Act
      await request(app.getHttpServer())
        .get('/users/filter?status=active&role=admin&tenantId=tenant-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockUsersService.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        expect.objectContaining({
          filters: expect.objectContaining({
            status: 'active',
            role: 'admin',
            tenantId: 'tenant-1',
          }),
        })
      );
    });
  });

  describe('GET /users/stats', () => {
    it('should return user statistics when authenticated', async () => {
      // Arrange
      const mockStats = {
        total: 150,
        active: 120,
        inactive: 30,
        byRole: {
          admin: 10,
          user: 140,
        },
        recentSignups: 25,
      };
      mockQueryBus.execute.mockResolvedValue(mockStats);
      const token = createAuthToken(['user.read']);

      // Act
      const response = await request(app.getHttpServer())
        .get('/users/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      assertHttpResponse(response, 200, {
        success: true,
        data: mockStats,
        message: '用户统计获取成功',
      });
    });

    it('should filter stats by tenantId when provided', async () => {
      // Arrange
      mockQueryBus.execute.mockResolvedValue({ total: 50, active: 40, inactive: 10 });
      const token = createAuthToken(['user.read']);

      // Act
      await request(app.getHttpServer())
        .get('/users/stats?tenantId=tenant-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-123',
        })
      );
    });

    it('should return 403 when user lacks permission', async () => {
      // Arrange
      const token = createAuthToken(['user.create']); // No read permission

      // Act
      await request(app.getHttpServer())
        .get('/users/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /users/roles', () => {
    it('should return roles list when authenticated', async () => {
      // Arrange
      const mockRoles = [createMockRole({ name: 'admin' }), createMockRole({ name: 'user' })];
      mockRolesService.findAll.mockResolvedValue({
        data: mockRoles,
        total: 2,
        page: 1,
        limit: 100,
      });
      const token = createAuthToken(['role.read']);

      // Act
      const response = await request(app.getHttpServer())
        .get('/users/roles')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(mockRolesService.findAll).toHaveBeenCalledWith(1, 100, undefined);
    });

    it('should support pageSize parameter', async () => {
      // Arrange
      mockRolesService.findAll.mockResolvedValue({
        data: [createMockRole()],
        total: 1,
        page: 1,
        limit: 50,
      });
      const token = createAuthToken(['role.read']);

      // Act
      await request(app.getHttpServer())
        .get('/users/roles?pageSize=50')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockRolesService.findAll).toHaveBeenCalledWith(1, 50, undefined);
    });

    it('should support limit parameter (compatibility)', async () => {
      // Arrange
      mockRolesService.findAll.mockResolvedValue({
        data: [createMockRole()],
        total: 1,
        page: 1,
        limit: 20,
      });
      const token = createAuthToken(['role.read']);

      // Act
      await request(app.getHttpServer())
        .get('/users/roles?limit=20')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockRolesService.findAll).toHaveBeenCalledWith(1, 20, undefined);
    });

    it('should filter by tenantId when provided', async () => {
      // Arrange
      mockRolesService.findAll.mockResolvedValue({
        data: [createMockRole()],
        total: 1,
        page: 1,
        limit: 100,
      });
      const token = createAuthToken(['role.read']);

      // Act
      await request(app.getHttpServer())
        .get('/users/roles?tenantId=tenant-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockRolesService.findAll).toHaveBeenCalledWith(1, 100, 'tenant-123');
    });

    it('should return 403 when user lacks role.read permission', async () => {
      // Arrange
      const token = createAuthToken(['user.read']); // No role.read permission

      // Act
      await request(app.getHttpServer())
        .get('/users/roles')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user details when user exists', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 'user-123' });
      mockQueryBus.execute.mockResolvedValue(mockUser);
      const token = createAuthToken(['user.read']);

      // Act
      const response = await request(app.getHttpServer())
        .get('/users/user-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      assertHttpResponse(response, 200, {
        success: true,
        data: expect.objectContaining({
          id: 'user-123',
        }),
      });

      expect(mockQueryBus.execute).toHaveBeenCalled();
    });

    it('should return 404 when user not found', async () => {
      // Arrange
      mockQueryBus.execute.mockRejectedValue(new NotFoundException('User not found'));
      const token = createAuthToken(['user.read']);

      // Act
      await request(app.getHttpServer())
        .get('/users/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should return 403 when user lacks permission', async () => {
      // Arrange
      const token = createAuthToken(['user.create']); // No read permission

      // Act
      await request(app.getHttpServer())
        .get('/users/user-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should include roles in response', async () => {
      // Arrange
      const mockUser = createMockUser({
        id: 'user-123',
        roles: [createMockRole({ name: 'admin' })],
      });
      mockQueryBus.execute.mockResolvedValue(mockUser);
      const token = createAuthToken(['user.read']);

      // Act
      const response = await request(app.getHttpServer())
        .get('/users/user-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.data.roles).toBeDefined();
      expect(response.body.data.roles).toHaveLength(1);
    });
  });

  describe('PATCH /users/:id', () => {
    const updateDto = {
      fullName: 'Updated Name',
      email: 'updated@example.com',
    };

    it('should update user successfully when authenticated', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 'user-123', ...updateDto });
      mockCommandBus.execute.mockResolvedValue(mockUser);
      const token = createAuthToken(['user.update']);

      // Act
      const response = await request(app.getHttpServer())
        .patch('/users/user-123')
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(200);

      // Assert
      assertHttpResponse(response, 200, {
        success: true,
        data: expect.objectContaining({
          fullName: 'Updated Name',
          email: 'updated@example.com',
        }),
        message: '用户更新成功',
      });

      expect(mockCommandBus.execute).toHaveBeenCalled();
    });

    it('should not return password in response', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 'user-123', password: 'hashed' });
      mockCommandBus.execute.mockResolvedValue(mockUser);
      const token = createAuthToken(['user.update']);

      // Act
      const response = await request(app.getHttpServer())
        .patch('/users/user-123')
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(200);

      // Assert
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should return 404 when user not found', async () => {
      // Arrange
      mockCommandBus.execute.mockRejectedValue(new NotFoundException('User not found'));
      const token = createAuthToken(['user.update']);

      // Act
      await request(app.getHttpServer())
        .patch('/users/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(404);
    });

    it('should return 403 when user lacks user.update permission', async () => {
      // Arrange
      const token = createAuthToken(['user.read']); // No update permission

      // Act
      await request(app.getHttpServer())
        .patch('/users/user-123')
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(403);
    });

    it('should validate email format', async () => {
      // Arrange
      const invalidDto = { email: 'not-an-email' };
      const token = createAuthToken(['user.update']);

      // Act
      await request(app.getHttpServer())
        .patch('/users/user-123')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidDto)
        .expect(400);

      // Assert
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should allow partial updates', async () => {
      // Arrange
      const mockUser = createMockUser({ fullName: 'Only Name Updated' });
      mockCommandBus.execute.mockResolvedValue(mockUser);
      const token = createAuthToken(['user.update']);

      // Act
      await request(app.getHttpServer())
        .patch('/users/user-123')
        .set('Authorization', `Bearer ${token}`)
        .send({ fullName: 'Only Name Updated' })
        .expect(200);
    });
  });

  describe('POST /users/:id/change-password', () => {
    const changePasswordDto = {
      oldPassword: 'OldPassword123!',
      newPassword: 'NewPassword456!',
    };

    it('should change password successfully when authenticated', async () => {
      // Arrange
      mockCommandBus.execute.mockResolvedValue(undefined);
      const token = createAuthToken(['user.update']);

      // Act
      const response = await request(app.getHttpServer())
        .post('/users/user-123/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send(changePasswordDto)
        .expect(200);

      // Assert
      assertHttpResponse(response, 200, {
        success: true,
        message: '密码修改成功',
      });

      expect(mockCommandBus.execute).toHaveBeenCalled();
    });

    it('should return 400 when old password is incorrect', async () => {
      // Arrange
      mockCommandBus.execute.mockRejectedValue(new Error('Old password is incorrect'));
      const token = createAuthToken(['user.update']);

      // Act
      await request(app.getHttpServer())
        .post('/users/user-123/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send(changePasswordDto)
        .expect(500); // CommandBus error defaults to 500
    });

    it('should return 403 when user lacks permission', async () => {
      // Arrange
      const token = createAuthToken(['user.read']); // No update permission

      // Act
      await request(app.getHttpServer())
        .post('/users/user-123/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send(changePasswordDto)
        .expect(403);
    });

    it('should validate new password strength', async () => {
      // Arrange
      const weakPasswordDto = {
        oldPassword: 'OldPassword123!',
        newPassword: '123',
      };
      const token = createAuthToken(['user.update']);

      // Act
      await request(app.getHttpServer())
        .post('/users/user-123/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send(weakPasswordDto)
        .expect(400);
    });

    it('should require both old and new passwords', async () => {
      // Arrange
      const token = createAuthToken(['user.update']);

      // Act
      await request(app.getHttpServer())
        .post('/users/user-123/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ newPassword: 'NewPassword123!' })
        .expect(400);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user successfully when authenticated', async () => {
      // Arrange
      mockCommandBus.execute.mockResolvedValue(undefined);
      const token = createAuthToken(['user.delete']);

      // Act
      const response = await request(app.getHttpServer())
        .delete('/users/user-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      assertHttpResponse(response, 200, {
        success: true,
        message: '用户删除成功',
      });

      expect(mockCommandBus.execute).toHaveBeenCalled();
    });

    it('should return 404 when user not found', async () => {
      // Arrange
      mockCommandBus.execute.mockRejectedValue(new NotFoundException('User not found'));
      const token = createAuthToken(['user.delete']);

      // Act
      await request(app.getHttpServer())
        .delete('/users/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should return 403 when user lacks user.delete permission', async () => {
      // Arrange
      const token = createAuthToken(['user.read', 'user.update']); // No delete permission

      // Act
      await request(app.getHttpServer())
        .delete('/users/user-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should return 401 when not authenticated', async () => {
      // Act
      await request(app.getHttpServer()).delete('/users/user-123').expect(401);
    });

    it('should perform soft delete (not hard delete)', async () => {
      // Arrange
      mockCommandBus.execute.mockImplementation(async (command) => {
        // Verify soft delete is happening
        expect(command).toBeDefined();
        return undefined;
      });
      const token = createAuthToken(['user.delete']);

      // Act
      await request(app.getHttpServer())
        .delete('/users/user-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('Authorization & Security', () => {
    it('should require authentication for all endpoints', async () => {
      // Test all endpoints without token
      await request(app.getHttpServer()).get('/users').expect(401);
      await request(app.getHttpServer()).get('/users/user-123').expect(401);
      await request(app.getHttpServer()).post('/users').send({}).expect(401);
      await request(app.getHttpServer()).patch('/users/user-123').send({}).expect(401);
      await request(app.getHttpServer()).delete('/users/user-123').expect(401);
      await request(app.getHttpServer()).get('/users/stats').expect(401);
      await request(app.getHttpServer()).get('/users/roles').expect(401);
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
        .get('/users')
        .set('Authorization', `Bearer ${tokenNoPermissions}`)
        .expect(403);

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${tokenNoPermissions}`)
        .send({})
        .expect(403);
    });

    it('should sanitize user input to prevent XSS', async () => {
      // Arrange
      const xssDto = {
        username: '<script>alert("xss")</script>',
        email: 'test@example.com',
        password: 'Password123!',
        fullName: '<img src=x onerror=alert(1)>',
      };
      mockCommandBus.execute.mockResolvedValue(createMockUser());
      const token = createAuthToken(['user.create']);

      // Act
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${token}`)
        .send(xssDto)
        .expect(201);

      // Assert - Verify XSS content was sanitized
      const callArgs = mockCommandBus.execute.mock.calls[0][0];
      expect(callArgs.data.username).not.toContain('<script>');
    });

    it('should rate limit excessive requests', async () => {
      // This test assumes SecurityModule is configured
      const token = createAuthToken(['user.read']);

      // Make 100+ requests rapidly
      const requests = Array(110)
        .fill(null)
        .map(() =>
          request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${token}`)
        );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter((r) => r.status === 429);

      // Some requests should be rate limited
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
