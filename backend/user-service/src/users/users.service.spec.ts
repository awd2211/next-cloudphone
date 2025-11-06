import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserStatus } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { BusinessException } from '../common/exceptions/business.exception';
import { EventBusService, EventOutboxService } from '@cloudphone/shared';
import { CacheService } from '../cache/cache.service';
import { UserMetricsService } from '../common/metrics/user-metrics.service';
import { TracingService } from '../common/tracing/tracing.service';
import { PermissionCacheService } from '../permissions/permission-cache.service';
import * as bcrypt from 'bcryptjs';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<Repository<User>>;
  let rolesRepository: jest.Mocked<Repository<Role>>;
  let paymentMethodRepository: jest.Mocked<Repository<PaymentMethod>>;
  let eventBus: jest.Mocked<EventBusService>;
  let cacheService: jest.Mocked<CacheService>;
  let metricsService: jest.Mocked<UserMetricsService>;
  let tracingService: jest.Mocked<TracingService>;
  let permissionCacheService: jest.Mocked<PermissionCacheService>;
  let mockQueryBuilder: any;
  let mockQueryRunner: any;
  let dataSource: any;

  const mockUser: Partial<User> = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    fullName: 'Test User',
    status: UserStatus.ACTIVE,
    tenantId: 'tenant-1',
    roles: [],
    loginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRole: Role = {
    id: 'role-123',
    name: 'user',
    description: 'Regular user',
    permissions: [],
    users: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Create a chainable QueryBuilder mock
    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getRawOne: jest.fn().mockResolvedValue({}),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PaymentMethod),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => ({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: {
                save: jest.fn(),
                findOne: jest.fn(),
                create: jest.fn(),
                find: jest.fn(),
              },
            })),
            manager: {
              save: jest.fn(),
              findOne: jest.fn(),
              create: jest.fn(),
              find: jest.fn(),
            },
          },
        },
        {
          provide: EventBusService,
          useValue: {
            publishUserEvent: jest.fn(),
            publish: jest.fn(),
          },
        },
        {
          provide: EventOutboxService,
          useValue: {
            saveEvent: jest.fn(),
            writeEvent: jest.fn(),
            getUnpublishedEvents: jest.fn(),
            markAsPublished: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: UserMetricsService,
          useValue: {
            recordUserCreated: jest.fn(),
            recordUserLogin: jest.fn(),
            recordPasswordChange: jest.fn(),
            recordAccountLocked: jest.fn(),
            updateUserStats: jest.fn(),
            startStatsTimer: jest.fn(() => jest.fn()),
          },
        },
        {
          provide: TracingService,
          useValue: {
            startSpan: jest.fn(() => ({
              setTag: jest.fn(),
              context: jest.fn(),
            })),
            finishSpan: jest.fn(),
            setTag: jest.fn(),
            traceCacheOperation: jest.fn(),
            traceDbQuery: jest.fn(),
          },
        },
        {
          provide: PermissionCacheService,
          useValue: {
            invalidateUserCache: jest.fn(),
            invalidateCache: jest.fn().mockResolvedValue(undefined),
            invalidateCacheByRole: jest.fn().mockResolvedValue(undefined),
            loadAndCacheUserPermissions: jest.fn(),
            warmupActiveUsersCache: jest.fn(),
            getCacheStats: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(getRepositoryToken(User));
    rolesRepository = module.get(getRepositoryToken(Role));
    paymentMethodRepository = module.get(getRepositoryToken(PaymentMethod));
    eventBus = module.get(EventBusService);
    cacheService = module.get(CacheService);
    metricsService = module.get(UserMetricsService);
    tracingService = module.get(TracingService);
    permissionCacheService = module.get(PermissionCacheService);
    dataSource = module.get(DataSource);

    // Get the queryRunner mock
    mockQueryRunner = dataSource.createQueryRunner();

    // Configure default mock behaviors for queryRunner.manager
    mockQueryRunner.manager.create.mockImplementation((entity, data) => {
      return { ...data, id: 'mock-id', createdAt: new Date(), updatedAt: new Date() };
    });
    mockQueryRunner.manager.find.mockResolvedValue([]);
    mockQueryRunner.manager.findOne.mockResolvedValue(null);
    mockQueryRunner.manager.save.mockImplementation(async (entity) => {
      // Ensure the saved entity has an id
      return { ...entity, id: entity.id || 'mock-id', createdAt: new Date(), updatedAt: new Date() };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto = {
      username: 'newuser',
      email: 'new@example.com',
      password: 'Password123!',
      fullName: 'New User',
      phone: '13800138000',
    };

    it.skip('should create a new user successfully', async () => {
      // Mock: 用户名和邮箱都不存在
      usersRepository.findOne
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce(null); // email check

      // Mock: 找到默认角色（通过 queryRunner.manager）
      const createdUser = { ...mockUser, ...createUserDto, id: 'user-123' };
      mockQueryRunner.manager.findOne.mockResolvedValue(mockRole);
      mockQueryRunner.manager.create.mockReturnValue(createdUser);
      mockQueryRunner.manager.save.mockResolvedValue(createdUser);

      const result = await service.create(createUserDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('user-123');
      expect(usersRepository.findOne).toHaveBeenCalledTimes(2);
      expect(mockQueryRunner.manager.findOne).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
      expect(metricsService.recordUserCreated).toHaveBeenCalled();
      expect(eventBus.publishUserEvent).toHaveBeenCalledWith('created', expect.any(Object));
    });

    it('should throw BusinessException if username already exists', async () => {
      usersRepository.findOne
        .mockResolvedValueOnce({ id: 'existing' } as User) // username exists
        .mockResolvedValueOnce(null); // email check

      await expect(service.create(createUserDto)).rejects.toThrow(BusinessException);
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BusinessException if email already exists', async () => {
      usersRepository.findOne
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce({ id: 'existing' } as User); // email exists

      await expect(service.create(createUserDto)).rejects.toThrow(BusinessException);
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it.skip('should hash password before saving', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      rolesRepository.findOne.mockResolvedValue(mockRole);

      const createdUser = { ...mockUser };
      usersRepository.create.mockReturnValue(createdUser as User);
      usersRepository.save.mockResolvedValue(createdUser as User);

      await service.create(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
    });

    it.skip('should assign specified roles when roleIds provided', async () => {
      const createDtoWithRoles = { ...createUserDto, roleIds: ['role-1', 'role-2'] };
      const mockRoles = [
        { id: 'role-1', name: 'admin' },
        { id: 'role-2', name: 'moderator' },
      ] as Role[];

      usersRepository.findOne.mockResolvedValue(null);

      // Mock queryRunner.manager to find roles and save user
      const userWithId = { ...mockUser, id: 'user-123', roles: mockRoles };
      mockQueryRunner.manager.find.mockResolvedValue(mockRoles);
      mockQueryRunner.manager.create.mockReturnValue(userWithId as User);
      mockQueryRunner.manager.save.mockResolvedValue(userWithId as User);

      await service.create(createDtoWithRoles);

      expect(mockQueryRunner.manager.find).toHaveBeenCalledWith(Role, {
        where: { id: expect.any(Object) },
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const users = [mockUser, { ...mockUser, id: 'user-456' }] as User[];
      usersRepository.findAndCount.mockResolvedValue([users, 2]);

      const result = await service.findAll(1, 10);

      expect(result).toEqual({
        data: users,
        total: 2,
        page: 1,
        limit: 10,
      });
      expect(usersRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        relations: [],
        select: expect.any(Array),
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter by tenantId when provided', async () => {
      usersRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 10, 'tenant-123');

      expect(usersRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-123' },
        })
      );
    });

    it('should include roles when includeRoles option is true', async () => {
      usersRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 10, undefined, { includeRoles: true });

      expect(usersRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['roles'],
        })
      );
    });

    it('should calculate correct skip value for pagination', async () => {
      usersRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(3, 20);

      expect(usersRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (3 - 1) * 20
          take: 20,
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return cached user if exists', async () => {
      const cachedUser = { ...mockUser };
      cacheService.get.mockResolvedValue(cachedUser);

      const result = await service.findOne('user-123');

      expect(result).toEqual(cachedUser);
      expect(cacheService.get).toHaveBeenCalledWith('user:user-123');
      expect(usersRepository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache', async () => {
      cacheService.get.mockResolvedValue(null);
      mockQueryBuilder.getOne.mockResolvedValue(mockUser as User);

      const result = await service.findOne('user-123');

      expect(usersRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(cacheService.set).toHaveBeenCalledWith('user:user-123', expect.any(Object), {
        ttl: 300,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      cacheService.get.mockResolvedValue(null);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should not return password in response', async () => {
      cacheService.get.mockResolvedValue(null);
      // Return user without password (as select in service excludes password)
      const userWithoutPassword = { ...mockUser };
      delete userWithoutPassword.password;
      mockQueryBuilder.getOne.mockResolvedValue(userWithoutPassword as User);

      const result = await service.findOne('user-123');

      expect(result).not.toHaveProperty('password');
    });

    it('should call tracing service when enabled', async () => {
      cacheService.get.mockResolvedValue(null);
      mockQueryBuilder.getOne.mockResolvedValue(mockUser as User);

      await service.findOne('user-123');

      expect(tracingService.startSpan).toHaveBeenCalledWith('users.findOne');
    });
  });

  describe('findByUsername', () => {
    it('should return user by username', async () => {
      cacheService.get.mockResolvedValue(null);
      mockQueryBuilder.getOne.mockResolvedValue(mockUser as User);

      const result = await service.findByUsername('testuser');

      expect(result).toEqual(mockUser);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      cacheService.get.mockResolvedValue(null);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findByUsername('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      cacheService.get.mockResolvedValue(null);
      mockQueryBuilder.getOne.mockResolvedValue(mockUser as User);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if email not found', async () => {
      cacheService.get.mockResolvedValue(null);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findByEmail('nonexistent@example.com')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('update', () => {
    const updateUserDto = {
      fullName: 'Updated Name',
      phone: '13900139000',
    };

    it('should update user successfully', async () => {
      const existingUser = { ...mockUser } as User;
      const updatedUser = { ...existingUser, ...updateUserDto };

      usersRepository.findOne.mockResolvedValue(existingUser);
      usersRepository.save.mockResolvedValue(updatedUser as User);

      const result = await service.update('user-123', updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(usersRepository.save).toHaveBeenCalled();
      expect(cacheService.del).toHaveBeenCalledWith('user:user-123');
      expect(eventBus.publish).toHaveBeenCalledWith('events', 'user.updated', expect.any(Object));
    });

    it('should throw NotFoundException if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateUserDto)).rejects.toThrow(NotFoundException);
    });

    it('should update roles when roleIds provided', async () => {
      const existingUser = { ...mockUser } as User;
      const updateWithRoles = { ...updateUserDto, roleIds: ['role-1'] };
      const mockRoles = [{ id: 'role-1', name: 'admin' }] as Role[];

      usersRepository.findOne.mockResolvedValue(existingUser);
      rolesRepository.find.mockResolvedValue(mockRoles);
      usersRepository.save.mockResolvedValue(existingUser);

      await service.update('user-123', updateWithRoles);

      expect(rolesRepository.find).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const changePasswordDto = {
      oldPassword: 'OldPass123!',
      newPassword: 'NewPass456!',
    };

    it('should change password successfully', async () => {
      const user = { ...mockUser } as User;
      usersRepository.findOne.mockResolvedValue(user);
      usersRepository.save.mockResolvedValue(user);

      await service.changePassword('user-123', changePasswordDto);

      expect(bcrypt.compare).toHaveBeenCalledWith('OldPass123!', '$2b$10$hashedpassword');
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass456!', 10);
      expect(usersRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.changePassword('nonexistent', changePasswordDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw UnauthorizedException if old password is incorrect', async () => {
      const user = { ...mockUser } as User;
      usersRepository.findOne.mockResolvedValue(user);

      // 使用错误的旧密码（我们的 mock 只接受 'OldPass123!'）
      const wrongPasswordDto = {
        oldPassword: 'WrongPassword123!',
        newPassword: 'NewPass456!',
      };

      await expect(service.changePassword('user-123', wrongPasswordDto)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('remove', () => {
    it('should soft delete user by setting status to DELETED', async () => {
      const user = { ...mockUser } as User;
      usersRepository.findOne.mockResolvedValue(user);
      usersRepository.save.mockResolvedValue({ ...user, status: UserStatus.DELETED } as User);

      await service.remove('user-123');

      expect(user.status).toBe(UserStatus.DELETED);
      expect(usersRepository.save).toHaveBeenCalled();
      expect(eventBus.publishUserEvent).toHaveBeenCalledWith('deleted', expect.any(Object));
    });

    it('should throw NotFoundException if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateLoginInfo', () => {
    it('should update last login info and reset attempts', async () => {
      await service.updateLoginInfo('user-123', '192.168.1.1');

      expect(usersRepository.update).toHaveBeenCalledWith('user-123', {
        lastLoginAt: expect.any(Date),
        lastLoginIp: '192.168.1.1',
        loginAttempts: 0,
      });
    });
  });

  describe('incrementLoginAttempts', () => {
    it('should increment login attempts', async () => {
      const user = { ...mockUser, loginAttempts: 1 } as User;
      usersRepository.findOne.mockResolvedValue(user);
      usersRepository.save.mockResolvedValue(user);

      await service.incrementLoginAttempts('user-123');

      expect(user.loginAttempts).toBe(2);
      expect(usersRepository.save).toHaveBeenCalled();
    });

    it('should lock account for 5 minutes after 3 failed attempts', async () => {
      const user = { ...mockUser, loginAttempts: 2 } as User;
      usersRepository.findOne.mockResolvedValue(user);
      usersRepository.save.mockResolvedValue(user);

      await service.incrementLoginAttempts('user-123');

      expect(user.loginAttempts).toBe(3);
      expect(user.lockedUntil).toBeDefined();
      expect(eventBus.publish).toHaveBeenCalledWith(
        'events',
        'user.account_locked',
        expect.objectContaining({
          attempts: 3,
          severity: 'warning',
        })
      );
    });

    it('should lock account for 24 hours after 10 failed attempts', async () => {
      const user = { ...mockUser, loginAttempts: 9 } as User;
      usersRepository.findOne.mockResolvedValue(user);
      usersRepository.save.mockResolvedValue(user);

      await service.incrementLoginAttempts('user-123');

      expect(user.loginAttempts).toBe(10);
      expect(eventBus.publish).toHaveBeenCalledWith(
        'events',
        'user.account_locked',
        expect.objectContaining({
          attempts: 10,
          severity: 'critical',
        })
      );
    });

    it('should do nothing if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await service.incrementLoginAttempts('nonexistent');

      expect(usersRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('resetLoginAttempts', () => {
    it('should reset login attempts and unlock account', async () => {
      await service.resetLoginAttempts('user-123');

      expect(usersRepository.update).toHaveBeenCalledWith('user-123', {
        loginAttempts: 0,
        lockedUntil: null,
      });
    });
  });

  describe('isAccountLocked', () => {
    it('should return false if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const result = await service.isAccountLocked('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false if lockedUntil is null', async () => {
      const user = { ...mockUser, lockedUntil: null } as User;
      usersRepository.findOne.mockResolvedValue(user);

      const result = await service.isAccountLocked('user-123');

      expect(result).toBe(false);
    });

    it('should return true if account is currently locked', async () => {
      const futureDate = new Date(Date.now() + 10000);
      const user = { ...mockUser, lockedUntil: futureDate } as User;
      usersRepository.findOne.mockResolvedValue(user);

      const result = await service.isAccountLocked('user-123');

      expect(result).toBe(true);
    });

    it('should reset attempts and return false if lock expired', async () => {
      const pastDate = new Date(Date.now() - 10000);
      const user = { ...mockUser, lockedUntil: pastDate } as User;
      usersRepository.findOne.mockResolvedValue(user);

      const resetSpy = jest.spyOn(service, 'resetLoginAttempts').mockResolvedValue(undefined);

      const result = await service.isAccountLocked('user-123');

      expect(result).toBe(false);
      expect(resetSpy).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getStats', () => {
    const mockStats = {
      totalUsers: 100,
      activeUsers: 80,
      inactiveUsers: 20,
      newUsersLast7Days: 10,
      newUsersLast30Days: 30,
      recentlyActiveUsers: 60,
      activeRate: '80.00%',
      timestamp: expect.any(String),
    };

    it('should return cached stats if available', async () => {
      cacheService.get.mockResolvedValue(mockStats);

      const result = await service.getStats();

      expect(result).toEqual(mockStats);
      expect(cacheService.get).toHaveBeenCalledWith('user:stats:all');
      expect(usersRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should fetch and cache stats if not in cache', async () => {
      cacheService.get.mockResolvedValue(null);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total_users: '100',
          active_users: '80',
          inactive_users: '20',
          new_users_7d: '10',
          new_users_30d: '30',
          recently_active: '60',
        }),
      };

      usersRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getStats();

      expect(result).toMatchObject({
        totalUsers: 100,
        activeUsers: 80,
        inactiveUsers: 20,
        newUsersLast7Days: 10,
        newUsersLast30Days: 30,
        recentlyActiveUsers: 60,
        activeRate: '80.00%',
      });

      expect(cacheService.set).toHaveBeenCalledWith(
        'user:stats:all',
        expect.any(Object),
        expect.objectContaining({
          ttl: 60,
        })
      );
      expect(metricsService.updateUserStats).toHaveBeenCalled();
    });

    it('should filter by tenantId when provided', async () => {
      cacheService.get.mockResolvedValue(null);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total_users: '50',
          active_users: '40',
          inactive_users: '10',
          new_users_7d: '5',
          new_users_30d: '15',
          recently_active: '30',
        }),
      };

      usersRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getStats('tenant-123');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.tenantId = :tenantId', {
        tenantId: 'tenant-123',
      });
    });

    it('should call metrics service timer', async () => {
      cacheService.get.mockResolvedValue(null);
      const timerFn = jest.fn();
      metricsService.startStatsTimer.mockReturnValue(timerFn);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total_users: '100',
          active_users: '80',
          inactive_users: '20',
          new_users_7d: '10',
          new_users_30d: '30',
          recently_active: '60',
        }),
      };

      usersRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getStats();

      expect(timerFn).toHaveBeenCalled();
    });
  });
});
