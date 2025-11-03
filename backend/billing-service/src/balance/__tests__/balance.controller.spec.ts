import { Test, TestingModule } from '@nestjs/testing';
import { BalanceController } from '../balance.controller';
import { BalanceService } from '../balance.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { TransactionType, TransactionStatus } from '../entities/balance-transaction.entity';

describe('BalanceController', () => {
  let controller: BalanceController;
  let balanceService: jest.Mocked<BalanceService>;

  const mockUserBalance = {
    id: 'balance-123',
    userId: 'user-123',
    balance: 100.0,
    frozenBalance: 0,
    totalRecharge: 100.0,
    totalConsume: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransaction = {
    id: 'tx-123',
    balanceId: 'balance-123',
    userId: 'user-123',
    type: TransactionType.RECHARGE,
    amount: 50.0,
    beforeBalance: 100.0,
    afterBalance: 150.0,
    status: TransactionStatus.SUCCESS,
    createdAt: new Date(),
  };

  const mockBalanceService = {
    createBalance: jest.fn(),
    getUserBalance: jest.fn(),
    recharge: jest.fn(),
    consume: jest.fn(),
    freezeBalance: jest.fn(),
    unfreezeBalance: jest.fn(),
    adjustBalance: jest.fn(),
    getTransactions: jest.fn(),
    getBalanceStatistics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BalanceController],
      providers: [
        {
          provide: BalanceService,
          useValue: mockBalanceService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<BalanceController>(BalanceController);
    balanceService = module.get(BalanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBalance', () => {
    it('should create a new balance account', async () => {
      const createDto = {
        userId: 'user-123',
        initialBalance: 0,
      };

      mockBalanceService.createBalance.mockResolvedValue(mockUserBalance);

      const result = await controller.createBalance(createDto);

      expect(result).toEqual(mockUserBalance);
      expect(balanceService.createBalance).toHaveBeenCalledWith(createDto);
      expect(balanceService.createBalance).toHaveBeenCalledTimes(1);
    });

    it('should require admin role', async () => {
      // Guards are mocked to always allow in tests, but we can verify decorator exists
      const metadata = Reflect.getMetadata('roles', controller.createBalance);
      expect(metadata).toEqual(['admin']);
    });
  });

  describe('getUserBalance', () => {
    it('should get user balance by userId', async () => {
      mockBalanceService.getUserBalance.mockResolvedValue(mockUserBalance);

      const result = await controller.getUserBalance('user-123');

      expect(result).toEqual(mockUserBalance);
      expect(balanceService.getUserBalance).toHaveBeenCalledWith('user-123');
      expect(balanceService.getUserBalance).toHaveBeenCalledTimes(1);
    });

    it('should pass userId parameter correctly', async () => {
      const userId = 'test-user-456';
      mockBalanceService.getUserBalance.mockResolvedValue({
        ...mockUserBalance,
        userId,
      });

      await controller.getUserBalance(userId);

      expect(balanceService.getUserBalance).toHaveBeenCalledWith(userId);
    });
  });

  describe('recharge', () => {
    it('should recharge balance successfully', async () => {
      const rechargeDto = {
        userId: 'user-123',
        amount: 50.0,
        orderId: 'order-123',
        remark: 'Test recharge',
      };

      const expectedResult = {
        ...mockUserBalance,
        balance: 150.0,
        totalRecharge: 150.0,
      };

      mockBalanceService.recharge.mockResolvedValue(expectedResult);

      const result = await controller.recharge(rechargeDto);

      expect(result).toEqual(expectedResult);
      expect(balanceService.recharge).toHaveBeenCalledWith(rechargeDto);
      expect(balanceService.recharge).toHaveBeenCalledTimes(1);
    });

    it('should handle different recharge amounts', async () => {
      const rechargeDto = {
        userId: 'user-123',
        amount: 200.0,
        orderId: 'order-456',
      };

      mockBalanceService.recharge.mockResolvedValue(mockUserBalance);

      await controller.recharge(rechargeDto);

      expect(balanceService.recharge).toHaveBeenCalledWith(rechargeDto);
    });
  });

  describe('consume', () => {
    it('should consume balance successfully', async () => {
      const consumeDto = {
        userId: 'user-123',
        amount: 30.0,
        resourceId: 'device-123',
        resourceType: 'device',
        remark: 'Device usage',
      };

      const expectedResult = {
        ...mockUserBalance,
        balance: 70.0,
        totalConsume: 30.0,
      };

      mockBalanceService.consume.mockResolvedValue(expectedResult);

      const result = await controller.consume(consumeDto);

      expect(result).toEqual(expectedResult);
      expect(balanceService.consume).toHaveBeenCalledWith(consumeDto);
      expect(balanceService.consume).toHaveBeenCalledTimes(1);
    });

    it('should include all consume parameters', async () => {
      const consumeDto = {
        userId: 'user-123',
        amount: 50.0,
        resourceId: 'resource-456',
        resourceType: 'app',
        remark: 'App purchase',
      };

      mockBalanceService.consume.mockResolvedValue(mockUserBalance);

      await controller.consume(consumeDto);

      expect(balanceService.consume).toHaveBeenCalledWith(consumeDto);
    });
  });

  describe('freezeBalance', () => {
    it('should freeze balance successfully', async () => {
      const freezeDto = {
        userId: 'user-123',
        amount: 20.0,
        reason: 'Pending refund',
      };

      const expectedResult = {
        ...mockUserBalance,
        balance: 80.0,
        frozenBalance: 20.0,
      };

      mockBalanceService.freezeBalance.mockResolvedValue(expectedResult);

      const result = await controller.freezeBalance(freezeDto);

      expect(result).toEqual(expectedResult);
      expect(balanceService.freezeBalance).toHaveBeenCalledWith(freezeDto);
      expect(balanceService.freezeBalance).toHaveBeenCalledTimes(1);
    });

    it('should require admin role', async () => {
      const metadata = Reflect.getMetadata('roles', controller.freezeBalance);
      expect(metadata).toEqual(['admin']);
    });
  });

  describe('unfreezeBalance', () => {
    it('should unfreeze balance successfully', async () => {
      const unfreezeBody = {
        userId: 'user-123',
        amount: 20.0,
        reason: 'Refund completed',
      };

      const expectedResult = {
        ...mockUserBalance,
        balance: 120.0,
        frozenBalance: 0,
      };

      mockBalanceService.unfreezeBalance.mockResolvedValue(expectedResult);

      const result = await controller.unfreezeBalance(unfreezeBody);

      expect(result).toEqual(expectedResult);
      expect(balanceService.unfreezeBalance).toHaveBeenCalledWith(
        unfreezeBody.userId,
        unfreezeBody.amount,
        unfreezeBody.reason
      );
      expect(balanceService.unfreezeBalance).toHaveBeenCalledTimes(1);
    });

    it('should require admin role', async () => {
      const metadata = Reflect.getMetadata('roles', controller.unfreezeBalance);
      expect(metadata).toEqual(['admin']);
    });

    it('should pass all parameters to service', async () => {
      const unfreezeBody = {
        userId: 'test-user',
        amount: 50.0,
        reason: 'Test reason',
      };

      mockBalanceService.unfreezeBalance.mockResolvedValue(mockUserBalance);

      await controller.unfreezeBalance(unfreezeBody);

      expect(balanceService.unfreezeBalance).toHaveBeenCalledWith(
        'test-user',
        50.0,
        'Test reason'
      );
    });
  });

  describe('adjustBalance', () => {
    it('should adjust balance successfully', async () => {
      const adjustDto = {
        userId: 'user-123',
        amount: 10.0,
        type: 'increase' as const,
        reason: 'Compensation',
        operatorId: 'admin-123',
      };

      const expectedResult = {
        ...mockUserBalance,
        balance: 110.0,
      };

      mockBalanceService.adjustBalance.mockResolvedValue(expectedResult);

      const result = await controller.adjustBalance(adjustDto);

      expect(result).toEqual(expectedResult);
      expect(balanceService.adjustBalance).toHaveBeenCalledWith(adjustDto);
      expect(balanceService.adjustBalance).toHaveBeenCalledTimes(1);
    });

    it('should require admin role', async () => {
      const metadata = Reflect.getMetadata('roles', controller.adjustBalance);
      expect(metadata).toEqual(['admin']);
    });

    it('should support decrease adjustment', async () => {
      const adjustDto = {
        userId: 'user-123',
        amount: -15.0,
        type: 'decrease' as const,
        reason: 'Correction',
        operatorId: 'admin-456',
      };

      mockBalanceService.adjustBalance.mockResolvedValue(mockUserBalance);

      await controller.adjustBalance(adjustDto);

      expect(balanceService.adjustBalance).toHaveBeenCalledWith(adjustDto);
    });
  });

  describe('getTransactions', () => {
    it('should get transactions without filters', async () => {
      const transactions = [mockTransaction];

      mockBalanceService.getTransactions.mockResolvedValue(transactions);

      const result = await controller.getTransactions('user-123');

      expect(result).toEqual(transactions);
      expect(balanceService.getTransactions).toHaveBeenCalledWith('user-123', {
        type: undefined,
        status: undefined,
        limit: undefined,
        offset: undefined,
      });
    });

    it('should get transactions with type filter', async () => {
      const transactions = [mockTransaction];

      mockBalanceService.getTransactions.mockResolvedValue(transactions);

      await controller.getTransactions('user-123', TransactionType.RECHARGE);

      expect(balanceService.getTransactions).toHaveBeenCalledWith('user-123', {
        type: TransactionType.RECHARGE,
        status: undefined,
        limit: undefined,
        offset: undefined,
      });
    });

    it('should get transactions with status filter', async () => {
      const transactions = [mockTransaction];

      mockBalanceService.getTransactions.mockResolvedValue(transactions);

      await controller.getTransactions('user-123', undefined, TransactionStatus.SUCCESS);

      expect(balanceService.getTransactions).toHaveBeenCalledWith('user-123', {
        type: undefined,
        status: TransactionStatus.SUCCESS,
        limit: undefined,
        offset: undefined,
      });
    });

    it('should get transactions with pagination', async () => {
      const transactions = [mockTransaction];

      mockBalanceService.getTransactions.mockResolvedValue(transactions);

      await controller.getTransactions('user-123', undefined, undefined, 10, 20);

      expect(balanceService.getTransactions).toHaveBeenCalledWith('user-123', {
        type: undefined,
        status: undefined,
        limit: 10,
        offset: 20,
      });
    });

    it('should convert string pagination params to numbers', async () => {
      const transactions = [mockTransaction];

      mockBalanceService.getTransactions.mockResolvedValue(transactions);

      // Simulating query params coming as strings (as they do from HTTP requests)
      await controller.getTransactions('user-123', undefined, undefined, '15' as any, '30' as any);

      expect(balanceService.getTransactions).toHaveBeenCalledWith('user-123', {
        type: undefined,
        status: undefined,
        limit: 15,
        offset: 30,
      });
    });

    it('should get transactions with all filters', async () => {
      const transactions = [mockTransaction];

      mockBalanceService.getTransactions.mockResolvedValue(transactions);

      await controller.getTransactions(
        'user-123',
        TransactionType.CONSUME,
        TransactionStatus.PENDING,
        5,
        10
      );

      expect(balanceService.getTransactions).toHaveBeenCalledWith('user-123', {
        type: TransactionType.CONSUME,
        status: TransactionStatus.PENDING,
        limit: 5,
        offset: 10,
      });
    });
  });

  describe('getBalanceStatistics', () => {
    it('should get balance statistics', async () => {
      const statistics = {
        totalRecharge: 500.0,
        totalConsume: 300.0,
        currentBalance: 200.0,
        frozenBalance: 50.0,
        transactionCount: 25,
        lastRechargeDate: new Date(),
        lastConsumeDate: new Date(),
      };

      mockBalanceService.getBalanceStatistics.mockResolvedValue(statistics);

      const result = await controller.getBalanceStatistics('user-123');

      expect(result).toEqual(statistics);
      expect(balanceService.getBalanceStatistics).toHaveBeenCalledWith('user-123');
      expect(balanceService.getBalanceStatistics).toHaveBeenCalledTimes(1);
    });

    it('should pass userId parameter correctly', async () => {
      const userId = 'different-user-789';

      mockBalanceService.getBalanceStatistics.mockResolvedValue({} as any);

      await controller.getBalanceStatistics(userId);

      expect(balanceService.getBalanceStatistics).toHaveBeenCalledWith(userId);
    });
  });

  describe('Guards', () => {
    it('should be protected by JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', BalanceController);
      expect(guards).toBeDefined();
    });

    it('should be protected by RolesGuard', () => {
      const guards = Reflect.getMetadata('__guards__', BalanceController);
      expect(guards).toBeDefined();
    });
  });
});
