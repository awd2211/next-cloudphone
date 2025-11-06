import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { UsersService } from '../users.service';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { PaymentMethod } from '../../entities/payment-method.entity';
import { EventBusService, EventOutboxService } from '@cloudphone/shared';
import { CreateUserDto } from '../dto/create-user.dto';

describe('UsersService - Transaction Tests', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<Repository<User>>;
  let rolesRepository: jest.Mocked<Repository<Role>>;
  let paymentMethodRepository: jest.Mocked<Repository<PaymentMethod>>;
  let dataSource: jest.Mocked<DataSource>;
  let eventOutboxService: jest.Mocked<EventOutboxService>;

  const mockUser: Partial<User> = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    fullName: 'Test User',
    phone: '+1234567890',
    roles: [],
  };

  const mockRole: Partial<Role> = {
    id: 'role-123',
    name: 'user',
    description: '普通用户',
  };

  // Mock QueryRunner
  const createMockQueryRunner = (): jest.Mocked<QueryRunner> => ({
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      getRepository: jest.fn(),
    } as any,
  } as any);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PaymentMethod),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: {
            publishUserEvent: jest.fn(),
          },
        },
        {
          provide: EventOutboxService,
          useValue: {
            writeEvent: jest.fn(),
          },
        },
        {
          provide: 'CacheService',
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: 'UserMetricsService',
          useValue: {
            recordUserCreated: jest.fn(),
          },
        },
        {
          provide: 'TracingService',
          useValue: {},
        },
        {
          provide: 'PermissionCacheService',
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(getRepositoryToken(User));
    rolesRepository = module.get(getRepositoryToken(Role));
    paymentMethodRepository = module.get(getRepositoryToken(PaymentMethod));
    dataSource = module.get(DataSource);
    eventOutboxService = module.get(EventOutboxService);
  });

  describe('create - 事务回滚测试', () => {
    const createUserDto: CreateUserDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
      phone: '+1234567890',
      roleIds: ['role-123'],
    };

    it('应该在角色查询失败时回滚事务', async () => {
      // 前置检查通过
      usersRepository.findOne.mockResolvedValue(null);

      const mockQueryRunner = createMockQueryRunner();
      // 模拟角色查询失败
      mockQueryRunner.manager.find.mockRejectedValue(new Error('Database connection lost'));
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await expect(service.create(createUserDto)).rejects.toThrow('Database connection lost');

      // 验证事务回滚
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      // 验证事务未提交
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('应该在用户保存失败时回滚事务', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.find.mockResolvedValue([mockRole]);
      mockQueryRunner.manager.create.mockReturnValue(mockUser);
      // 模拟用户保存失败（直接抛出错误）
      mockQueryRunner.manager.save.mockRejectedValue(new Error('Constraint violation'));
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await expect(service.create(createUserDto)).rejects.toThrow('Constraint violation');

      // 验证事务回滚
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('应该在 Outbox 事件写入失败时回滚事务', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.find.mockResolvedValue([mockRole]);
      mockQueryRunner.manager.create.mockReturnValue(mockUser);
      mockQueryRunner.manager.save.mockResolvedValue(mockUser);
      // 模拟 Outbox 事件写入失败
      eventOutboxService.writeEvent.mockRejectedValue(new Error('Outbox table locked'));
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await expect(service.create(createUserDto)).rejects.toThrow('Outbox table locked');

      // 验证事务回滚
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      // 验证用户虽然保存了但会被回滚
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
    });

    it('应该在用户名已存在时不开启事务', async () => {
      // 模拟用户名已存在
      usersRepository.findOne.mockResolvedValueOnce({ ...mockUser, username: createUserDto.username } as User);

      const mockQueryRunner = createMockQueryRunner();
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await expect(service.create(createUserDto)).rejects.toThrow();

      // 验证事务未开启（在前置检查阶段就失败了）
      expect(mockQueryRunner.connect).not.toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('应该在邮箱已存在时不开启事务', async () => {
      usersRepository.findOne
        .mockResolvedValueOnce(null) // username 检查通过
        .mockResolvedValueOnce({ ...mockUser, email: createUserDto.email } as User); // email 已存在

      const mockQueryRunner = createMockQueryRunner();
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await expect(service.create(createUserDto)).rejects.toThrow();

      // 验证事务未开启
      expect(mockQueryRunner.connect).not.toHaveBeenCalled();
    });
  });

  describe('create - 事务成功测试', () => {
    const createUserDto: CreateUserDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
      phone: '+1234567890',
      roleIds: ['role-123'],
    };

    it('应该成功创建用户并提交事务', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.find.mockResolvedValue([mockRole]);
      mockQueryRunner.manager.create.mockReturnValue(mockUser);
      mockQueryRunner.manager.save.mockResolvedValue(mockUser);
      eventOutboxService.writeEvent.mockResolvedValue(undefined);
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUser);
      // 验证事务流程
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      // 验证未回滚
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('应该使用 Outbox 模式发布事件', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.find.mockResolvedValue([mockRole]);
      mockQueryRunner.manager.create.mockReturnValue(mockUser);
      mockQueryRunner.manager.save.mockResolvedValue(mockUser);
      eventOutboxService.writeEvent.mockResolvedValue(undefined);
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await service.create(createUserDto);

      // 验证使用 Outbox 模式
      expect(eventOutboxService.writeEvent).toHaveBeenCalledWith(
        mockQueryRunner,
        'user',
        mockUser.id,
        'user.created',
        expect.objectContaining({
          userId: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
        })
      );
    });

    it('应该在事务中查询和分配角色', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.find.mockResolvedValue([mockRole]);
      mockQueryRunner.manager.create.mockReturnValue(mockUser);
      mockQueryRunner.manager.save.mockResolvedValue(mockUser);
      eventOutboxService.writeEvent.mockResolvedValue(undefined);
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await service.create(createUserDto);

      // 验证在事务中查询角色
      expect(mockQueryRunner.manager.find).toHaveBeenCalledWith(
        Role,
        expect.objectContaining({
          where: { id: expect.anything() },
        })
      );
    });

    it('应该在没有指定角色时使用默认角色', async () => {
      const dtoWithoutRoles = { ...createUserDto, roleIds: [] };
      usersRepository.findOne.mockResolvedValue(null);

      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(mockRole);
      mockQueryRunner.manager.create.mockReturnValue(mockUser);
      mockQueryRunner.manager.save.mockResolvedValue(mockUser);
      eventOutboxService.writeEvent.mockResolvedValue(undefined);
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await service.create(dtoWithoutRoles);

      // 验证查找默认 'user' 角色
      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(
        Role,
        expect.objectContaining({
          where: { name: 'user' },
        })
      );
    });
  });

  describe('create - 事务边界测试', () => {
    const createUserDto: CreateUserDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
    };

    it('应该确保操作顺序正确', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const mockQueryRunner = createMockQueryRunner();
      const operationOrder: string[] = [];

      mockQueryRunner.connect.mockImplementation(async () => {
        operationOrder.push('connect');
      });
      mockQueryRunner.startTransaction.mockImplementation(async () => {
        operationOrder.push('startTransaction');
      });
      mockQueryRunner.manager.findOne.mockImplementation(async () => {
        operationOrder.push('findRole');
        return mockRole;
      });
      mockQueryRunner.manager.create.mockImplementation((entity, data) => {
        operationOrder.push('createUser');
        return mockUser;
      });
      mockQueryRunner.manager.save.mockImplementation(async () => {
        operationOrder.push('saveUser');
        return mockUser;
      });
      eventOutboxService.writeEvent.mockImplementation(async () => {
        operationOrder.push('writeOutbox');
      });
      mockQueryRunner.commitTransaction.mockImplementation(async () => {
        operationOrder.push('commit');
      });
      mockQueryRunner.release.mockImplementation(async () => {
        operationOrder.push('release');
      });

      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await service.create(createUserDto);

      // 验证操作顺序
      expect(operationOrder).toEqual([
        'connect',
        'startTransaction',
        'findRole',
        'createUser',
        'saveUser',
        'writeOutbox',
        'commit',
        'release',
      ]);
    });

    it('应该在任何错误时确保资源释放', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.find.mockRejectedValue(new Error('Random error'));
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await expect(service.create(createUserDto)).rejects.toThrow();

      // 即使出错，也要释放资源
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});
