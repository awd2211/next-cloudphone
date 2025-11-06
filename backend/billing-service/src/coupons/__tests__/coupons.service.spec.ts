import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { CouponsService } from '../coupons.service';
import { Coupon, CouponStatus, CouponType } from '../entities/coupon.entity';

describe('CouponsService - Transaction Tests', () => {
  let service: CouponsService;
  let couponRepository: jest.Mocked<Repository<Coupon>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockCoupon: Partial<Coupon> = {
    id: 'coupon-123',
    code: 'TEST2025',
    name: '新年优惠券',
    type: CouponType.PERCENTAGE,
    value: 20, // 8折
    minAmount: 100,
    status: CouponStatus.AVAILABLE,
    userId: 'user-123',
    startTime: new Date('2025-01-01'),
    endTime: new Date('2025-12-31'),
    isExpired: function () {
      return new Date() > this.endTime;
    },
    isAvailable: function () {
      return this.status === CouponStatus.AVAILABLE && !this.isExpired();
    },
    use: function (orderId: string) {
      this.status = CouponStatus.USED;
      this.usedAt = new Date();
      this.orderId = orderId;
    },
    markAsExpired: function () {
      this.status = CouponStatus.EXPIRED;
    },
  };

  // Mock QueryRunner
  const createMockQueryRunner = (): jest.Mocked<QueryRunner> => ({
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any,
  } as any);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        {
          provide: getRepositoryToken(Coupon),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
    couponRepository = module.get(getRepositoryToken(Coupon));
    dataSource = module.get(DataSource);
  });

  describe('useCoupon - 并发使用测试', () => {
    it('应该防止同一优惠券被并发使用多次', async () => {
      // 准备：模拟一个可用的优惠券
      const availableCoupon = { ...mockCoupon };
      const mockQueryRunner1 = createMockQueryRunner();
      const mockQueryRunner2 = createMockQueryRunner();

      // 第一个请求获取锁，成功使用优惠券
      mockQueryRunner1.manager.findOne.mockResolvedValue(availableCoupon);
      mockQueryRunner1.manager.save.mockResolvedValue({ ...availableCoupon, status: CouponStatus.USED });

      // 第二个请求由于悲观锁，会等待第一个请求完成
      // 当它获取到优惠券时，状态已经是 USED
      const usedCoupon = { ...availableCoupon, status: CouponStatus.USED };
      mockQueryRunner2.manager.findOne.mockResolvedValue(usedCoupon);

      // Mock DataSource 返回不同的 QueryRunner
      let callCount = 0;
      (dataSource.createQueryRunner as jest.Mock).mockImplementation(() => {
        callCount++;
        return callCount === 1 ? mockQueryRunner1 : mockQueryRunner2;
      });

      // 执行：并发调用 useCoupon
      const orderId1 = 'order-123';
      const orderId2 = 'order-456';

      const result1 = service.useCoupon('coupon-123', 'user-123', orderId1);

      // 等待第一个请求获取锁
      await new Promise(resolve => setTimeout(resolve, 10));

      const result2 = service.useCoupon('coupon-123', 'user-123', orderId2);

      // 验证：第一个请求成功
      const response1 = await result1;
      expect(response1.success).toBe(true);
      expect(mockQueryRunner1.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner1.release).toHaveBeenCalled();

      // 验证：第二个请求失败（优惠券已被使用）
      await expect(result2).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner2.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner2.release).toHaveBeenCalled();
    });

    it('应该在优惠券不存在时抛出 NotFoundException', async () => {
      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await expect(
        service.useCoupon('non-existent', 'user-123', 'order-123')
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('应该在优惠券不可用时抛出 BadRequestException', async () => {
      const expiredCoupon = {
        ...mockCoupon,
        status: CouponStatus.EXPIRED,
        isAvailable: () => false,
      };

      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(expiredCoupon);
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await expect(
        service.useCoupon('coupon-123', 'user-123', 'order-123')
      ).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('应该在数据库错误时回滚事务', async () => {
      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(mockCoupon);
      mockQueryRunner.manager.save.mockRejectedValue(new Error('Database error'));
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await expect(
        service.useCoupon('coupon-123', 'user-123', 'order-123')
      ).rejects.toThrow('Database error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('应该使用悲观写锁查询优惠券', async () => {
      // 创建新的 coupon 实例，避免状态共享
      const freshCoupon: Partial<Coupon> = {
        ...mockCoupon,
        status: CouponStatus.AVAILABLE,
        isAvailable: () => true,
      };

      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(freshCoupon);
      mockQueryRunner.manager.save.mockResolvedValue({ ...freshCoupon, status: CouponStatus.USED });
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await service.useCoupon('coupon-123', 'user-123', 'order-123');

      // 验证使用了悲观锁
      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(
        Coupon,
        expect.objectContaining({
          where: { id: 'coupon-123', userId: 'user-123' },
          lock: { mode: 'pessimistic_write' },
        })
      );
    });

    it('应该正确更新优惠券状态并提交事务', async () => {
      // 创建新的 coupon 实例，避免状态共享
      const freshCoupon: Partial<Coupon> = {
        ...mockCoupon,
        status: CouponStatus.AVAILABLE,
        isAvailable: () => true,
      };

      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne.mockResolvedValue(freshCoupon);
      mockQueryRunner.manager.save.mockResolvedValue({ ...freshCoupon, status: CouponStatus.USED });
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      const result = await service.useCoupon('coupon-123', 'user-123', 'order-123');

      expect(result.success).toBe(true);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('useCoupon - 事务边界测试', () => {
    it('应该在整个操作中保持事务一致性', async () => {
      // 创建新的 coupon 实例
      const freshCoupon: Partial<Coupon> = {
        ...mockCoupon,
        status: CouponStatus.AVAILABLE,
        isAvailable: () => true,
      };

      const mockQueryRunner = createMockQueryRunner();
      const operationOrder: string[] = [];

      mockQueryRunner.connect.mockImplementation(async () => {
        operationOrder.push('connect');
      });
      mockQueryRunner.startTransaction.mockImplementation(async () => {
        operationOrder.push('startTransaction');
      });
      mockQueryRunner.manager.findOne.mockImplementation(async () => {
        operationOrder.push('findOne');
        return freshCoupon;
      });
      mockQueryRunner.manager.save.mockImplementation(async (entity) => {
        operationOrder.push('save');
        return entity;
      });
      mockQueryRunner.commitTransaction.mockImplementation(async () => {
        operationOrder.push('commitTransaction');
      });
      mockQueryRunner.release.mockImplementation(async () => {
        operationOrder.push('release');
      });

      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await service.useCoupon('coupon-123', 'user-123', 'order-123');

      // 验证操作顺序
      expect(operationOrder).toEqual([
        'connect',
        'startTransaction',
        'findOne',
        'save',
        'commitTransaction',
        'release',
      ]);
    });

    it('应该在错误时确保资源释放', async () => {
      const mockQueryRunner = createMockQueryRunner();
      mockQueryRunner.manager.findOne.mockRejectedValue(new Error('Connection lost'));
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await expect(
        service.useCoupon('coupon-123', 'user-123', 'order-123')
      ).rejects.toThrow();

      // 即使出错，也要释放资源
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});
