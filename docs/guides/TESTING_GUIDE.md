# Testing Guide - Cloud Phone Platform

**Version**: 1.0
**Last Updated**: 2025-10-30
**Target Coverage**: 80%+ for all services

---

## Table of Contents

1. [Overview](#overview)
2. [Testing Infrastructure](#testing-infrastructure)
3. [Testing Standards](#testing-standards)
4. [Writing Controller Tests](#writing-controller-tests)
5. [Writing Service Tests](#writing-service-tests)
6. [Writing Guard Tests](#writing-guard-tests)
7. [Writing Event Consumer Tests](#writing-event-consumer-tests)
8. [Integration & E2E Tests](#integration--e2e-tests)
9. [Best Practices](#best-practices)
10. [Common Patterns](#common-patterns)
11. [Troubleshooting](#troubleshooting)

---

## Overview

### Testing Philosophy

Our testing strategy follows these principles:

1. **Comprehensive Coverage**: Minimum 80% code coverage for production code
2. **Test Pyramid**: More unit tests, fewer integration tests, minimal E2E tests
3. **Fast Feedback**: Unit tests should run in < 5 seconds per service
4. **Isolation**: Each test should be independent and not affect others
5. **Readability**: Tests are documentation - make them clear and descriptive

### Testing Layers

```
           E2E Tests (5%)
         ┌─────────────┐
         │  Full System │
         └─────────────┘
              ▲
              │
    Integration Tests (15%)
   ┌───────────────────────┐
   │ Database, RabbitMQ,   │
   │ Redis, External APIs  │
   └───────────────────────┘
              ▲
              │
      Unit Tests (80%)
  ┌──────────────────────────┐
  │ Controllers, Services,   │
  │ Guards, Pipes, Utilities │
  └──────────────────────────┘
```

### Test File Naming Convention

```
src/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.controller.spec.ts      ✓ Controller tests
│   ├── auth.service.ts
│   ├── auth.service.spec.ts         ✓ Service tests
│   ├── guards/
│   │   ├── jwt.guard.ts
│   │   └── jwt.guard.spec.ts        ✓ Guard tests
│   └── strategies/
│       ├── jwt.strategy.ts
│       └── jwt.strategy.spec.ts     ✓ Strategy tests
```

---

## Testing Infrastructure

### Available Test Utilities

We provide comprehensive testing utilities in `@cloudphone/shared`:

```typescript
import {
  // App Creation
  createTestApp,

  // JWT & Auth
  generateTestJwt,
  generateServiceToken,
  authenticatedRequest,

  // HTTP Assertions
  assertHttpResponse,

  // Event Testing
  mockRabbitMQMessage,
  assertEventPublished,

  // Database & Redis Helpers
  DatabaseTestHelper,
  RedisTestHelper,

  // Retry Logic
  retryUntil,
} from '@cloudphone/shared/testing/test-helpers';

import {
  // Entity Mocks
  createMockUser,
  createMockDevice,
  createMockRole,
  createMockPermission,
  createMockQuota,

  // Service Mocks
  createMockRepository,
  createMockEventBusService,
  createMockCacheService,
  createMockConfigService,
  createMockJwtService,
  createMockRedisClient,

  // Batch Creation
  createMockUsers,
  createMockDevices,
} from '@cloudphone/shared/testing/mock-factories';
```

### Test Setup Template

Every test file should follow this structure:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { createTestApp } from '@cloudphone/shared/testing/test-helpers';
import { createMockRepository, createMockEventBusService } from '@cloudphone/shared/testing/mock-factories';

describe('YourService/Controller/Guard', () => {
  let app: INestApplication;
  let service: YourService;
  let mockRepository: any;
  let mockEventBus: any;

  beforeAll(async () => {
    // Setup mocks
    mockRepository = createMockRepository();
    mockEventBus = createMockEventBusService();

    // Create test module
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        YourService,
        { provide: getRepositoryToken(YourEntity), useValue: mockRepository },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    // Create test app (for controllers)
    app = await createTestApp(moduleRef);
    service = moduleRef.get<YourService>(YourService);
  });

  afterAll(async () => {
    await app?.close();
  });

  afterEach(() => {
    // Clear all mocks after each test
    jest.clearAllMocks();
  });

  describe('method/endpoint name', () => {
    it('should do something successfully', async () => {
      // Arrange
      const input = { ... };
      mockRepository.findOne.mockResolvedValue(mockData);

      // Act
      const result = await service.method(input);

      // Assert
      expect(result).toBeDefined();
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: input.id } });
    });

    it('should throw error when not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.method('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
```

---

## Testing Standards

### Coverage Requirements

| Layer | Minimum Coverage | Target Coverage |
|-------|-----------------|-----------------|
| Controllers | 85% | 95% |
| Services | 80% | 90% |
| Guards | 90% | 100% |
| Pipes | 80% | 90% |
| Utilities | 80% | 90% |
| Overall | 80% | 85% |

### Test Case Requirements

Every public method/endpoint must have tests for:

1. **Happy Path**: Successful execution with valid input
2. **Error Cases**: All error conditions (not found, validation errors, etc.)
3. **Edge Cases**: Boundary conditions, empty arrays, null values
4. **Authorization**: Permission checks (if applicable)
5. **Side Effects**: Event publishing, database updates, cache invalidation

### Test Naming Convention

Use descriptive test names following the pattern:

```typescript
describe('MethodName', () => {
  it('should [expected behavior] when [condition]', async () => {
    // Test implementation
  });
});
```

Examples:
```typescript
it('should return user when valid ID is provided')
it('should throw NotFoundException when user does not exist')
it('should throw ForbiddenException when user lacks permission')
it('should publish UserCreatedEvent after successful creation')
it('should invalidate cache when user is updated')
```

---

## Writing Controller Tests

Controllers are the entry point to your API. Test HTTP behavior, validation, guards, and response formats.

### Example: Auth Controller Test

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { createTestApp, assertHttpResponse } from '@cloudphone/shared/testing/test-helpers';
import { createMockUser } from '@cloudphone/shared/testing/mock-factories';

describe('AuthController', () => {
  let app: INestApplication;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    generateCaptcha: jest.fn(),
    refreshToken: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    app = await createTestApp(moduleRef);
    authService = moduleRef.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    const loginDto = {
      username: 'testuser',
      password: 'password123',
      captcha: 'ABC123',
      captchaId: 'captcha-uuid',
    };

    it('should return access token and user info when credentials are valid', async () => {
      // Arrange
      const mockUser = createMockUser({ username: 'testuser' });
      const mockResponse = {
        accessToken: 'jwt.token.here',
        refreshToken: 'refresh.token.here',
        user: mockUser,
      };
      mockAuthService.login.mockResolvedValue(mockResponse);

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      // Assert
      assertHttpResponse(response, 200, {
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: expect.objectContaining({
          id: mockUser.id,
          username: 'testuser',
        }),
      });

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should return 401 when credentials are invalid', async () => {
      // Arrange
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials')
      );

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      // Assert
      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Invalid credentials',
      });
    });

    it('should return 400 when validation fails', async () => {
      // Arrange
      const invalidDto = { username: 'test' }; // Missing required fields

      // Act
      await request(app.getHttpServer())
        .post('/auth/login')
        .send(invalidDto)
        .expect(400);

      // Assert
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should return 429 when rate limit is exceeded', async () => {
      // This requires SecurityModule to be imported in test module
      // Make 100+ requests in quick succession
      const requests = Array(110).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send(loginDto)
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('POST /auth/register', () => {
    const registerDto = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      fullName: 'New User',
    };

    it('should create new user and return access token', async () => {
      // Arrange
      const mockUser = createMockUser(registerDto);
      const mockResponse = {
        accessToken: 'jwt.token.here',
        user: mockUser,
      };
      mockAuthService.register.mockResolvedValue(mockResponse);

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // Assert
      assertHttpResponse(response, 201, {
        accessToken: expect.any(String),
        user: expect.objectContaining({
          username: 'newuser',
          email: 'newuser@example.com',
        }),
      });

      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should return 409 when username already exists', async () => {
      // Arrange
      mockAuthService.register.mockRejectedValue(
        new ConflictException('Username already exists')
      );

      // Act
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout user successfully when authenticated', async () => {
      // Arrange
      const token = 'valid.jwt.token';
      mockAuthService.logout.mockResolvedValue({ message: 'Logged out successfully' });

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.message).toBe('Logged out successfully');
      expect(mockAuthService.logout).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      // Act
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });
  });

  describe('GET /auth/captcha', () => {
    it('should generate and return captcha', async () => {
      // Arrange
      const mockCaptcha = {
        id: 'captcha-uuid',
        image: 'data:image/svg+xml;base64,...',
        expiresIn: 300,
      };
      mockAuthService.generateCaptcha.mockResolvedValue(mockCaptcha);

      // Act
      const response = await request(app.getHttpServer())
        .get('/auth/captcha')
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        id: expect.any(String),
        image: expect.stringContaining('data:image'),
        expiresIn: 300,
      });
    });
  });
});
```

### Controller Test Checklist

- [ ] Test all endpoints (GET, POST, PUT, PATCH, DELETE)
- [ ] Test successful responses (200, 201, 204)
- [ ] Test error responses (400, 401, 403, 404, 409, 500)
- [ ] Test validation (DTO validation with class-validator)
- [ ] Test authentication (with and without JWT)
- [ ] Test authorization (different user roles)
- [ ] Test pagination (limit, offset, ordering)
- [ ] Test query parameters and filters
- [ ] Test rate limiting (if applicable)
- [ ] Verify service methods are called with correct arguments

---

## Writing Service Tests

Services contain business logic. Test all methods, error handling, and side effects.

### Example: User Service Test

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { EventBusService } from '@cloudphone/shared';
import {
  createMockRepository,
  createMockEventBusService,
  createMockUser,
} from '@cloudphone/shared/testing/mock-factories';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let mockRepository: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockRepository = createMockRepository();
    mockEventBus = createMockEventBusService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepository },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.findById(mockUser.id);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        relations: ['roles', 'roles.permissions'],
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('create', () => {
    it('should create user and publish UserCreatedEvent', async () => {
      // Arrange
      const createDto = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'hashed-password',
      };
      const mockUser = createMockUser(createDto);

      mockRepository.findOne.mockResolvedValue(null); // Username available
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockRepository.save).toHaveBeenCalledWith(mockUser);
      expect(mockEventBus.publishUserEvent).toHaveBeenCalledWith('created', {
        userId: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
      });
    });

    it('should throw ConflictException when username exists', async () => {
      // Arrange
      const createDto = { username: 'existing', email: 'test@example.com', password: 'pass' };
      mockRepository.findOne.mockResolvedValue(createMockUser());

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockEventBus.publishUserEvent).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update user and publish UserUpdatedEvent', async () => {
      // Arrange
      const userId = 'user-id';
      const updateDto = { fullName: 'Updated Name' };
      const existingUser = createMockUser({ id: userId });
      const updatedUser = { ...existingUser, ...updateDto };

      mockRepository.findOne.mockResolvedValue(existingUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(userId, updateDto);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...existingUser,
        ...updateDto,
      });
      expect(mockEventBus.publishUserEvent).toHaveBeenCalledWith('updated', {
        userId,
        changes: updateDto,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('invalid-id', {})).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('delete', () => {
    it('should soft delete user and publish UserDeletedEvent', async () => {
      // Arrange
      const userId = 'user-id';
      const mockUser = createMockUser({ id: userId });

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue({ ...mockUser, deletedAt: new Date() });

      // Act
      await service.delete(userId);

      // Assert
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: userId,
          deletedAt: expect.any(Date),
        })
      );
      expect(mockEventBus.publishUserEvent).toHaveBeenCalledWith('deleted', {
        userId,
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      // Arrange
      const mockUsers = [createMockUser(), createMockUser()];
      mockRepository.findAndCount.mockResolvedValue([mockUsers, 2]);

      // Act
      const result = await service.findAll({ page: 1, limit: 10 });

      // Assert
      expect(result).toEqual({
        data: mockUsers,
        total: 2,
        page: 1,
        limit: 10,
      });
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });

    it('should apply filters when provided', async () => {
      // Arrange
      const filters = { status: 'active', tenantId: 'tenant-1' };
      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act
      await service.findAll({ ...filters, page: 1, limit: 10 });

      // Assert
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: filters,
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });
  });
});
```

### Service Test Checklist

- [ ] Test all public methods
- [ ] Test database operations (create, read, update, delete)
- [ ] Test event publishing (verify events are sent)
- [ ] Test error handling (not found, conflicts, validation)
- [ ] Test business logic and calculations
- [ ] Test transaction handling (if applicable)
- [ ] Test cache operations (get, set, invalidate)
- [ ] Verify repository methods are called correctly
- [ ] Test edge cases (empty results, null values)

---

## Writing Guard Tests

Guards control access to endpoints. Test authentication and authorization logic.

### Example: JWT Guard Test

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { createMockJwtService, createMockUser } from '@cloudphone/shared/testing/mock-factories';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;

  beforeEach(async () => {
    const mockJwtService = createMockJwtService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwtService = module.get<JwtService>(JwtService);
  });

  const createMockExecutionContext = (token?: string): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: token ? `Bearer ${token}` : undefined,
          },
        }),
      }),
    } as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should return true when valid JWT is provided', async () => {
      // Arrange
      const mockUser = createMockUser();
      const token = 'valid.jwt.token';
      (jwtService.verify as jest.Mock).mockReturnValue({
        sub: mockUser.id,
        username: mockUser.username,
        roles: ['user'],
      });

      const context = createMockExecutionContext(token);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith(token);
    });

    it('should throw UnauthorizedException when no token provided', async () => {
      // Arrange
      const context = createMockExecutionContext();

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      // Arrange
      const token = 'invalid.token';
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const context = createMockExecutionContext(token);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      // Arrange
      const token = 'expired.token';
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Token expired');
      });

      const context = createMockExecutionContext(token);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
```

### Example: Roles Guard Test

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { createMockUser } from '@cloudphone/shared/testing/mock-factories';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const createMockContext = (user: any, roles: string[] = []): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as any;
  };

  describe('canActivate', () => {
    it('should return true when no roles required', () => {
      // Arrange
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockContext(createMockUser());

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when user has required role', () => {
      // Arrange
      const user = createMockUser({ roles: ['admin'] });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      const context = createMockContext(user);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user lacks required role', () => {
      // Arrange
      const user = createMockUser({ roles: ['user'] });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      const context = createMockContext(user);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when user has any of the required roles', () => {
      // Arrange
      const user = createMockUser({ roles: ['editor'] });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'editor']);
      const context = createMockContext(user);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });
});
```

### Guard Test Checklist

- [ ] Test successful authorization
- [ ] Test missing authentication (401)
- [ ] Test insufficient permissions (403)
- [ ] Test invalid tokens
- [ ] Test expired tokens
- [ ] Test role-based access control
- [ ] Test permission-based access control
- [ ] Test edge cases (no user, empty roles)

---

## Writing Event Consumer Tests

Event consumers process RabbitMQ messages. Test message handling, error cases, and acknowledgments.

### Example: Device Events Consumer Test

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { DeviceEventsConsumer } from './device-events.consumer';
import { NotificationsService } from '../notifications/notifications.service';
import { mockRabbitMQMessage } from '@cloudphone/shared/testing/test-helpers';
import { createMockEventPayload } from '@cloudphone/shared/testing/mock-factories';

describe('DeviceEventsConsumer', () => {
  let consumer: DeviceEventsConsumer;
  let mockNotificationsService: any;

  beforeEach(async () => {
    mockNotificationsService = {
      sendDeviceNotification: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceEventsConsumer,
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    consumer = module.get<DeviceEventsConsumer>(DeviceEventsConsumer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleDeviceCreated', () => {
    it('should send notification when device is created', async () => {
      // Arrange
      const payload = createMockEventPayload('device.created', {
        deviceId: 'device-123',
        userId: 'user-456',
        deviceName: 'My Phone',
      });
      const message = mockRabbitMQMessage(payload);

      // Act
      await consumer.handleDeviceCreated(payload, message);

      // Assert
      expect(mockNotificationsService.sendDeviceNotification).toHaveBeenCalledWith(
        'user-456',
        {
          type: 'device.created',
          title: 'Device Created',
          message: expect.stringContaining('My Phone'),
          deviceId: 'device-123',
        }
      );
    });

    it('should log error and not throw when notification fails', async () => {
      // Arrange
      const payload = createMockEventPayload('device.created', {});
      const message = mockRabbitMQMessage(payload);
      mockNotificationsService.sendDeviceNotification.mockRejectedValue(
        new Error('SMTP connection failed')
      );

      const loggerSpy = jest.spyOn(consumer['logger'], 'error');

      // Act
      await expect(
        consumer.handleDeviceCreated(payload, message)
      ).resolves.not.toThrow();

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send device created notification'),
        expect.any(Error)
      );
    });
  });

  describe('handleDeviceDeleted', () => {
    it('should send notification when device is deleted', async () => {
      // Arrange
      const payload = createMockEventPayload('device.deleted', {
        deviceId: 'device-123',
        userId: 'user-456',
        deviceName: 'Old Phone',
      });
      const message = mockRabbitMQMessage(payload);

      // Act
      await consumer.handleDeviceDeleted(payload, message);

      // Assert
      expect(mockNotificationsService.sendDeviceNotification).toHaveBeenCalledWith(
        'user-456',
        expect.objectContaining({
          type: 'device.deleted',
          title: 'Device Deleted',
        })
      );
    });
  });

  describe('handleDeviceError', () => {
    it('should send alert notification when device encounters error', async () => {
      // Arrange
      const payload = createMockEventPayload('device.error', {
        deviceId: 'device-123',
        userId: 'user-456',
        error: 'Container crashed',
      });
      const message = mockRabbitMQMessage(payload);

      // Act
      await consumer.handleDeviceError(payload, message);

      // Assert
      expect(mockNotificationsService.sendDeviceNotification).toHaveBeenCalledWith(
        'user-456',
        expect.objectContaining({
          type: 'device.error',
          priority: 'high',
          message: expect.stringContaining('Container crashed'),
        })
      );
    });
  });
});
```

### Event Consumer Test Checklist

- [ ] Test message parsing and validation
- [ ] Test successful message processing
- [ ] Test error handling (don't throw, log instead)
- [ ] Test all routing keys / event types
- [ ] Test message acknowledgment behavior
- [ ] Test side effects (database updates, API calls)
- [ ] Test with malformed messages
- [ ] Test idempotency (handling duplicate messages)

---

## Integration & E2E Tests

Integration tests verify multiple components working together. E2E tests verify entire user flows.

### Example: Device Creation E2E Test

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseTestHelper, RedisTestHelper, generateTestJwt } from '@cloudphone/shared/testing/test-helpers';
import { createMockUser } from '@cloudphone/shared/testing/mock-factories';

describe('Device Creation Flow (E2E)', () => {
  let app: INestApplication;
  let dbHelper: DatabaseTestHelper;
  let redisHelper: RedisTestHelper;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dbHelper = new DatabaseTestHelper(app.get('DATABASE_CONNECTION'));
    redisHelper = new RedisTestHelper(app.get('REDIS_CLIENT'));

    // Create test user
    const user = await dbHelper.createUser(createMockUser());
    userId = user.id;
    authToken = generateTestJwt({ sub: userId, username: user.username });
  });

  afterAll(async () => {
    await dbHelper.cleanup();
    await redisHelper.cleanup();
    await app.close();
  });

  it('should create device, update quota, and send notifications', async () => {
    // Step 1: Check initial quota
    const initialQuota = await request(app.getHttpServer())
      .get(`/api/quotas/user/${userId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(initialQuota.body.currentDevices).toBe(0);

    // Step 2: Create device
    const createResponse = await request(app.getHttpServer())
      .post('/api/devices')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Device',
        androidVersion: '11',
        cpuCores: 2,
        memoryMb: 2048,
      })
      .expect(201);

    const deviceId = createResponse.body.id;
    expect(createResponse.body).toMatchObject({
      name: 'Test Device',
      userId,
      status: 'pending',
    });

    // Step 3: Verify quota updated
    await retryUntil(async () => {
      const updatedQuota = await request(app.getHttpServer())
        .get(`/api/quotas/user/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      return updatedQuota.body.currentDevices === 1;
    }, { maxAttempts: 10, delayMs: 500 });

    // Step 4: Verify device in database
    const deviceInDb = await dbHelper.query(
      'SELECT * FROM devices WHERE id = $1',
      [deviceId]
    );
    expect(deviceInDb.rows[0]).toBeDefined();

    // Step 5: Verify notification sent (check Redis or WebSocket)
    const notifications = await redisHelper.get(`notifications:user:${userId}`);
    expect(notifications).toContain('device.created');

    // Step 6: Verify device can be retrieved
    const getResponse = await request(app.getHttpServer())
      .get(`/api/devices/${deviceId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(getResponse.body.id).toBe(deviceId);
  });

  it('should reject device creation when quota exceeded', async () => {
    // Arrange: Set quota limit to 1
    await dbHelper.query(
      'UPDATE quotas SET max_devices = 1 WHERE user_id = $1',
      [userId]
    );

    // Act: Try to create second device
    await request(app.getHttpServer())
      .post('/api/devices')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Second Device',
        androidVersion: '11',
        cpuCores: 2,
        memoryMb: 2048,
      })
      .expect(403);

    // Assert: Quota still at 1
    const quota = await request(app.getHttpServer())
      .get(`/api/quotas/user/${userId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(quota.body.currentDevices).toBe(1);
  });
});
```

### Integration Test Checklist

- [ ] Test database transactions
- [ ] Test event publishing and consumption
- [ ] Test cache invalidation
- [ ] Test external API calls (with mocks)
- [ ] Test service-to-service communication
- [ ] Test error propagation across services
- [ ] Test data consistency
- [ ] Clean up test data after each test

---

## Best Practices

### 1. Use AAA Pattern (Arrange, Act, Assert)

```typescript
it('should do something', async () => {
  // Arrange - Setup test data and mocks
  const input = { ... };
  mockService.method.mockResolvedValue(expectedOutput);

  // Act - Execute the code under test
  const result = await service.method(input);

  // Assert - Verify the result
  expect(result).toEqual(expectedOutput);
});
```

### 2. Test One Thing Per Test

```typescript
// ✅ Good
it('should return user when found', async () => { ... });
it('should throw NotFoundException when not found', async () => { ... });

// ❌ Bad
it('should handle user retrieval', async () => {
  // Tests both success and error cases
});
```

### 3. Use Descriptive Test Names

```typescript
// ✅ Good
it('should throw ForbiddenException when user lacks admin role')

// ❌ Bad
it('test authorization')
```

### 4. Mock External Dependencies

```typescript
// ✅ Good - Mock RabbitMQ
const mockEventBus = createMockEventBusService();

// ❌ Bad - Connect to real RabbitMQ
const eventBus = new EventBusService(realRabbitMQConnection);
```

### 5. Clean Up After Tests

```typescript
afterEach(() => {
  jest.clearAllMocks(); // Clear mock call history
});

afterAll(async () => {
  await app.close(); // Close application
  await dbHelper.cleanup(); // Clean database
});
```

### 6. Use Factories for Test Data

```typescript
// ✅ Good
const user = createMockUser({ username: 'testuser' });

// ❌ Bad
const user = {
  id: 'uuid-here',
  username: 'testuser',
  email: 'test@example.com',
  // ... 20 more fields
};
```

### 7. Test Error Messages

```typescript
// ✅ Good
await expect(service.method()).rejects.toThrow(
  new NotFoundException('User with ID xyz not found')
);

// ❌ Bad
await expect(service.method()).rejects.toThrow();
```

### 8. Avoid Testing Implementation Details

```typescript
// ✅ Good - Test behavior
expect(result.status).toBe('active');

// ❌ Bad - Test implementation
expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
```

### 9. Use Snapshot Testing Sparingly

```typescript
// ✅ Good for complex objects
expect(result).toMatchSnapshot();

// ⚠️ Update snapshots carefully
// npm test -- -u
```

### 10. Parallelize Tests

```typescript
// jest.config.js
module.exports = {
  maxWorkers: '50%', // Use half of CPU cores
  testTimeout: 10000, // 10 second timeout
};
```

---

## Common Patterns

### Testing Async Operations

```typescript
it('should handle async operation', async () => {
  const promise = service.asyncMethod();
  await expect(promise).resolves.toEqual(expectedValue);
});

it('should reject with error', async () => {
  const promise = service.failingMethod();
  await expect(promise).rejects.toThrow(CustomError);
});
```

### Testing Event Publishing

```typescript
it('should publish event after successful operation', async () => {
  // Arrange
  const mockEventBus = createMockEventBusService();

  // Act
  await service.createDevice(dto);

  // Assert
  expect(mockEventBus.publishDeviceEvent).toHaveBeenCalledWith('created', {
    deviceId: expect.any(String),
    userId: dto.userId,
  });
});
```

### Testing Cache Operations

```typescript
it('should return cached value on second call', async () => {
  // Arrange
  const mockCache = createMockCacheService();
  mockCache.get.mockResolvedValueOnce(null); // First call - cache miss
  mockCache.get.mockResolvedValueOnce(cachedData); // Second call - cache hit

  // Act
  const firstResult = await service.getData('key');
  const secondResult = await service.getData('key');

  // Assert
  expect(mockRepository.findOne).toHaveBeenCalledTimes(1); // Only called once
  expect(mockCache.set).toHaveBeenCalledWith('key', firstResult);
  expect(secondResult).toEqual(cachedData);
});
```

### Testing Pagination

```typescript
it('should return paginated results', async () => {
  // Arrange
  const mockUsers = createMockUsers(25);
  mockRepository.findAndCount.mockResolvedValue([mockUsers.slice(0, 10), 25]);

  // Act
  const result = await service.findAll({ page: 1, limit: 10 });

  // Assert
  expect(result.data).toHaveLength(10);
  expect(result.total).toBe(25);
  expect(result.page).toBe(1);
  expect(result.totalPages).toBe(3);
});
```

### Testing Transactions

```typescript
it('should rollback on error', async () => {
  // Arrange
  const mockManager = {
    transaction: jest.fn(async (callback) => {
      await callback(mockManager);
      throw new Error('Database error');
    }),
    save: jest.fn(),
  };

  mockRepository.manager = mockManager;

  // Act & Assert
  await expect(service.createWithTransaction(dto)).rejects.toThrow();
  expect(mockManager.save).toHaveBeenCalled();
  // Verify rollback occurred (no data persisted)
});
```

---

## Troubleshooting

### Issue: Tests Timing Out

**Solution:**
```typescript
// Increase timeout for specific test
it('should complete long operation', async () => {
  // Test code
}, 30000); // 30 second timeout

// Or globally in jest.config.js
module.exports = {
  testTimeout: 15000,
};
```

### Issue: Mock Not Working

**Solution:**
```typescript
// Ensure mock is reset between tests
afterEach(() => {
  jest.clearAllMocks();
});

// Or use mockReset for complete reset
afterEach(() => {
  jest.resetAllMocks();
});
```

### Issue: Database Connection Pool Exhausted

**Solution:**
```typescript
// Close connections properly
afterAll(async () => {
  await app.close();
  await dataSource.destroy();
});

// Or increase pool size in test config
{
  poolSize: 10,
}
```

### Issue: Race Conditions in Tests

**Solution:**
```typescript
// Use retryUntil for eventual consistency
await retryUntil(async () => {
  const result = await checkCondition();
  return result === expectedValue;
}, { maxAttempts: 10, delayMs: 500 });
```

### Issue: Tests Pass Locally but Fail in CI

**Solution:**
1. Check environment variables
2. Ensure proper cleanup between tests
3. Avoid hard-coded timeouts
4. Use TestContainers for real dependencies

---

## Running Tests

### Run All Tests
```bash
# All services
pnpm test

# Specific service
cd backend/user-service
pnpm test
```

### Run with Coverage
```bash
pnpm test:cov

# Open coverage report
open coverage/lcov-report/index.html
```

### Run Specific Test File
```bash
pnpm test auth.controller.spec.ts
```

### Run in Watch Mode
```bash
pnpm test:watch
```

### Run E2E Tests
```bash
pnpm test:e2e
```

### Debug Tests in VSCode
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

---

## Next Steps

1. **Start with P0 Tests**: Focus on controllers and guards first
2. **Review Coverage Reports**: Identify gaps regularly
3. **Update This Guide**: Add new patterns as you discover them
4. **Code Review**: Ensure tests are reviewed alongside code
5. **CI Integration**: Fail builds on low coverage

---

## Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Cloud Phone Platform Testing Plan](./TESTING_COMPLETION_PLAN.md)

---

**Last Updated**: 2025-10-30
**Maintained By**: Cloud Phone Platform Team
