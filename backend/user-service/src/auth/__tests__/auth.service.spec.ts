import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { User, UserStatus } from '../../entities/user.entity';
import { CaptchaService } from '../services/captcha.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import * as bcrypt from 'bcryptjs';

// Mock bcrypt
jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;
  let captchaService: CaptchaService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockCaptchaService = {
    generate: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: CaptchaService,
          useValue: mockCaptchaService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    captchaService = module.get<CaptchaService>(CaptchaService);

    // Set default environment
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCaptcha', () => {
    it('should call captchaService.generate', async () => {
      // Arrange
      const captchaData = {
        id: 'captcha-123',
        data: 'data:image/svg+xml;base64,PHN2Zz4=',
      };
      mockCaptchaService.generate.mockResolvedValue(captchaData);

      // Act
      const result = await service.getCaptcha();

      // Assert
      expect(result).toEqual(captchaData);
      expect(mockCaptchaService.generate).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
    };

    it('should successfully register a new user', async () => {
      // Arrange
      const hashedPassword = 'hashed_password';
      const savedUser: Partial<User> = {
        id: 'user-123',
        username: registerDto.username,
        email: registerDto.email,
        fullName: registerDto.fullName,
        status: UserStatus.ACTIVE,
      };

      mockUserRepository.findOne.mockResolvedValue(null); // No existing user
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUserRepository.create.mockReturnValue(savedUser);
      mockUserRepository.save.mockResolvedValue(savedUser);

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('注册成功');
      expect(result.data).toEqual({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });

    it('should throw ConflictException when username already exists', async () => {
      // Arrange
      const existingUser: Partial<User> = {
        id: 'existing-user',
        username: 'testuser',
        email: 'other@example.com',
      };

      mockUserRepository.findOne.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        '用户名已存在',
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange
      const existingUser: Partial<User> = {
        id: 'existing-user',
        username: 'otheruser',
        email: 'test@example.com',
      };

      mockUserRepository.findOne.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        '邮箱已存在',
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      username: 'testuser',
      password: 'password123',
      captcha: '1234',
      captchaId: 'captcha-id',
    };

    it('should successfully login with correct credentials', async () => {
      // Arrange
      const user: Partial<User> = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed_password',
        fullName: 'Test User',
        avatar: null,
        status: UserStatus.ACTIVE,
        loginAttempts: 0,
        lockedUntil: null,
        tenantId: 'tenant-123',
        isSuperAdmin: false,
        roles: [],
      };

      mockCaptchaService.verify.mockResolvedValue(true);
      mockUserRepository.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUserRepository.save.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue('jwt-token');

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result.success).toBe(true);
      expect(result.token).toBe('jwt-token');
      expect(result.user.username).toBe('testuser');
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          loginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: expect.any(Date),
        }),
      );
    });

    it('should skip captcha verification in development environment', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const user: Partial<User> = {
        id: 'user-123',
        username: 'testuser',
        password: 'hashed_password',
        status: UserStatus.ACTIVE,
        loginAttempts: 0,
        roles: [],
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUserRepository.save.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue('jwt-token');

      // Act
      await service.login(loginDto);

      // Assert
      expect(mockCaptchaService.verify).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when captcha is invalid', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      mockCaptchaService.verify.mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        '验证码错误或已过期',
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      mockCaptchaService.verify.mockResolvedValue(true);
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        '用户名或密码错误',
      );
    });

    it('should throw UnauthorizedException when user is not active', async () => {
      // Arrange
      const user: Partial<User> = {
        id: 'user-123',
        username: 'testuser',
        status: UserStatus.DISABLED,
      };

      mockCaptchaService.verify.mockResolvedValue(true);
      mockUserRepository.findOne.mockResolvedValue(user);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        '账号已被禁用或删除',
      );
    });

    it('should throw UnauthorizedException when account is locked', async () => {
      // Arrange
      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      const user: Partial<User> = {
        id: 'user-123',
        username: 'testuser',
        status: UserStatus.ACTIVE,
        lockedUntil,
      };

      mockCaptchaService.verify.mockResolvedValue(true);
      mockUserRepository.findOne.mockResolvedValue(user);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        /账号已被锁定，请.*分钟后再试/,
      );
    });

    it('should increment login attempts when password is wrong', async () => {
      // Arrange
      const user: Partial<User> = {
        id: 'user-123',
        username: 'testuser',
        password: 'hashed_password',
        status: UserStatus.ACTIVE,
        loginAttempts: 2,
        roles: [],
      };

      mockCaptchaService.verify.mockResolvedValue(true);
      mockUserRepository.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockUserRepository.save.mockResolvedValue(user);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          loginAttempts: 3,
        }),
      );
    });

    it('should lock account after 5 failed attempts', async () => {
      // Arrange
      const user: Partial<User> = {
        id: 'user-123',
        username: 'testuser',
        password: 'hashed_password',
        status: UserStatus.ACTIVE,
        loginAttempts: 4, // This will be the 5th attempt
        roles: [],
      };

      mockCaptchaService.verify.mockResolvedValue(true);
      mockUserRepository.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockUserRepository.save.mockResolvedValue(user);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        '登录失败次数过多，账号已被锁定30分钟',
      );
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          loginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      );
    });

    it('should generate JWT with correct payload', async () => {
      // Arrange
      const role = { name: 'user', permissions: [{ resource: 'device', action: 'read' }] };
      const user: Partial<User> = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed_password',
        status: UserStatus.ACTIVE,
        loginAttempts: 0,
        tenantId: 'tenant-123',
        roles: [role],
      };

      mockCaptchaService.verify.mockResolvedValue(true);
      mockUserRepository.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUserRepository.save.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue('jwt-token');

      // Act
      await service.login(loginDto);

      // Assert
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          tenantId: 'tenant-123',
          roles: ['user'],
          permissions: ['device:read'],
        }),
      );
    });
  });

  describe('logout', () => {
    it('should return success message', async () => {
      // Act
      const result = await service.logout('user-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('登出成功');
    });
  });

  describe('getProfile', () => {
    it('should return user profile without password', async () => {
      // Arrange
      const user: Partial<User> = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed_password',
        fullName: 'Test User',
        roles: [],
      };

      mockUserRepository.findOne.mockResolvedValue(user);

      // Act
      const result = await service.getProfile('user-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).not.toHaveProperty('password');
      expect(result.data.username).toBe('testuser');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getProfile('non-existent')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.getProfile('non-existent')).rejects.toThrow(
        '用户不存在',
      );
    });
  });

  describe('refreshToken', () => {
    it('should generate new token for valid user', async () => {
      // Arrange
      const user: Partial<User> = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        roles: [],
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue('new-jwt-token');

      // Act
      const result = await service.refreshToken('user-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.token).toBe('new-jwt-token');
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.refreshToken('non-existent')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken('non-existent')).rejects.toThrow(
        '用户不存在',
      );
    });
  });

  describe('validateUser', () => {
    it('should return user data when user is active', async () => {
      // Arrange
      const user: Partial<User> = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        status: UserStatus.ACTIVE,
        tenantId: 'tenant-123',
        isSuperAdmin: false,
        roles: [{ name: 'user' }],
      };

      mockUserRepository.findOne.mockResolvedValue(user);

      // Act
      const result = await service.validateUser('user-123');

      // Assert
      expect(result).toEqual({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['user'],
        tenantId: 'tenant-123',
        isSuperAdmin: false,
      });
    });

    it('should return null when user not found', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.validateUser('non-existent');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when user is not active', async () => {
      // Arrange
      const user: Partial<User> = {
        id: 'user-123',
        username: 'testuser',
        status: UserStatus.DISABLED,
      };

      mockUserRepository.findOne.mockResolvedValue(user);

      // Act
      const result = await service.validateUser('user-123');

      // Assert
      expect(result).toBeNull();
    });
  });
});
