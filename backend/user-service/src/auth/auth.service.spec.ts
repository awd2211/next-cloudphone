// IMPORTANT: Mock bcryptjs模块必须在所有imports之前
// 这样AuthService import的bcryptjs也会被mock
const mockBcrypt = {
  hash: jest.fn(),
  compare: jest.fn(),
};
jest.mock('bcryptjs', () => mockBcrypt);

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { User, UserStatus } from '../entities/user.entity';
import { CaptchaService } from './services/captcha.service';
import { CacheService } from '../cache/cache.service';
import { UserRegistrationSaga } from './registration.saga';
import { UserMetricsService } from '../metrics/user-metrics.service';
import { EventBusService, DistributedLockService } from '@cloudphone/shared';
import {
  createMockRepository,
  createMockUser,
  createMockRole,
  createMockPermission,
  createMockJwtService,
  createMockCacheService,
} from '@cloudphone/shared/testing';
import * as bcrypt from 'bcryptjs';

// 预生成的测试密码哈希（password123）
// 使用固定的哈希避免每次生成不同的salt导致测试不稳定
const TEST_PASSWORD = 'password123';
const TEST_PASSWORD_HASH = '$2b$10$GG.EwUZKpbP/9omNRYq7w.NZZjka/se76YeeWW6CDNVNsfspKZwqW';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: ReturnType<typeof createMockRepository>;
  let jwtService: ReturnType<typeof createMockJwtService>;
  let captchaService: jest.Mocked<CaptchaService>;
  let cacheService: ReturnType<typeof createMockCacheService>;
  let registrationSaga: any;
  let mockDataSource: any;
  let mockQueryRunner: any;

  const mockCaptchaService = {
    generate: jest.fn(),
    verify: jest.fn(),
  };

  const mockEventBus = {
    publish: jest.fn().mockResolvedValue(undefined),
    publishUserEvent: jest.fn().mockResolvedValue(undefined),
    publishDeviceEvent: jest.fn().mockResolvedValue(undefined),
    publishBillingEvent: jest.fn().mockResolvedValue(undefined),
    publishSystemError: jest.fn().mockResolvedValue(undefined),
  };

  const mockUserRegistrationSaga = {
    startRegistration: jest.fn().mockResolvedValue({ sagaId: 'test-saga-id' }),
    completeRegistration: jest.fn().mockResolvedValue(undefined),
    cancelRegistration: jest.fn().mockResolvedValue(undefined),
    execute: jest.fn().mockResolvedValue(undefined),
    compensate: jest.fn().mockResolvedValue(undefined),
  };

  // 创建可复用的 QueryBuilder Mock
  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    // 创建 QueryRunner Mock
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      isTransactionActive: true,
      manager: {
        save: jest.fn(),
        createQueryBuilder: jest.fn(() => mockQueryBuilder),
      },
    };

    // 创建 DataSource Mock
    mockDataSource = {
      createQueryRunner: jest.fn(() => mockQueryRunner),
    };

    userRepository = createMockRepository();
    jwtService = createMockJwtService();
    cacheService = createMockCacheService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: CaptchaService,
          useValue: mockCaptchaService,
        },
        {
          provide: CacheService,
          useValue: cacheService,
        },
        {
          provide: UserRegistrationSaga,
          useValue: mockUserRegistrationSaga,
        },
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
        {
          provide: EventBusService,
          useValue: mockEventBus,
        },
        {
          provide: UserMetricsService,
          useValue: {
            recordLogin: jest.fn().mockResolvedValue(undefined),
            recordLogout: jest.fn().mockResolvedValue(undefined),
            recordLoginFailure: jest.fn().mockResolvedValue(undefined),
            recordLoginAttempt: jest.fn().mockResolvedValue(undefined),
            recordLoginSuccess: jest.fn().mockResolvedValue(undefined),
            recordUserLocked: jest.fn().mockResolvedValue(undefined),
            recordPasswordChange: jest.fn().mockResolvedValue(undefined),
            getLoginMetrics: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: DistributedLockService,
          useValue: {
            acquireLock: jest.fn().mockResolvedValue(true),
            releaseLock: jest.fn().mockResolvedValue(true),
            extendLock: jest.fn().mockResolvedValue(true),
            isLocked: jest.fn().mockResolvedValue(false),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    captchaService = module.get(CaptchaService);
    registrationSaga = module.get<UserRegistrationSaga>(UserRegistrationSaga);
  });

  beforeEach(() => {
    // 注意：不使用jest.clearAllMocks()，因为它会清除bcrypt mock的实现
    // 而是只清除特定的mock调用记录
    mockQueryRunner.connect.mockClear();
    mockQueryRunner.startTransaction.mockClear();
    mockQueryRunner.commitTransaction.mockClear();
    mockQueryRunner.rollbackTransaction.mockClear();
    mockQueryRunner.release.mockClear();
    mockQueryRunner.manager.save.mockClear();
    mockQueryRunner.manager.createQueryBuilder.mockClear();
    mockQueryBuilder.leftJoinAndSelect.mockClear();
    mockQueryBuilder.where.mockClear();
    mockQueryBuilder.setLock.mockClear();
    mockQueryBuilder.getOne.mockClear();
    userRepository.findOne.mockClear();
    userRepository.create.mockClear();
    userRepository.save.mockClear();
    jwtService.sign.mockClear();
    captchaService.generate.mockClear();
    captchaService.verify.mockClear();
    cacheService.get.mockClear();
    cacheService.set.mockClear();
    cacheService.del.mockClear();
    mockUserRegistrationSaga.startRegistration.mockClear();
    mockUserRegistrationSaga.completeRegistration.mockClear();
    mockUserRegistrationSaga.cancelRegistration.mockClear();

    // 配置bcrypt mock的默认行为
    // bcrypt.hash - 总是返回固定的测试哈希
    mockBcrypt.hash.mockResolvedValue(TEST_PASSWORD_HASH);

    // bcrypt.compare - 默认返回true（密码正确）
    // 在需要测试密码错误的场景中，测试用例会override这个mock
    mockBcrypt.compare.mockResolvedValue(true);
  });

  describe('getCaptcha', () => {
    it('应该成功生成验证码', async () => {
      // Arrange
      const mockCaptcha = {
        id: 'captcha-123',
        data: 'data:image/svg+xml;base64,...',
      };
      captchaService.generate.mockResolvedValue(mockCaptcha);

      // Act
      const result = await service.getCaptcha();

      // Assert
      expect(result).toEqual(mockCaptcha);
      expect(captchaService.generate).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('应该成功注册新用户', async () => {
      // Arrange
      const registerDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      };

      const mockSagaId = 'saga-123';
      registrationSaga.startRegistration.mockResolvedValue({ sagaId: mockSagaId });

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('注册请求已提交，正在处理中');
      expect(result.sagaId).toBe(mockSagaId);
      expect(result.data.username).toBe(registerDto.username);
      expect(result.data.email).toBe(registerDto.email);
      expect(registrationSaga.startRegistration).toHaveBeenCalledWith(registerDto);
    });

    // 注意：此测试已过时，因为 register 方法现在使用 Saga 异步处理，不会立即抛出异常
    // 用户名/邮箱验证在 Saga 中进行
    it.skip('应该在用户名已存在时抛出 ConflictException', async () => {
      // Arrange
      const registerDto = {
        username: 'existinguser',
        email: 'new@example.com',
        password: 'password123',
        fullName: 'Test User',
      };

      const existingUser = createMockUser({
        username: 'existinguser',
        email: 'other@example.com',
      });
      userRepository.findOne.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('用户名已存在');
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    // 注意：此测试已过时，因为 register 方法现在使用 Saga 异步处理，不会立即抛出异常
    // 用户名/邮箱验证在 Saga 中进行
    it.skip('应该在邮箱已存在时抛出 ConflictException', async () => {
      // Arrange
      const registerDto = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'password123',
        fullName: 'Test User',
      };

      const existingUser = createMockUser({
        username: 'otheruser',
        email: 'existing@example.com',
      });
      userRepository.findOne.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('邮箱已存在');
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    // 注意：此测试已过时，因为密码哈希现在在 Saga 中进行，不在 AuthService.register 中
    it.skip('应该对密码进行哈希处理', async () => {
      // Arrange
      const registerDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'plainPassword123',
        fullName: 'Test User',
      };

      userRepository.findOne.mockResolvedValue(null);
      const mockUser = createMockUser();
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      // Act
      await service.register(registerDto);

      // Assert
      const createCall = userRepository.create.mock.calls[0][0];
      expect(createCall.password).not.toBe(registerDto.password);
      expect(createCall.password).toMatch(/^\$2[aby]\$\d{1,2}\$/); // bcrypt hash格式
    });

    // 注意：此测试已过时，因为用户创建现在在 Saga 中进行，不在 AuthService.register 中
    it.skip('应该设置用户状态为 ACTIVE', async () => {
      // Arrange
      const registerDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      };

      userRepository.findOne.mockResolvedValue(null);
      const mockUser = createMockUser();
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      // Act
      await service.register(registerDto);

      // Assert
      const createCall = userRepository.create.mock.calls[0][0];
      expect(createCall.status).toBe(UserStatus.ACTIVE);
    });
  });

  describe('login', () => {
    // TODO: bcrypt.compare mock问题 - 详见 AUTH_SERVICE_TEST_BCRYPT_ISSUE.md
    // 这些测试将通过集成测试覆盖
    it('应该成功登录并返回 JWT token', async () => {
      // Arrange
      const loginDto = {
        username: 'testuser',
        password: 'password123',
        captcha: '1234',
        captchaId: 'captcha-123',
      };

      const mockRole = createMockRole({
        name: 'user',
        permissions: [createMockPermission({ resource: 'device', action: 'read' })],
      });

      const mockUser = createMockUser({
        username: loginDto.username,
        password: TEST_PASSWORD_HASH,
        status: UserStatus.ACTIVE,
        loginAttempts: 0,
        lockedUntil: null,
        roles: [mockRole],
      });

      captchaService.verify.mockResolvedValue(true);
      mockBcrypt.compare.mockResolvedValue(true); // 确保密码验证通过
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);
      mockQueryRunner.manager.save.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      // 验证bcrypt.compare mock已正确设置
      const testCompareResult = await mockBcrypt.compare('test', 'test');
      expect(testCompareResult).toBe(true);

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user).toHaveProperty('id');
      expect(result.user.username).toBe(loginDto.username);
      expect(captchaService.verify).toHaveBeenCalledWith(loginDto.captchaId, loginDto.captcha);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('应该在验证码错误时抛出 UnauthorizedException', async () => {
      // Arrange
      const loginDto = {
        username: 'testuser',
        password: 'password123',
        captcha: 'wrong',
        captchaId: 'captcha-123',
      };

      captchaService.verify.mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('验证码错误或已过期');
      expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('应该在用户不存在时抛出 UnauthorizedException', async () => {
      // Arrange
      const loginDto = {
        username: 'nonexistent',
        password: 'password123',
        captcha: '1234',
        captchaId: 'captcha-123',
      };

      captchaService.verify.mockResolvedValue(true);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('用户名或密码错误');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('应该在密码错误时增加失败次数', async () => {
      // Arrange
      const loginDto = {
        username: 'testuser',
        password: 'wrongpassword',
        captcha: '1234',
        captchaId: 'captcha-123',
      };

      const mockUser = createMockUser({
        username: loginDto.username,
        password: TEST_PASSWORD_HASH,
        loginAttempts: 2,
      });

      captchaService.verify.mockResolvedValue(true);
      mockBcrypt.compare.mockResolvedValue(false); // 密码错误
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);
      mockQueryRunner.manager.save.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);

      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
      const savedUser = mockQueryRunner.manager.save.mock.calls[0][1];
      expect(savedUser.loginAttempts).toBe(3);
    });

    it('应该在失败次数达到5次时锁定账号30分钟', async () => {
      // Arrange
      const loginDto = {
        username: 'testuser',
        password: 'wrongpassword',
        captcha: '1234',
        captchaId: 'captcha-123',
      };

      const mockUser = createMockUser({
        username: loginDto.username,
        password: TEST_PASSWORD_HASH,
        loginAttempts: 4, // 下次失败会达到5次
      });

      captchaService.verify.mockResolvedValue(true);
      mockBcrypt.compare.mockResolvedValue(false); // 密码错误
      // 每次调用 getOne 都返回一个新的用户对象副本
      mockQueryBuilder.getOne.mockImplementation(() => ({ ...mockUser }));
      mockQueryRunner.manager.save.mockResolvedValue(mockUser);

      // Act & Assert - 只调用一次
      await expect(service.login(loginDto)).rejects.toThrow('登录失败次数过多，账号已被锁定30分钟');

      // 验证 loginAttempts 从 4 增加到 5
      const savedUser = mockQueryRunner.manager.save.mock.calls[0][1];
      expect(savedUser.loginAttempts).toBe(5);
      expect(savedUser.lockedUntil).toBeInstanceOf(Date);
      expect(savedUser.lockedUntil.getTime()).toBeGreaterThan(Date.now());
    });

    it('应该在账号被锁定时拒绝登录', async () => {
      // Arrange
      const loginDto = {
        username: 'testuser',
        password: 'password123',
        captcha: '1234',
        captchaId: 'captcha-123',
      };

      const lockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 锁定10分钟
      const mockUser = createMockUser({
        username: loginDto.username,
        password: TEST_PASSWORD_HASH,
        lockedUntil,
      });

      captchaService.verify.mockResolvedValue(true);
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow(/账号已被锁定/);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('应该在账号状态非 ACTIVE 时拒绝登录', async () => {
      // Arrange
      const loginDto = {
        username: 'testuser',
        password: 'password123',
        captcha: '1234',
        captchaId: 'captcha-123',
      };

      const mockUser = createMockUser({
        username: loginDto.username,
        password: TEST_PASSWORD_HASH,
        status: UserStatus.INACTIVE,
      });

      captchaService.verify.mockResolvedValue(true);
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('账号已被禁用或删除');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('应该在登录成功后重置失败次数', async () => {
      // Arrange
      const loginDto = {
        username: 'testuser',
        password: 'password123',
        captcha: '1234',
        captchaId: 'captcha-123',
      };

      const mockUser = createMockUser({
        username: loginDto.username,
        password: TEST_PASSWORD_HASH,
        status: UserStatus.ACTIVE,
        loginAttempts: 3,
      });

      captchaService.verify.mockResolvedValue(true);
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);
      mockQueryRunner.manager.save.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      // Act
      await service.login(loginDto);

      // Assert
      const savedUser = mockQueryRunner.manager.save.mock.calls[0][1];
      expect(savedUser.loginAttempts).toBe(0);
      expect(savedUser.lockedUntil).toBeNull();
    });

    it('应该使用悲观锁防止并发问题', async () => {
      // Arrange
      const loginDto = {
        username: 'testuser',
        password: 'password123',
        captcha: '1234',
        captchaId: 'captcha-123',
      };

      const mockUser = createMockUser({
        username: loginDto.username,
        password: TEST_PASSWORD_HASH,
      });

      captchaService.verify.mockResolvedValue(true);
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      // Act
      await service.login(loginDto);

      // Assert
      const queryBuilder = mockQueryRunner.manager.createQueryBuilder();
      expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('应该在事务中发生错误时回滚', async () => {
      // Arrange
      const loginDto = {
        username: 'testuser',
        password: 'password123',
        captcha: '1234',
        captchaId: 'captcha-123',
      };

      captchaService.verify.mockResolvedValue(true);
      mockQueryBuilder.getOne.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow('Database error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('应该生成包含角色和权限的 JWT payload', async () => {
      // Arrange
      const loginDto = {
        username: 'testuser',
        password: 'password123',
        captcha: '1234',
        captchaId: 'captcha-123',
      };

      const hashedPassword = TEST_PASSWORD_HASH;

      const mockPermission = createMockPermission({
        resource: 'device',
        action: 'read',
      });

      const mockRole = createMockRole({
        name: 'admin',
        permissions: [mockPermission],
      });

      const mockUser = createMockUser({
        username: loginDto.username,
        password: hashedPassword,
        status: UserStatus.ACTIVE,
        loginAttempts: 0,
        lockedUntil: null,
        roles: [mockRole],
      });

      captchaService.verify.mockResolvedValue(true);
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);
      mockQueryRunner.manager.save.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      // Act
      await service.login(loginDto);

      // Assert
      expect(jwtService.sign).toHaveBeenCalled();
      const payload = jwtService.sign.mock.calls[0][0];
      expect(payload).toHaveProperty('sub');
      expect(payload).toHaveProperty('username');
      expect(payload).toHaveProperty('email');
      expect(payload).toHaveProperty('roles');
      expect(payload).toHaveProperty('permissions');
      expect(payload.roles).toContain('admin');
      expect(payload.permissions).toContain('device:read');
    });
  });

  describe('logout', () => {
    it('应该成功登出并将 token 加入黑名单', async () => {
      // Arrange
      const userId = 'user-123';
      const token = 'mock-jwt-token';
      const decoded = {
        exp: Math.floor(Date.now() / 1000) + 3600, // 1小时后过期
      };

      jwtService.decode.mockReturnValue(decoded);
      cacheService.set.mockResolvedValue(undefined);

      // Act
      const result = await service.logout(userId, token);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('登出成功');
      expect(jwtService.decode).toHaveBeenCalledWith(token);
      expect(cacheService.set).toHaveBeenCalled();

      const setCall = cacheService.set.mock.calls[0];
      expect(setCall[0]).toBe(`blacklist:token:${token}`);
      expect(setCall[1]).toBe('1');
      expect(setCall[2]).toHaveProperty('ttl');
      expect(setCall[2].ttl).toBeGreaterThan(0);
    });

    it('应该在没有 token 时也能正常登出', async () => {
      // Arrange
      const userId = 'user-123';

      // Act
      const result = await service.logout(userId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('登出成功');
      expect(jwtService.decode).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('应该在 token 已过期时不加入黑名单', async () => {
      // Arrange
      const userId = 'user-123';
      const token = 'expired-token';
      const decoded = {
        exp: Math.floor(Date.now() / 1000) - 3600, // 1小时前已过期
      };

      jwtService.decode.mockReturnValue(decoded);

      // Act
      const result = await service.logout(userId, token);

      // Assert
      expect(result.success).toBe(true);
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('应该在解析 token 失败时继续登出', async () => {
      // Arrange
      const userId = 'user-123';
      const token = 'invalid-token';

      jwtService.decode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      const result = await service.logout(userId, token);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('登出成功');
    });
  });

  describe('isTokenBlacklisted', () => {
    it('应该正确检查 token 是否在黑名单中', async () => {
      // Arrange
      const token = 'blacklisted-token';
      cacheService.exists.mockResolvedValue(true);

      // Act
      const result = await service.isTokenBlacklisted(token);

      // Assert
      expect(result).toBe(true);
      expect(cacheService.exists).toHaveBeenCalledWith(`blacklist:token:${token}`);
    });

    it('应该在 token 不在黑名单时返回 false', async () => {
      // Arrange
      const token = 'valid-token';
      cacheService.exists.mockResolvedValue(false);

      // Act
      const result = await service.isTokenBlacklisted(token);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getProfile', () => {
    it('应该成功获取用户资料', async () => {
      // Arrange
      const userId = 'user-123';
      const mockRole = createMockRole();
      const mockUser = createMockUser({
        id: userId,
        roles: [mockRole],
      });

      // 重新创建 queryBuilder mock
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getProfile(userId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('username');
      expect(result.data).not.toHaveProperty('password');
      expect(userRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('应该在用户不存在时抛出 UnauthorizedException', async () => {
      // Arrange
      const userId = 'nonexistent';

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act & Assert
      await expect(service.getProfile(userId)).rejects.toThrow(UnauthorizedException);
      await expect(service.getProfile(userId)).rejects.toThrow('用户不存在');
    });

    it('应该使用 QueryBuilder 避免 N+1 查询', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = createMockUser({ id: userId });

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      await service.getProfile(userId);

      // Assert
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('user.roles', 'role');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'role.permissions',
        'permission'
      );
    });
  });

  describe('refreshToken', () => {
    it('应该成功刷新 token', async () => {
      // Arrange
      const userId = 'user-123';
      const mockRole = createMockRole({
        permissions: [createMockPermission()],
      });
      const mockUser = createMockUser({
        id: userId,
        roles: [mockRole],
      });

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      jwtService.sign.mockReturnValue('new-jwt-token');

      // Act
      const result = await service.refreshToken(userId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.token).toBe('new-jwt-token');
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('应该在用户不存在时抛出 UnauthorizedException', async () => {
      // Arrange
      const userId = 'nonexistent';

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act & Assert
      await expect(service.refreshToken(userId)).rejects.toThrow(UnauthorizedException);
    });

    it('应该生成包含最新角色和权限的 token', async () => {
      // Arrange
      const userId = 'user-123';
      const mockPermission = createMockPermission({
        resource: 'device',
        action: 'write',
      });
      const mockRole = createMockRole({
        name: 'editor',
        permissions: [mockPermission],
      });
      const mockUser = createMockUser({
        id: userId,
        roles: [mockRole],
      });

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      jwtService.sign.mockReturnValue('new-token');

      // Act
      await service.refreshToken(userId);

      // Assert
      const payload = jwtService.sign.mock.calls[0][0];
      expect(payload.roles).toContain('editor');
      expect(payload.permissions).toContain('device:write');
    });
  });

  describe('validateUser', () => {
    it('应该成功验证活跃用户', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = createMockUser({
        id: userId,
        status: UserStatus.ACTIVE,
      });

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.validateUser(userId);

      // Assert
      expect(result).toBeTruthy();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('username');
      expect(result).not.toHaveProperty('password');
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['roles'],
      });
    });

    it('应该在用户不存在时返回 null', async () => {
      // Arrange
      const userId = 'nonexistent';
      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.validateUser(userId);

      // Assert
      expect(result).toBeNull();
    });

    it('应该在用户状态非 ACTIVE 时返回 null', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = createMockUser({
        id: userId,
        status: UserStatus.INACTIVE,
      });

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.validateUser(userId);

      // Assert
      expect(result).toBeNull();
    });

    it('应该返回包含角色信息的用户对象', async () => {
      // Arrange
      const userId = 'user-123';
      const mockRole = createMockRole({ name: 'admin' });
      const mockUser = createMockUser({
        id: userId,
        status: UserStatus.ACTIVE,
        roles: [mockRole],
      });

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.validateUser(userId);

      // Assert
      expect(result?.roles).toContain('admin');
    });
  });

  describe('安全性特性', () => {
    // 注意：此测试已过时，因为密码哈希现在在 Saga 中进行
    it.skip('应该对密码进行 bcrypt 哈希', async () => {
      // Arrange
      const password = 'test123456';
      const registerDto = {
        username: 'testuser',
        email: 'test@example.com',
        password,
        fullName: 'Test',
      };

      userRepository.findOne.mockResolvedValue(null);

      let capturedHashedPassword: string;
      userRepository.create.mockImplementation((userData: any) => {
        capturedHashedPassword = userData.password;
        return createMockUser(userData);
      });

      userRepository.save.mockImplementation((user: any) => {
        return Promise.resolve(user);
      });

      // Act
      await service.register(registerDto);

      // Assert
      expect(capturedHashedPassword!).not.toBe(password);
      expect(capturedHashedPassword!).toMatch(/^\$2[aby]\$/);

      // 验证bcrypt.hash被调用
      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    it('应该使用悲观锁防止并发登录攻击', async () => {
      // Arrange
      const loginDto = {
        username: 'testuser',
        password: 'password123',
        captcha: '1234',
        captchaId: 'captcha-123',
      };

      const hashedPassword = TEST_PASSWORD_HASH;
      const mockUser = createMockUser({
        username: loginDto.username,
        password: hashedPassword,
        status: UserStatus.ACTIVE,
        loginAttempts: 0,
        lockedUntil: null,
      });

      captchaService.verify.mockResolvedValue(true);
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);
      mockQueryRunner.manager.save.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('token');

      // Act
      await service.login(loginDto);

      // Assert
      expect(mockQueryRunner.manager.createQueryBuilder).toHaveBeenCalled();
      const queryBuilder = mockQueryRunner.manager.createQueryBuilder();
      expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('应该在开发环境跳过验证码检查', async () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const loginDto = {
        username: 'testuser',
        password: 'password123',
        captcha: 'any',
        captchaId: 'any',
      };

      const hashedPassword = TEST_PASSWORD_HASH;
      const mockUser = createMockUser({
        username: loginDto.username,
        password: hashedPassword,
        status: UserStatus.ACTIVE,
        loginAttempts: 0,
        lockedUntil: null,
      });

      // 重置captcha mock
      captchaService.verify.mockClear();

      mockQueryBuilder.getOne.mockResolvedValue(mockUser);
      mockQueryRunner.manager.save.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('token');

      // Act
      await service.login(loginDto);

      // Assert
      expect(captchaService.verify).not.toHaveBeenCalled();

      // 恢复环境变量
      process.env.NODE_ENV = originalEnv;
    });
  });
});
