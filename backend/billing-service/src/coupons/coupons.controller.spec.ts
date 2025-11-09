import { Test, TestingModule } from '@nestjs/testing';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';

describe('CouponsController', () => {
  let controller: CouponsController;
  let couponsService: any;

  const mockCouponsService = {
    getMyCoupons: jest.fn(),
    findOne: jest.fn(),
    useCoupon: jest.fn(),
    getUserCouponStats: jest.fn(),
  };

  const mockRequest = {
    user: {
      id: 'user-123',
      sub: 'user-123',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CouponsController],
      providers: [
        {
          provide: CouponsService,
          useValue: mockCouponsService,
        },
      ],
    }).compile();

    controller = module.get<CouponsController>(CouponsController);
    couponsService = module.get(CouponsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyCoupons', () => {
    it('should return user coupons without filters', async () => {
      const mockCoupons = [
        {
          id: 'coupon-1',
          code: 'SAVE10',
          discountType: 'percentage',
          discountValue: 10,
          status: 'available',
        },
        {
          id: 'coupon-2',
          code: 'SAVE20',
          discountType: 'percentage',
          discountValue: 20,
          status: 'available',
        },
      ];

      couponsService.getMyCoupons.mockResolvedValue(mockCoupons);

      const result = await controller.getMyCoupons(mockRequest, {});

      expect(result).toEqual(mockCoupons);
      expect(couponsService.getMyCoupons).toHaveBeenCalledWith('user-123', {});
    });

    it('should return coupons filtered by status', async () => {
      const query: any = { status: 'available' };
      const mockCoupons = [
        {
          id: 'coupon-1',
          code: 'SAVE10',
          discountType: 'percentage',
          discountValue: 10,
          status: 'available',
        },
      ];

      couponsService.getMyCoupons.mockResolvedValue(mockCoupons);

      const result = await controller.getMyCoupons(mockRequest, query);

      expect(result).toEqual(mockCoupons);
      expect(couponsService.getMyCoupons).toHaveBeenCalledWith('user-123', query);
    });

    it('should return coupons filtered by type', async () => {
      const query: any = { type: 'discount' };
      const mockCoupons = [
        {
          id: 'coupon-1',
          code: 'DISCOUNT50',
          discountType: 'fixed',
          discountValue: 50,
          type: 'discount',
        },
      ];

      couponsService.getMyCoupons.mockResolvedValue(mockCoupons);

      const result = await controller.getMyCoupons(mockRequest, query);

      expect(result).toEqual(mockCoupons);
      expect(couponsService.getMyCoupons).toHaveBeenCalledWith('user-123', query);
    });

    it('should return empty array when user has no coupons', async () => {
      couponsService.getMyCoupons.mockResolvedValue([]);

      const result = await controller.getMyCoupons(mockRequest, {});

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle multiple query parameters', async () => {
      const query: any = {
        status: 'available',
        type: 'percentage',
        minValue: 10,
      };

      const mockCoupons = [
        {
          id: 'coupon-1',
          code: 'SAVE20',
          discountType: 'percentage',
          discountValue: 20,
          status: 'available',
          type: 'percentage',
        },
      ];

      couponsService.getMyCoupons.mockResolvedValue(mockCoupons);

      const result = await controller.getMyCoupons(mockRequest, query);

      expect(result).toEqual(mockCoupons);
      expect(couponsService.getMyCoupons).toHaveBeenCalledWith('user-123', query);
    });

    it('should handle request with sub field instead of id', async () => {
      const request = {
        user: {
          sub: 'user-456',
        },
      };

      const mockCoupons = [
        {
          id: 'coupon-3',
          code: 'NEWSAVE',
          discountType: 'fixed',
          discountValue: 30,
        },
      ];

      couponsService.getMyCoupons.mockResolvedValue(mockCoupons);

      const result = await controller.getMyCoupons(request, {});

      expect(result).toEqual(mockCoupons);
      expect(couponsService.getMyCoupons).toHaveBeenCalledWith('user-456', {});
    });
  });

  describe('getCouponDetail', () => {
    it('should return coupon detail', async () => {
      const couponId = 'coupon-123';
      const mockCoupon = {
        id: 'coupon-123',
        code: 'SAVE50',
        discountType: 'fixed',
        discountValue: 50,
        status: 'available',
        expiresAt: new Date('2025-12-31'),
        conditions: {
          minOrderAmount: 100,
          maxDiscountAmount: 50,
        },
      };

      couponsService.findOne.mockResolvedValue(mockCoupon);

      const result = await controller.getCouponDetail(couponId, mockRequest);

      expect(result).toEqual(mockCoupon);
      expect(result.id).toBe('coupon-123');
      expect(couponsService.findOne).toHaveBeenCalledWith(couponId, 'user-123');
    });

    it('should return percentage coupon detail', async () => {
      const couponId = 'coupon-456';
      const mockCoupon = {
        id: 'coupon-456',
        code: 'PERCENT20',
        discountType: 'percentage',
        discountValue: 20,
        status: 'available',
        expiresAt: new Date('2025-06-30'),
      };

      couponsService.findOne.mockResolvedValue(mockCoupon);

      const result = await controller.getCouponDetail(couponId, mockRequest);

      expect(result).toEqual(mockCoupon);
      expect(result.discountType).toBe('percentage');
      expect(result.discountValue).toBe(20);
    });

    it('should return coupon with full details', async () => {
      const couponId = 'coupon-789';
      const mockCoupon = {
        id: 'coupon-789',
        code: 'PREMIUM100',
        discountType: 'fixed',
        discountValue: 100,
        status: 'available',
        expiresAt: new Date('2025-12-31'),
        conditions: {
          minOrderAmount: 500,
          maxDiscountAmount: 100,
          applicableProducts: ['product-1', 'product-2'],
        },
        usageLimit: 1,
        usageCount: 0,
        createdAt: new Date('2025-01-01'),
      };

      couponsService.findOne.mockResolvedValue(mockCoupon);

      const result = await controller.getCouponDetail(couponId, mockRequest);

      expect(result).toEqual(mockCoupon);
      expect(result.conditions.applicableProducts).toHaveLength(2);
      expect(result.usageCount).toBe(0);
    });

    it('should handle coupon for different user', async () => {
      const request = {
        user: {
          id: 'user-789',
        },
      };

      const couponId = 'coupon-abc';
      const mockCoupon = {
        id: 'coupon-abc',
        code: 'USERSPECIAL',
        discountType: 'percentage',
        discountValue: 15,
      };

      couponsService.findOne.mockResolvedValue(mockCoupon);

      const result = await controller.getCouponDetail(couponId, request);

      expect(result).toEqual(mockCoupon);
      expect(couponsService.findOne).toHaveBeenCalledWith(couponId, 'user-789');
    });
  });

  describe('useCoupon', () => {
    it('should successfully use coupon for an order', async () => {
      const couponId = 'coupon-123';
      const dto: any = {
        orderId: 'order-456',
      };

      const mockResult = {
        success: true,
        couponId: 'coupon-123',
        orderId: 'order-456',
        discountAmount: 50,
        message: '优惠券使用成功',
      };

      couponsService.useCoupon.mockResolvedValue(mockResult);

      const result = await controller.useCoupon(couponId, mockRequest, dto);

      expect(result).toEqual(mockResult);
      expect(result.success).toBe(true);
      expect(result.discountAmount).toBe(50);
      expect(couponsService.useCoupon).toHaveBeenCalledWith(couponId, 'user-123', 'order-456');
    });

    it('should use percentage coupon', async () => {
      const couponId = 'coupon-789';
      const dto: any = {
        orderId: 'order-abc',
      };

      const mockResult = {
        success: true,
        couponId: 'coupon-789',
        orderId: 'order-abc',
        discountAmount: 20,
        originalAmount: 100,
        finalAmount: 80,
        message: '优惠券使用成功',
      };

      couponsService.useCoupon.mockResolvedValue(mockResult);

      const result = await controller.useCoupon(couponId, mockRequest, dto);

      expect(result).toEqual(mockResult);
      expect(result.originalAmount).toBe(100);
      expect(result.finalAmount).toBe(80);
    });

    it('should handle coupon usage with maximum discount', async () => {
      const couponId = 'coupon-def';
      const dto: any = {
        orderId: 'order-ghi',
      };

      const mockResult = {
        success: true,
        couponId: 'coupon-def',
        orderId: 'order-ghi',
        discountAmount: 100,
        originalAmount: 1000,
        finalAmount: 900,
        maxDiscountReached: true,
        message: '优惠券使用成功（已达最大优惠金额）',
      };

      couponsService.useCoupon.mockResolvedValue(mockResult);

      const result = await controller.useCoupon(couponId, mockRequest, dto);

      expect(result).toEqual(mockResult);
      expect(result.maxDiscountReached).toBe(true);
    });

    it('should handle coupon for different user', async () => {
      const request = {
        user: {
          id: 'user-999',
        },
      };

      const couponId = 'coupon-xyz';
      const dto: any = {
        orderId: 'order-xyz',
      };

      const mockResult = {
        success: true,
        couponId: 'coupon-xyz',
        orderId: 'order-xyz',
        discountAmount: 30,
      };

      couponsService.useCoupon.mockResolvedValue(mockResult);

      const result = await controller.useCoupon(couponId, request, dto);

      expect(result).toEqual(mockResult);
      expect(couponsService.useCoupon).toHaveBeenCalledWith(couponId, 'user-999', 'order-xyz');
    });

    it('should handle large discount amount', async () => {
      const couponId = 'coupon-vip';
      const dto: any = {
        orderId: 'order-vip',
      };

      const mockResult = {
        success: true,
        couponId: 'coupon-vip',
        orderId: 'order-vip',
        discountAmount: 500,
        originalAmount: 2000,
        finalAmount: 1500,
        message: 'VIP 优惠券使用成功',
      };

      couponsService.useCoupon.mockResolvedValue(mockResult);

      const result = await controller.useCoupon(couponId, mockRequest, dto);

      expect(result).toEqual(mockResult);
      expect(result.discountAmount).toBe(500);
      expect(result.finalAmount).toBe(1500);
    });
  });

  describe('getCouponStats', () => {
    it('should return user coupon statistics', async () => {
      const mockStats = {
        userId: 'user-123',
        totalCoupons: 10,
        availableCoupons: 5,
        usedCoupons: 3,
        expiredCoupons: 2,
        totalSavings: 250,
      };

      couponsService.getUserCouponStats.mockResolvedValue(mockStats);

      const result = await controller.getCouponStats(mockRequest);

      expect(result).toEqual(mockStats);
      expect(result.userId).toBe('user-123');
      expect(result.totalCoupons).toBe(10);
      expect(result.totalSavings).toBe(250);
      expect(couponsService.getUserCouponStats).toHaveBeenCalledWith('user-123');
    });

    it('should return stats with zero usage', async () => {
      const mockStats = {
        userId: 'user-456',
        totalCoupons: 5,
        availableCoupons: 5,
        usedCoupons: 0,
        expiredCoupons: 0,
        totalSavings: 0,
      };

      couponsService.getUserCouponStats.mockResolvedValue(mockStats);

      const result = await controller.getCouponStats({ user: { id: 'user-456' } });

      expect(result).toEqual(mockStats);
      expect(result.usedCoupons).toBe(0);
      expect(result.totalSavings).toBe(0);
    });

    it('should return stats with high usage', async () => {
      const mockStats = {
        userId: 'user-789',
        totalCoupons: 50,
        availableCoupons: 10,
        usedCoupons: 30,
        expiredCoupons: 10,
        totalSavings: 1500,
        averageSavings: 50,
      };

      couponsService.getUserCouponStats.mockResolvedValue(mockStats);

      const result = await controller.getCouponStats({ user: { id: 'user-789' } });

      expect(result).toEqual(mockStats);
      expect(result.usedCoupons).toBe(30);
      expect(result.totalSavings).toBe(1500);
      expect(result.averageSavings).toBe(50);
    });

    it('should return stats with breakdown by type', async () => {
      const mockStats = {
        userId: 'user-abc',
        totalCoupons: 15,
        availableCoupons: 8,
        usedCoupons: 5,
        expiredCoupons: 2,
        totalSavings: 500,
        byType: {
          percentage: 8,
          fixed: 7,
        },
        byStatus: {
          available: 8,
          used: 5,
          expired: 2,
        },
      };

      couponsService.getUserCouponStats.mockResolvedValue(mockStats);

      const result = await controller.getCouponStats({ user: { id: 'user-abc' } });

      expect(result).toEqual(mockStats);
      expect(result.byType).toBeDefined();
      expect(result.byStatus).toBeDefined();
      expect(result.byType.percentage).toBe(8);
    });

    it('should return stats for different user', async () => {
      const request = {
        user: {
          sub: 'user-def',
        },
      };

      const mockStats = {
        userId: 'user-def',
        totalCoupons: 3,
        availableCoupons: 2,
        usedCoupons: 1,
        expiredCoupons: 0,
        totalSavings: 75,
      };

      couponsService.getUserCouponStats.mockResolvedValue(mockStats);

      const result = await controller.getCouponStats(request);

      expect(result).toEqual(mockStats);
      expect(couponsService.getUserCouponStats).toHaveBeenCalledWith('user-def');
    });

    it('should return comprehensive stats with all metrics', async () => {
      const mockStats = {
        userId: 'user-ghi',
        totalCoupons: 25,
        availableCoupons: 12,
        usedCoupons: 10,
        expiredCoupons: 3,
        totalSavings: 1200,
        averageSavings: 120,
        maxSavings: 250,
        minSavings: 10,
        lastUsedAt: new Date('2025-01-05'),
        byMonth: {
          '2025-01': 5,
          '2024-12': 5,
        },
      };

      couponsService.getUserCouponStats.mockResolvedValue(mockStats);

      const result = await controller.getCouponStats({ user: { id: 'user-ghi' } });

      expect(result).toEqual(mockStats);
      expect(result.maxSavings).toBe(250);
      expect(result.minSavings).toBe(10);
      expect(result.byMonth).toBeDefined();
    });
  });
});
