import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BalanceService } from '../balance.service';
import { UserBalance, BalanceStatus } from '../entities/user-balance.entity';
import {
  BalanceTransaction,
  TransactionType,
  TransactionStatus,
} from '../entities/balance-transaction.entity';
import { CacheService } from '../../cache/cache.service';

describe('BalanceService', () => {
  let service: BalanceService;
  let balanceRepository: jest.Mocked<Repository<UserBalance>>;
  let transactionRepository: jest.Mocked<Repository<BalanceTransaction>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockBalance: Partial<UserBalance> = {
    id: 'balance-123',
    userId: 'user-123',
    balance: 1000,
    frozenAmount: 0,
    totalRecharge: 1000,
    totalConsumption: 0,
    status: BalanceStatus.NORMAL,
    lowBalanceThreshold: 100,
    autoRecharge: false,
    getAvailableBalance: function () {
      return Number(this.balance) - Number(this.frozenAmount);
    },
    canConsume: function (amount: number) {
      return this.getAvailableBalance() >= amount;
    },
  };

  const mockTransaction: Partial<BalanceTransaction> = {
    id: 'txn-123',
    userId: 'user-123',
    balanceId: 'balance-123',
    type: TransactionType.RECHARGE,
    amount: 100,
    balanceBefore: 1000,
    balanceAfter: 1100,
    status: TransactionStatus.SUCCESS,
  };

  // Mock QueryRunner
  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalanceService,
        {
          provide: getRepositoryToken(UserBalance),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(BalanceTransaction),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => mockQueryRunner),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue('OK'),
            del: jest.fn().mockResolvedValue(1),
            delPattern: jest.fn().mockResolvedValue(1),
            ttl: jest.fn().mockResolvedValue(3600),
            wrap: jest.fn().mockImplementation(async (key, fn) => {
              // wrap 方法先查缓存，未命中则执行函数并缓存结果
              return await fn();
            }),
          },
        },
      ],
    }).compile();

    service = module.get<BalanceService>(BalanceService);
    balanceRepository = module.get(getRepositoryToken(UserBalance));
    transactionRepository = module.get(getRepositoryToken(BalanceTransaction));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBalance', () => {
    it('should create a new balance account', async () => {
      balanceRepository.findOne.mockResolvedValue(null);
      balanceRepository.create.mockReturnValue(mockBalance as UserBalance);
      balanceRepository.save.mockResolvedValue(mockBalance as UserBalance);
      transactionRepository.create.mockReturnValue(mockTransaction as BalanceTransaction);
      transactionRepository.save.mockResolvedValue(mockTransaction as BalanceTransaction);

      const result = await service.createBalance({
        userId: 'user-123',
        initialBalance: 1000,
      });

      expect(result).toEqual(mockBalance);
      expect(balanceRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(balanceRepository.create).toHaveBeenCalled();
      expect(balanceRepository.save).toHaveBeenCalled();
      expect(transactionRepository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if balance already exists', async () => {
      balanceRepository.findOne.mockResolvedValue(mockBalance as UserBalance);

      await expect(service.createBalance({ userId: 'user-123' })).rejects.toThrow(
        BadRequestException
      );
    });

    it('should create balance with zero initial balance', async () => {
      balanceRepository.findOne.mockResolvedValue(null);
      const zeroBalance = { ...mockBalance, balance: 0, totalRecharge: 0 };
      balanceRepository.create.mockReturnValue(zeroBalance as UserBalance);
      balanceRepository.save.mockResolvedValue(zeroBalance as UserBalance);

      const result = await service.createBalance({ userId: 'user-123' });

      expect(result).toEqual(zeroBalance);
      expect(transactionRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getUserBalance', () => {
    it('should return user balance', async () => {
      balanceRepository.findOne.mockResolvedValue(mockBalance as UserBalance);
      balanceRepository.save.mockResolvedValue(mockBalance as UserBalance);

      const result = await service.getUserBalance('user-123');

      expect(result).toEqual(mockBalance);
      expect(balanceRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });

    it('should throw NotFoundException if balance not found', async () => {
      balanceRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserBalance('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('recharge', () => {
    it('should successfully recharge balance', async () => {
      const balance = {
        ...mockBalance,
        balance: 1000,
        totalRecharge: 1000,
      };
      mockQueryRunner.manager.findOne.mockResolvedValue(balance);
      mockQueryRunner.manager.create.mockReturnValue(mockTransaction);
      mockQueryRunner.manager.save.mockImplementation(async (entity) => entity);

      const result = await service.recharge({
        userId: 'user-123',
        amount: 500,
        description: 'Test recharge',
      });

      expect(Number(result.balance.balance)).toBe(1500);
      expect(Number(result.balance.totalRecharge)).toBe(1500);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw BadRequestException for negative amount', async () => {
      await expect(
        service.recharge({
          userId: 'user-123',
          amount: -100,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user balance not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(
        service.recharge({
          userId: 'nonexistent',
          amount: 100,
        })
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(mockBalance);
      mockQueryRunner.manager.save.mockRejectedValue(new Error('Database error'));

      await expect(
        service.recharge({
          userId: 'user-123',
          amount: 100,
        })
      ).rejects.toThrow('Database error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('consume', () => {
    it('should successfully consume balance', async () => {
      const balance = {
        ...mockBalance,
        balance: 1000,
        totalConsumption: 0,
      };
      mockQueryRunner.manager.findOne.mockResolvedValue(balance);
      mockQueryRunner.manager.create.mockReturnValue(mockTransaction);
      mockQueryRunner.manager.save.mockImplementation(async (entity) => entity);

      const result = await service.consume({
        userId: 'user-123',
        amount: 200,
        deviceId: 'device-123',
        description: 'Device usage',
      });

      expect(Number(result.balance.balance)).toBe(800);
      expect(Number(result.balance.totalConsumption)).toBe(200);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException for zero or negative amount', async () => {
      await expect(
        service.consume({
          userId: 'user-123',
          amount: 0,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if balance is frozen', async () => {
      const frozenBalance = {
        ...mockBalance,
        status: BalanceStatus.FROZEN,
      };
      mockQueryRunner.manager.findOne.mockResolvedValue(frozenBalance);

      await expect(
        service.consume({
          userId: 'user-123',
          amount: 100,
        })
      ).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if insufficient balance', async () => {
      const balance = { ...mockBalance, balance: 50 };
      mockQueryRunner.manager.findOne.mockResolvedValue(balance);

      await expect(
        service.consume({
          userId: 'user-123',
          amount: 100,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('freezeBalance', () => {
    it('should successfully freeze balance', async () => {
      const balance = {
        ...mockBalance,
        frozenAmount: 0,
      };
      mockQueryRunner.manager.findOne.mockResolvedValue(balance);
      mockQueryRunner.manager.create.mockReturnValue(mockTransaction);
      mockQueryRunner.manager.save.mockImplementation(async (entity) => entity);

      const result = await service.freezeBalance({
        userId: 'user-123',
        amount: 300,
        reason: 'Security hold',
      });

      expect(Number(result.balance.frozenAmount)).toBe(300);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if freeze amount exceeds available balance', async () => {
      const balance = { ...mockBalance, balance: 100 };
      mockQueryRunner.manager.findOne.mockResolvedValue(balance);

      await expect(
        service.freezeBalance({
          userId: 'user-123',
          amount: 500,
          reason: 'Test',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for negative freeze amount', async () => {
      await expect(
        service.freezeBalance({
          userId: 'user-123',
          amount: -100,
          reason: 'Test',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('unfreezeBalance', () => {
    it('should successfully unfreeze balance', async () => {
      const balance = {
        ...mockBalance,
        frozenAmount: 300,
      };
      mockQueryRunner.manager.findOne.mockResolvedValue(balance);
      mockQueryRunner.manager.create.mockReturnValue(mockTransaction);
      mockQueryRunner.manager.save.mockImplementation(async (entity) => entity);

      const result = await service.unfreezeBalance('user-123', 300, 'Release');

      expect(Number(result.balance.frozenAmount)).toBe(0);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if unfreezing more than frozen amount', async () => {
      const balance = { ...mockBalance, frozenAmount: 100 };
      mockQueryRunner.manager.findOne.mockResolvedValue(balance);

      await expect(service.unfreezeBalance('user-123', 200, 'Release')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(service.unfreezeBalance('nonexistent', 100, 'Release')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('adjustBalance', () => {
    it('should successfully adjust balance upward', async () => {
      const balance = {
        ...mockBalance,
        balance: 1000,
        totalRecharge: 1000,
      };
      mockQueryRunner.manager.findOne.mockResolvedValue(balance);
      mockQueryRunner.manager.create.mockReturnValue(mockTransaction);
      mockQueryRunner.manager.save.mockImplementation(async (entity) => entity);

      const result = await service.adjustBalance({
        userId: 'user-123',
        amount: 500,
        operatorId: 'admin-123',
        reason: 'Promotion bonus',
      });

      expect(Number(result.balance.balance)).toBe(1500);
      expect(Number(result.balance.totalRecharge)).toBe(1500);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should successfully adjust balance downward', async () => {
      const balance = {
        ...mockBalance,
        balance: 1000,
        totalRecharge: 1000,
      };
      mockQueryRunner.manager.findOne.mockResolvedValue(balance);
      mockQueryRunner.manager.create.mockReturnValue(mockTransaction);
      mockQueryRunner.manager.save.mockImplementation(async (entity) => entity);

      const result = await service.adjustBalance({
        userId: 'user-123',
        amount: -200,
        operatorId: 'admin-123',
        reason: 'Correction',
      });

      expect(Number(result.balance.balance)).toBe(800);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(
        service.adjustBalance({
          userId: 'nonexistent',
          amount: 100,
          operatorId: 'admin',
          reason: 'Test',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTransactions', () => {
    it('should return paginated transactions', async () => {
      const mockTransactions = [mockTransaction, { ...mockTransaction, id: 'txn-456' }];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
        getMany: jest.fn().mockResolvedValue(mockTransactions),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getTransactions('user-123', {
        limit: 10,
        offset: 0,
      });

      expect(result.transactions).toEqual(mockTransactions);
      expect(result.total).toBe(2);
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('transaction.createdAt', 'DESC');
    });

    it('should filter transactions by type', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getMany: jest.fn().mockResolvedValue([mockTransaction]),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getTransactions('user-123', {
        type: TransactionType.RECHARGE,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.type = :type', {
        type: TransactionType.RECHARGE,
      });
    });

    it('should filter transactions by status', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getMany: jest.fn().mockResolvedValue([mockTransaction]),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getTransactions('user-123', {
        status: TransactionStatus.SUCCESS,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.status = :status', {
        status: TransactionStatus.SUCCESS,
      });
    });
  });

  describe('getBalanceStatistics', () => {
    it('should return balance statistics', async () => {
      balanceRepository.findOne.mockResolvedValue(mockBalance as UserBalance);
      balanceRepository.save.mockResolvedValue(mockBalance as UserBalance);

      const mockRecentTransactions = [mockTransaction];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getMany: jest.fn().mockResolvedValue(mockRecentTransactions),
        getRawOne: jest.fn().mockResolvedValue({ total: '500' }),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getBalanceStatistics('user-123');

      expect(result.balance).toEqual(mockBalance);
      expect(result.recentTransactions).toEqual(mockRecentTransactions);
      expect(result.monthlyRecharge).toBe(500);
      expect(result.monthlyConsumption).toBe(500);
      expect(result.weeklyConsumption).toBe(500);
    });

    it('should handle null totals in statistics', async () => {
      balanceRepository.findOne.mockResolvedValue(mockBalance as UserBalance);
      balanceRepository.save.mockResolvedValue(mockBalance as UserBalance);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
      };

      transactionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getBalanceStatistics('user-123');

      expect(result.monthlyRecharge).toBe(0);
      expect(result.monthlyConsumption).toBe(0);
      expect(result.weeklyConsumption).toBe(0);
    });
  });
});
